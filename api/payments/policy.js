// Payment & activation policy SPECIFICATION for the serverless payment routes.
//
// Pure functions only (no I/O) so they can be unit-tested directly — see
// scripts/test-account-states.mjs.
//
// Division of labor (post-remediation):
//   - planForAmountPaise / computeExpectedSignature / orderBelongsToUser are
//     ENFORCED here, in the API, before any database write.
//   - nextSubscriptionStatus / computeNewValidUntil / isDuplicatePayment are
//     the specification that the database-side enforcement MIRRORS:
//     public.apply_subscription_payment (supabase/migrations/
//     20261026000000_payment_verification_atomicity.sql) implements the same
//     rules atomically with row locking. The JS versions below exist so the
//     policy is unit-testable; runtime enforcement is in SQL.
//   - The frontend merely mirrors the access outcome (src/lib/access.js).
import crypto from 'node:crypto'

// The only published plan: ₹499.00 (49900 paise) for 30 days.
// Amounts are keyed in paise, matching Razorpay's order.amount units.
export const PLAN_CATALOG_PAISE = {
  49900: { planDays: 30, planId: 'monthly' },
}

// Derive the purchased plan from the AUTHORITATIVE order amount fetched from
// Razorpay. Client-supplied plan_days/amount are never trusted (a verified
// defect: they previously came straight from the request body).
export function planForAmountPaise(amountPaise) {
  const entry = PLAN_CATALOG_PAISE[String(Math.round(Number(amountPaise)))]
  return entry ? { ...entry, amountPaise: Math.round(Number(amountPaise)) } : null
}

// Signature expected for a (order, payment) pair — only Razorpay holding the
// key secret can produce the real one.
export function computeExpectedSignature(orderId, paymentId, keySecret) {
  return crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex')
}

// The order must have been created for this authenticated user
// (create-order.js stamps notes.gym_id = user.id).
export function orderBelongsToUser(order, userId) {
  return Boolean(order) && order?.notes?.gym_id === userId && Boolean(userId)
}

// Replay/idempotency guard (specification): the same payment id must never
// extend the subscription twice. ENFORCED atomically in SQL by
// apply_subscription_payment (row lock + last_payment_id check + unique
// index on gym_subscriptions.razorpay_payment_id) — the JS form is kept for
// unit tests and as the readable specification of the rule.
export function isDuplicatePayment(gym, paymentId) {
  return Boolean(paymentId) && gym?.last_payment_id === paymentId
}

// Activation decision (D1): a verified payment may activate pending/expired/
// trial accounts, but it must NEVER un-block an account — 'blocked' is an
// administrator decision and the pay card is only hidden client-side today.
// Mirrored in apply_subscription_payment:
//   status = case when status = 'blocked' then 'blocked' else 'active' end
export function nextSubscriptionStatus(currentStatus) {
  return currentStatus === 'blocked' ? 'blocked' : 'active'
}

// Extension math (specification, preserved byte-for-byte from the original
// verify-payment.js): extend from the current valid_until while it is still
// in the future, otherwise from today. (Date-only ISO strings compare
// correctly lexicographically.) Mirrored in apply_subscription_payment using
// Postgres date arithmetic on current_date (UTC, same time basis).
export function computeNewValidUntil(validUntil, todayStr, planDays) {
  let baseDate = new Date()
  if (validUntil && validUntil >= todayStr) {
    baseDate = new Date(validUntil)
  }
  baseDate.setDate(baseDate.getDate() + Number(planDays))
  return baseDate.toISOString().slice(0, 10)
}
