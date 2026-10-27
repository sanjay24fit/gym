import { createClient } from '@supabase/supabase-js'
import {
  planForAmountPaise,
  computeExpectedSignature,
  orderBelongsToUser,
} from './policy.js'

// Applies a VERIFIED Razorpay payment atomically in the database.
//
// Steps 1-4 (auth token, HMAC signature, Razorpay order fetch, order
// ownership, plan catalog) are unchanged from the audited implementation.
// The previous read-then-write apply (SELECT gym → compare last_payment_id →
// UPDATE gyms → INSERT ledger) was vulnerable to concurrent requests: two
// simultaneous verifications of the same payment could both pass the check
// and both extend the subscription. The apply step now happens inside
// public.apply_subscription_payment (migration 20261026000000) — a single
// transaction with `SELECT ... FOR UPDATE` row locking plus a unique index on
// gym_subscriptions.razorpay_payment_id:
//   - same payment under concurrency  => exactly one extension, one ledger row
//   - sequential retry                => short-circuit, no second extension
//   - ledger insert failure           => whole transaction rolls back
//   - blocked account                 => stays blocked (never unblocked by payment)
//   - amount/days                     => derived server-side from the verified
//                                        Razorpay order amount via the catalog
//                                        in policy.js; never from the request body.
//
// ERROR MAPPING IS CONSTRAINT-PRECISE (see migration exception block):
//   - already_processed (result)     => 200 idempotent success. The function
//                                       itself decides this, including the
//                                       case where the payment id is already
//                                       in the ledger but is no longer the
//                                       gym's last_payment_id (older payment
//                                       replayed after a newer one).
//   - PGRST202 (function missing)    => 503 fail-closed: migration required.
//   - any other rpcErr, INCLUDING
//     23505 unique_violation         => 500 fail-closed, no changes made. A
//                                       unique violation that reaches this
//                                       handler is by definition not the
//                                       payment-identity index (the function
//                                       absorbs that one), so it must never be
//                                       misreported as a verified payment.
// EXECUTE on the function is revoked from PUBLIC/anon/authenticated, so it can
// only be called from this server (service role key required).

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET

    if (!razorpayKeySecret) {
      return res.status(500).json({ error: 'RAZORPAY_KEY_SECRET is not configured on server' })
    }

    if (!token) {
      return res.status(401).json({ error: 'Missing authorization token' })
    }

    // Authenticate user
    const authClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: authError } = await authClient.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized user' })
    }

    // NOTE: plan_days and amount are intentionally NOT read from the request
    // body — they are derived server-side from the Razorpay order below.
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body || {}

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification details' })
    }

    // 1. Verify HMAC SHA-256 signature (forged payment verification fails here)
    const expectedSignature = computeExpectedSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpayKeySecret
    )

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment signature. Verification failed.',
      })
    }

    if (!razorpayKeyId) {
      return res.status(500).json({ error: 'RAZORPAY_KEY_ID is not configured on server' })
    }

    // 2. Fetch the order from Razorpay — the authoritative source for who paid
    // and how much. (Client-supplied plan_days/amount are never trusted.)
    const orderAuth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64')
    const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
      headers: { Authorization: `Basic ${orderAuth}` },
    })

    if (!orderRes.ok) {
      return res.status(502).json({
        success: false,
        error: 'Could not validate the payment order with Razorpay. Please retry verification.',
      })
    }

    const order = await orderRes.json()

    // 3. The order must belong to the authenticated user (create-order stamps notes.gym_id)
    if (!orderBelongsToUser(order, user.id)) {
      return res.status(403).json({
        success: false,
        error: 'Payment order does not belong to this account.',
      })
    }

    // 4. Derive the plan from the actual order amount (catalog: ₹499 → 30 days)
    const plan = planForAmountPaise(order.amount)
    if (!plan) {
      return res.status(400).json({
        success: false,
        error: `Unsupported payment amount. Only the ₹499 / 30-day plan is available (got ${order.amount} paise).`,
      })
    }

    // 5. Service-role client (required: apply_subscription_payment is
    // EXECUTE-revoked from anon/authenticated so clients cannot self-extend).
    if (!supabaseServiceKey) {
      return res.status(500).json({
        success: false,
        error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on server — payment verification cannot proceed.',
      })
    }
    const dbClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // 6. Atomic apply: row-locked, single transaction (see header comment).
    const { data: result, error: rpcErr } = await dbClient.rpc('apply_subscription_payment', {
      p_gym_id: user.id,
      p_payment_id: razorpay_payment_id,
      p_order_id: razorpay_order_id,
      p_amount_paise: plan.amountPaise,
      p_plan_days: plan.planDays,
      p_plan_id: plan.planId,
    })

    if (rpcErr) {
      // Migration not applied yet — fail closed with an explicit signal.
      if (rpcErr.code === 'PGRST202') {
        console.error('apply_subscription_payment missing — apply migration 20261026000000')
        return res.status(503).json({
          success: false,
          error: 'Payment verification is temporarily unavailable (database migration required).',
        })
      }

      // SECURITY: a 23505 (unique_violation) surfacing HERE is by definition
      // NOT the intended payment-identity constraint — the function catches
      // gym_subscriptions_payment_id_key itself and returns
      // already_processed as a normal result (see the migration's exception
      // block). Any unique violation that escapes to PostgREST is therefore
      // some other/unexpected constraint, and the whole transaction has been
      // rolled back. It must never be reported as a successful verification,
      // so it falls through to the fail-closed 500 below.
      console.error('Payment apply failed:', rpcErr)
      return res.status(500).json({
        success: false,
        error: 'Payment verified, but could not apply the subscription. No changes were made — please retry verification.',
      })
    }

    if (result?.error === 'no_gym_account') {
      return res.status(404).json({ error: 'No gym account found for this user.' })
    }
    if (result?.error) {
      console.error('Payment apply rejected:', result)
      return res.status(500).json({
        success: false,
        error: 'Payment verified, but the subscription update was rejected. No changes were made.',
      })
    }

    // 7. Response (same contract as before: client checks ok && success)
    if (!result) {
      console.error('apply_subscription_payment returned no result and no error')
      return res.status(500).json({
        success: false,
        error: 'Payment verified, but no result was returned. No changes were made — please retry verification.',
      })
    }

    if (result.already_processed) {
      return res.status(200).json({
        success: true,
        alreadyProcessed: true,
        message: `Payment already processed. Subscription valid until ${result.valid_until}.`,
        valid_until: result.valid_until,
        payment_id: razorpay_payment_id,
      })
    }

    return res.status(200).json({
      success: true,
      message: `Payment verified! Subscription extended until ${result.valid_until}.`,
      valid_until: result.valid_until,
      payment_id: razorpay_payment_id,
    })
  } catch (err) {
    console.error('Payment verification error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
