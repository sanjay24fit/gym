import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

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

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan_days = 30,
      amount = 499,
    } = req.body || {}

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification details' })
    }

    // 1. Verify HMAC SHA-256 signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`
    const expectedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(text)
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment signature. Verification failed.',
      })
    }

    // 2. Database client with service role key (or fallback client)
    const dbClient = createClient(
      supabaseUrl,
      supabaseServiceKey || supabaseAnonKey,
      supabaseServiceKey
        ? { auth: { persistSession: false, autoRefreshToken: false } }
        : { global: { headers: { Authorization: `Bearer ${token}` } } }
    )

    // 3. Fetch gym's current valid_until
    const { data: gym, error: gymErr } = await dbClient
      .from('gyms')
      .select('valid_until, status, gym_name')
      .eq('id', user.id)
      .single()

    if (gymErr) {
      console.error('Failed to load gym:', gymErr)
    }

    // 4. Calculate new valid_until date
    const today = new Date().toISOString().slice(0, 10)
    let baseDate = new Date()

    if (gym?.valid_until && gym.valid_until >= today) {
      baseDate = new Date(gym.valid_until)
    }

    baseDate.setDate(baseDate.getDate() + Number(plan_days))
    const newValidUntil = baseDate.toISOString().slice(0, 10)

    // 5. Update gyms record
    const { error: updateErr } = await dbClient
      .from('gyms')
      .update({
        status: 'active',
        valid_until: newValidUntil,
        subscription_tier: 'monthly',
        subscription_status: 'active',
        last_payment_id: razorpay_payment_id,
        last_order_id: razorpay_order_id,
      })
      .eq('id', user.id)

    if (updateErr) {
      console.error('Failed to update gym validity:', updateErr)
      return res.status(500).json({
        error: 'Payment verified, but failed to update subscription date: ' + updateErr.message,
      })
    }

    // 6. Record transaction in gym_subscriptions ledger
    await dbClient.from('gym_subscriptions').insert({
      gym_id: user.id,
      amount: Number(amount),
      currency: 'INR',
      razorpay_order_id,
      razorpay_payment_id,
      status: 'success',
      plan_duration_days: Number(plan_days),
    })

    return res.status(200).json({
      success: true,
      message: `Payment verified! Subscription extended until ${newValidUntil}.`,
      valid_until: newValidUntil,
      payment_id: razorpay_payment_id,
    })
  } catch (err) {
    console.error('Payment verification error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
