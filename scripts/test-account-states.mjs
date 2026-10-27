// Focused tests for the D1 activation & payment policy.
//
// Three layers, each labeled by what it does and does NOT prove:
//   1. Pure policy unit tests (frontend predicates + API policy module).
//   2. MODEL tests: an in-memory reimplementation of the SQL apply algorithm
//      (row lock, ledger-first order, rollback). Proves the LOGIC of the
//      design and demonstrates the old race — NOT Postgres transaction
//      behavior. Real DB race/rollback coverage lives in the service-role
//      section of scripts/rls-test.mjs against a live local Supabase.
//   3. STATIC contract checks: read the actual migration/API source files and
//      assert the safety primitives (FOR UPDATE, unique index, EXECUTE
//      revocation, blocked-never-unblocked, no client-trusted plan_days) are
//      present. Proves the design artifacts exist — NOT runtime behavior.
//
// NOT covered here (requires live environment — stated, not claimed):
//   - npm run test:rls (Docker/local Supabase), incl. the real race test
//   - Real Razorpay signature/order API calls and HTTP handler integration
//   - Live browser flows
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { canUseGym, isBlockedGym, isExpiredGym, isTrialGym } from '../src/lib/access.js'
import {
  planForAmountPaise,
  computeExpectedSignature,
  orderBelongsToUser,
  isDuplicatePayment,
  nextSubscriptionStatus,
  computeNewValidUntil,
} from '../api/payments/policy.js'

let passed = 0
const failures = []
const pendingAsync = []
// Works for both sync and async test bodies: async bodies are queued and
// awaited in runAsyncTests() before results are printed.
function check(name, fn) {
  try {
    const out = fn()
    if (out && typeof out.then === 'function') {
      pendingAsync.push(
        out.then(() => { passed += 1 }).catch((err) => { failures.push(`${name}: ${err.message}`) })
      )
    } else {
      passed += 1
    }
  } catch (err) {
    failures.push(`${name}: ${err.message}`)
  }
}
async function runAsyncTests() {
  await Promise.all(pendingAsync)
}

const TODAY = '2026-10-26' // fixed reference date for state predicates

const states = {
  pending: { status: 'pending', valid_until: null, subscription_status: 'trial' },
  trialActive: { status: 'active', valid_until: '2026-11-15', subscription_status: 'trial' },
  trialExpired: { status: 'active', valid_until: '2026-01-01', subscription_status: 'trial' },
  paidActive: { status: 'active', valid_until: '2026-11-30', subscription_status: 'active' },
  paidExpired: { status: 'active', valid_until: '2026-09-01', subscription_status: 'active' },
  blocked: { status: 'blocked', valid_until: '2026-11-30', subscription_status: 'active' },
  legacyNoFields: { status: 'active', valid_until: null }, // pre-subscription-migration row
}

// --- Frontend access predicates (mirror SQL is_usable) ---
check('pending: no access, not expired-by-date, not blocked', () => {
  assert.equal(canUseGym(states.pending, TODAY), false)
  assert.equal(isExpiredGym(states.pending, TODAY), false)
  assert.equal(isBlockedGym(states.pending), false)
})

check('active trial: access granted, recognized as trial, not expired', () => {
  assert.equal(canUseGym(states.trialActive, TODAY), true)
  assert.equal(isTrialGym(states.trialActive), true)
  assert.equal(isExpiredGym(states.trialActive, TODAY), false)
})

check('expired trial: no access, date-expired AND still trial (trial copy reachable)', () => {
  assert.equal(canUseGym(states.trialExpired, TODAY), false)
  assert.equal(isExpiredGym(states.trialExpired, TODAY), true)
  assert.equal(isTrialGym(states.trialExpired), true)
})

check('paid active: access granted, NOT labeled trial', () => {
  assert.equal(canUseGym(states.paidActive, TODAY), true)
  assert.equal(isTrialGym(states.paidActive), false)
  assert.equal(isExpiredGym(states.paidActive, TODAY), false)
})

check('expired paid: no access, date-expired, NOT labeled trial', () => {
  assert.equal(canUseGym(states.paidExpired, TODAY), false)
  assert.equal(isExpiredGym(states.paidExpired, TODAY), true)
  assert.equal(isTrialGym(states.paidExpired), false)
})

check('blocked: no access; status precedence over dates (future date irrelevant)', () => {
  assert.equal(canUseGym(states.blocked, TODAY), false)
  assert.equal(isBlockedGym(states.blocked), true)
  assert.equal(isExpiredGym(states.blocked, TODAY), false)
})

check('legacy row without subscription_status/trial_ends_at: no crash, treated as paid', () => {
  assert.equal(isTrialGym(states.legacyNoFields), false)
  assert.equal(canUseGym(states.legacyNoFields, TODAY), true) // null valid_until = no limit
  assert.equal(isExpiredGym(states.legacyNoFields, TODAY), false)
})

check('null/undefined gym: all predicates false, no crash', () => {
  assert.equal(canUseGym(null, TODAY), false)
  assert.equal(canUseGym(undefined, TODAY), false)
  assert.equal(isBlockedGym(null), false)
  assert.equal(isExpiredGym(undefined, TODAY), false)
  assert.equal(isTrialGym(null), false)
})

// --- Server-side activation decisions ---
check('payment activates pending/active, but NEVER un-blocks (blocked is admin-only)', () => {
  assert.equal(nextSubscriptionStatus('pending'), 'active')
  assert.equal(nextSubscriptionStatus('active'), 'active')
  assert.equal(nextSubscriptionStatus('blocked'), 'blocked') // security invariant
})

check('full state → post-payment transition matrix', () => {
  const matrix = [
    ['pending', 'active'],
    ['active', 'active'],
    ['blocked', 'blocked'],
  ]
  for (const [from, expected] of matrix) {
    assert.equal(nextSubscriptionStatus(from), expected, `from ${from}`)
  }
})

// --- Plan amount catalog (client plan_days/amount are untrusted) ---
check('plan derived from authoritative order amount: 49900 paise → 30 days', () => {
  assert.deepEqual(planForAmountPaise(49900), { planDays: 30, planId: 'monthly', amountPaise: 49900 })
  assert.deepEqual(planForAmountPaise('49900'), { planDays: 30, planId: 'monthly', amountPaise: 49900 })
})

check('forged/unsupported amounts rejected (no plan derived)', () => {
  assert.equal(planForAmountPaise(100), null) // ₹1 order cannot buy 30 days
  assert.equal(planForAmountPaise(499), null) // rupees≠paise confusion
  assert.equal(planForAmountPaise(999999), null)
  assert.equal(planForAmountPaise('abc'), null)
  assert.equal(planForAmountPaise(null), null)
})

// --- Signature forgery ---
check('forged signature does not match expected HMAC', () => {
  const secret = 'rzp_test_secret_A'
  const expected = computeExpectedSignature('order_abc', 'pay_xyz', secret)
  const forged = computeExpectedSignature('order_abc', 'pay_xyz', 'wrong_secret')
  assert.notEqual(forged, expected)
  assert.notEqual('deadbeef', expected)
  // Deterministic for the same inputs (retry yields same expected value)
  assert.equal(computeExpectedSignature('order_abc', 'pay_xyz', secret), expected)
})

// --- Order ownership ---
check('order must carry notes.gym_id of the authenticated user', () => {
  assert.equal(orderBelongsToUser({ notes: { gym_id: 'user-1' } }, 'user-1'), true)
  assert.equal(orderBelongsToUser({ notes: { gym_id: 'user-2' } }, 'user-1'), false)
  assert.equal(orderBelongsToUser({ notes: {} }, 'user-1'), false)
  assert.equal(orderBelongsToUser({}, 'user-1'), false)
  assert.equal(orderBelongsToUser(null, 'user-1'), false)
  assert.equal(orderBelongsToUser({ notes: { gym_id: 'user-1' } }, null), false)
})

// --- Payment replay / idempotency ---
check('replayed verification of the same payment is detected (no double extension)', () => {
  const gym = { last_payment_id: 'pay_1', valid_until: '2026-11-30' }
  assert.equal(isDuplicatePayment(gym, 'pay_1'), true) // handler short-circuits here
  assert.equal(isDuplicatePayment(gym, 'pay_2'), false) // genuine second payment
  assert.equal(isDuplicatePayment({ valid_until: '2026-11-30' }, 'pay_1'), false)
  assert.equal(isDuplicatePayment(gym, undefined), false)
  assert.equal(isDuplicatePayment(undefined, 'pay_1'), false)
})

// --- Extension math (byte-for-byte lock on original verify-payment behavior) ---
check('extension starts from current valid_until while still in the future', () => {
  assert.equal(computeNewValidUntil('2026-11-30', TODAY, 30), '2026-12-30')
})

check('extension starts from today when valid_until is past or missing', () => {
  const expected = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().slice(0, 10)
  })()
  assert.equal(computeNewValidUntil('2026-01-01', TODAY, 30), expected)
  assert.equal(computeNewValidUntil(null, TODAY, 30), expected)
})

// ============================================================
// ATOMIC-APPLY MODEL TESTS
//
// The concurrency/rollback behavior below is exercised against an in-memory
// MODEL that mirrors apply_subscription_payment's control flow (migration
// 20261026000000): per-gym lock (models SELECT ... FOR UPDATE), duplicate
// check under the lock, ledger insert before gyms update, all-or-nothing
// transaction. This proves the LOGIC of the design and demonstrates why the
// old read-then-write was racy — it is NOT proof of Postgres transaction
// behavior. Real database race/rollback behavior is covered by the
// service-role section of scripts/rls-test.mjs against a live local Supabase.
// ============================================================

// Transactional in-memory store with a per-gym mutex.
// Models the real statement sequence of apply_subscription_payment:
// ledger INSERT first, then gyms UPDATE, with undo (rollback) if anything
// fails after the first write. `opts.noLock` reproduces the OLD handler's
// interleaving to demonstrate why its check was racy.
function makeDb(initialGyms) {
  const db = { gyms: structuredClone(initialGyms), ledger: [] }
  const locks = new Map()
  async function withGymLock(gymId, fn) {
    const prev = locks.get(gymId) || Promise.resolve()
    let release
    const next = new Promise((res) => { release = res })
    locks.set(gymId, prev.then(() => next))
    await prev
    try {
      return await fn()
    } finally {
      release()
    }
  }
  const yieldPoint = () => new Promise((res) => setImmediate(res))
  async function apply(gymId, paymentId, orderId, amountPaise, planDays, opts = {}) {
    const run = async () => {
      // 1. Read the gym row (the old handler held this snapshot in a local
      //    across the async gap — that staleness is the race being modeled).
      const readGym = structuredClone(db.gyms[gymId])
      if (!readGym) return { error: 'no_gym_account' }
      // 2. Async gap: HTTP round-trips / await scheduling (the race window).
      await yieldPoint()
      // 3. Duplicate check against the snapshot taken in step 1.
      if (readGym.last_payment_id === paymentId) {
        return { already_processed: true, valid_until: db.gyms[gymId].valid_until }
      }
      // 4. Ledger insert FIRST (unique index enforced — unless opts.legacyNoUniqueIndex
      //    models the pre-migration database where duplicates were possible).
      //    Mirrors the migration's exception block: a violation of the
      //    PAYMENT-ID index is caught and reported already_processed; any
      //    other violation re-raises (fail-closed).
      if (opts.failLedgerInsert) {
        throw new Error('simulated ledger insert failure')
      }
      if (!opts.legacyNoUniqueIndex && db.ledger.some((row) => row.paymentId === paymentId)) {
        // Intended payment-id duplicate: caught in SQL => already_processed.
        // (No write occurred; last_payment_id has since moved on to a newer
        // payment, so this older payment replay must not extend again.)
        return { already_processed: true, valid_until: db.gyms[gymId].valid_until }
      }
      if (opts.failOtherConstraint) {
        // Unintended constraint violation (not the payment-id index): re-raised.
        const err = new Error('duplicate key value violates unique constraint')
        err.code = '23505'
        err.constraint = 'some_other_constraint'
        throw err
      }
      const ledgerRow = { gymId, paymentId, orderId, amountPaise, planDays }
      db.ledger.push(ledgerRow)
      try {
        // 5. Gyms update, same transaction.
        if (opts.failGymUpdate) throw new Error('simulated gyms update failure')
        const gym = db.gyms[gymId]
        gym.status = nextSubscriptionStatus(gym.status)
        gym.valid_until = computeNewValidUntil(readGym.valid_until, TODAY, planDays)
        gym.last_payment_id = paymentId
        return { already_processed: false, valid_until: gym.valid_until, gym_status: gym.status }
      } catch (err) {
        // Rollback: undo the ledger insert (nothing partial survives).
        db.ledger = db.ledger.filter((row) => row !== ledgerRow)
        throw err
      }
    }
    return opts.noLock ? run() : withGymLock(gymId, run)
  }
  return { db, apply }
}

const MODEL_GYMS = {
  g1: { status: 'active', valid_until: '2026-11-15', last_payment_id: null }, // active trial
  g2: { status: 'blocked', valid_until: '2026-11-15', last_payment_id: null },
}

check('MODEL: old unlocked read-then-write double-records the same payment (the bug)', async () => {
  const { db, apply } = makeDb(MODEL_GYMS)
  // Old handler: no row lock, no unique index (pre-migration database).
  // Two interleaved applies both read last_payment_id=null, both pass the
  // duplicate check, both report success, and the ledger double-counts revenue.
  const results = await Promise.all([
    apply('g1', 'pay_r', 'order_r', 49900, 30, { noLock: true, legacyNoUniqueIndex: true }),
    apply('g1', 'pay_r', 'order_r', 49900, 30, { noLock: true, legacyNoUniqueIndex: true }),
  ])
  assert.equal(results.filter((r) => r.already_processed === false).length, 2) // both told "success"
  assert.equal(db.ledger.filter((row) => row.paymentId === 'pay_r').length, 2) // duplicate ledger rows
})

check('MODEL: two simultaneous same-payment applies (row lock) => one apply, one already_processed, one ledger row', async () => {
  const { db, apply } = makeDb(MODEL_GYMS)
  const results = await Promise.all([
    apply('g1', 'pay_r', 'order_r', 49900, 30),
    apply('g1', 'pay_r', 'order_r', 49900, 30),
  ])
  assert.equal(results.filter((r) => r.already_processed === false).length, 1)
  assert.equal(results.filter((r) => r.already_processed === true).length, 1)
  assert.equal(db.ledger.filter((row) => row.paymentId === 'pay_r').length, 1)
  assert.equal(db.gyms.g1.valid_until, '2026-12-15') // extended exactly once
  assert.equal(db.gyms.g1.last_payment_id, 'pay_r')
})

check('MODEL: sequential retry of an already-processed payment short-circuits', async () => {
  const { db, apply } = makeDb(MODEL_GYMS)
  const first = await apply('g1', 'pay_1', 'order_1', 49900, 30)
  const retry = await apply('g1', 'pay_1', 'order_1', 49900, 30)
  assert.equal(first.already_processed, false)
  assert.equal(retry.already_processed, true)
  assert.equal(db.gyms.g1.valid_until, first.valid_until) // unchanged by retry
  assert.equal(db.ledger.length, 1)
})

check('MODEL: a different valid payment for the same gym extends again (not blocked by idempotency)', async () => {
  const { db, apply } = makeDb(MODEL_GYMS)
  const p1 = await apply('g1', 'pay_1', 'order_1', 49900, 30)
  const p2 = await apply('g1', 'pay_2', 'order_2', 49900, 30)
  assert.equal(p1.already_processed, false)
  assert.equal(p2.already_processed, false)
  assert.equal(p1.valid_until, '2026-12-15') // 2026-11-15 + 30
  assert.equal(p2.valid_until, '2027-01-14') // 2026-12-15 + 30 (chained extension)
  assert.equal(db.ledger.length, 2)
})

check('MODEL: ledger insertion failure rolls back the whole transaction (no extension, no partial write)', async () => {
  const { db, apply } = makeDb(MODEL_GYMS)
  await assert.rejects(
    () => apply('g1', 'pay_1', 'order_1', 49900, 30, { failLedgerInsert: true }),
    /simulated ledger insert failure/
  )
  assert.equal(db.gyms.g1.valid_until, '2026-11-15') // NOT extended
  assert.equal(db.gyms.g1.last_payment_id, null) // NOT stamped
  assert.equal(db.ledger.length, 0) // NOT inserted

  // And the reverse: a gyms-update failure undoes the already-inserted ledger row.
  await assert.rejects(
    () => apply('g1', 'pay_2', 'order_2', 49900, 30, { failGymUpdate: true }),
    /simulated gyms update failure/
  )
  assert.equal(db.ledger.length, 0) // ledger row rolled back
  assert.equal(db.gyms.g1.last_payment_id, null)
})

check('MODEL: replayed OLDER payment is caught as already_processed (no re-extend, no duplicate)', async () => {
  const { db, apply } = makeDb(MODEL_GYMS)
  await apply('g1', 'pay_1', 'order_1', 49900, 30)
  await apply('g1', 'pay_2', 'order_2', 49900, 30) // pay_1 now older than last_payment_id
  const validBefore = db.gyms.g1.valid_until
  // Replay pay_1: passes the last_payment_id check but the ledger insert hits
  // the payment-id index. The migration's exception block catches it and
  // reports already_processed — the subscription is NOT extended again.
  const res = await apply('g1', 'pay_1', 'order_1_replay', 49900, 30)
  assert.equal(res.already_processed, true)
  assert.equal(db.gyms.g1.valid_until, validBefore) // NOT re-extended
  assert.equal(db.ledger.length, 2) // no duplicate ledger row
})

check('MODEL: an UNINTENDED constraint violation re-raises (fail-closed, no success misreport)', async () => {
  const { db, apply } = makeDb(MODEL_GYMS)
  const validBefore = db.gyms.g1.valid_until
  // A violation that is NOT the payment-id index must abort the whole apply —
  // it must never be reported as an already-processed payment.
  await assert.rejects(
    () => apply('g1', 'pay_other', 'order_other', 49900, 30, { failOtherConstraint: true }),
    (err) => err.code === '23505' && err.constraint === 'some_other_constraint'
  )
  assert.equal(db.gyms.g1.valid_until, validBefore) // NOT extended
  assert.equal(db.gyms.g1.last_payment_id, null) // NOT stamped
  assert.equal(db.ledger.length, 0) // nothing written
})

check('MODEL: blocked account payment is recorded but NEVER un-blocks the account', async () => {
  const { db, apply } = makeDb(MODEL_GYMS)
  const res = await apply('g2', 'pay_b', 'order_b', 49900, 30)
  assert.equal(res.already_processed, false)
  assert.equal(res.gym_status, 'blocked')
  assert.equal(db.gyms.g2.status, 'blocked')
  assert.equal(db.ledger.length, 1)
})

check('MODEL: apply for an unknown gym returns no_gym_account (tenant boundary)', async () => {
  const { apply } = makeDb(MODEL_GYMS)
  const res = await apply('g_other', 'pay_x', 'order_x', 49900, 30)
  assert.equal(res.error, 'no_gym_account')
})

// ============================================================
// STATIC MIGRATION / SOURCE CONTRACT CHECKS
// These read the actual files and assert the safety primitives exist. They
// prove the DESIGN ARTIFACTS are in place — not runtime database behavior.
// ============================================================
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const migrationAtomic = readFileSync(
  join(root, 'supabase', 'migrations', '20261026000000_payment_verification_atomicity.sql'),
  'utf8'
)
const migrationSubs = readFileSync(
  join(root, 'supabase', 'migrations', '20261023000000_add_subscriptions_and_razorpay.sql'),
  'utf8'
)
const verifyPaymentSrc = readFileSync(join(root, 'api', 'payments', 'verify-payment.js'), 'utf8')

check('MIGRATION: atomic apply uses row locking (SELECT ... FOR UPDATE)', () => {
  assert.match(migrationAtomic, /select \* into v_gym from public\.gyms where id = p_gym_id for update/i)
})

check('MIGRATION: durable payment-identity uniqueness (unique index on razorpay_payment_id)', () => {
  assert.match(migrationAtomic, /create unique index if not exists gym_subscriptions_payment_id_key/i)
  assert.match(migrationAtomic, /on public\.gym_subscriptions \(razorpay_payment_id\)/i)
})

check('MIGRATION: RPC is EXECUTE-revoked from clients (public/anon/authenticated), granted only to service_role', () => {
  assert.match(migrationAtomic, /revoke all on function public\.apply_subscription_payment[\s\S]*?from public, anon, authenticated/i)
  assert.match(migrationAtomic, /grant execute on function public\.apply_subscription_payment[\s\S]*?to service_role/i)
})

check('MIGRATION: blocked accounts can never be unblocked by payment (SQL preserves blocked status)', () => {
  assert.match(migrationAtomic, /case when status = 'blocked' then 'blocked' else 'active' end/i)
})

check('MIGRATION: single SECURITY DEFINER transaction performs ledger insert AND gyms update', () => {
  assert.match(migrationAtomic, /security definer/i)
  assert.match(migrationAtomic, /insert into public\.gyms_subscriptions|insert into public\.gym_subscriptions/i)
  assert.match(migrationAtomic, /update public\.gyms set/i)
})

check('SOURCE: verify-payment.js calls the atomic RPC (no client-side read-then-write apply remains)', () => {
  assert.match(verifyPaymentSrc, /rpc\('apply_subscription_payment'/)
  assert.doesNotMatch(verifyPaymentSrc, /\.from\('gyms'\)\s*\n?\s*\.update\(/, 'no direct gyms update outside the RPC')
  assert.doesNotMatch(verifyPaymentSrc, /\.from\('gym_subscriptions'\)\s*\n?\s*\.insert\(/, 'no direct ledger insert outside the RPC')
})

check('SOURCE: verify-payment.js never reads plan_days/amount from the request body', () => {
  // Match only the immediate req.body destructure (no crossing statements).
  const destructure = verifyPaymentSrc.match(/const \{([^{}]*)\}\s*=\s*req\.body/)
  assert.ok(destructure, 'req.body destructuring present')
  assert.doesNotMatch(destructure[1], /plan_days|amount/)
})

check('MIGRATION: SECURITY DEFINER pins an EMPTY search_path and schema-qualifies objects', () => {
  // Hardened form: search_path = '' (no implicit schema search => temp-schema
  // shadowing impossible); every referenced table is schema-qualified.
  assert.match(migrationAtomic, /set search_path = ''/i)
  assert.doesNotMatch(
    migrationAtomic,
    /set search_path = public/i,
    'search_path must NOT be pinned to public (that is the weaker form)'
  )
  assert.match(migrationAtomic, /from public\.gyms where id = p_gym_id for update/i)
  assert.match(migrationAtomic, /insert into public\.gym_subscriptions/i)
  assert.match(migrationAtomic, /update public\.gyms set/i)
})

check('MIGRATION: duplicate-payment handling is CONSTRAINT-PRECISE (only the payment-id index is idempotent)', () => {
  // The unique_violation handler must read the stacked diagnostic and treat
  // ONLY gym_subscriptions_payment_id_key as already_processed; any other
  // constraint must re-raise (raise;) so it is never misreported as success.
  assert.match(migrationAtomic, /when unique_violation/i)
  assert.match(migrationAtomic, /get stacked diagnostics v_constraint = constraint_name/i)
  assert.match(migrationAtomic, /if v_constraint = 'gym_subscriptions_payment_id_key'/i)
  assert.match(migrationAtomic, /raise;/i, 'non-payment-id unique violations re-raise')
})

check('MIGRATION: SQL enforces a strict plan allowlist (defense in depth, independent of the JS catalog)', () => {
  assert.match(migrationAtomic, /p_amount_paise <> 49900 or p_plan_days <> 30 or p_plan_id <> 'monthly'/i)
  assert.match(migrationAtomic, /unsupported_plan/i)
})

check('MIGRATION: wrapped in explicit begin/commit for runner-independent atomicity', () => {
  assert.match(migrationAtomic, /^\s*begin\s*;\s*$/im)
  assert.match(migrationAtomic, /^\s*commit\s*;\s*$/im)
})

check('SOURCE: verify-payment.js does NOT map a bare 23505 to idempotent success', () => {
  // With the intended payment-id duplicate absorbed inside SQL, any 23505
  // reaching the handler is an unintended constraint and must fail closed.
  assert.doesNotMatch(
    verifyPaymentSrc,
    /code\s*===\s*'23505'/,
    'handler must not branch on bare 23505 as success'
  )
  assert.doesNotMatch(
    verifyPaymentSrc,
    /alreadyProcessed.*true[\s\S]{0,400}code\s*===\s*'23505'/,
    'no success-on-23505 path'
  )
})

check('SOURCE: verify-payment.js fails closed on PGRST202 (missing RPC) with 503', () => {
  assert.match(verifyPaymentSrc, /PGRST202/)
  assert.match(verifyPaymentSrc, /status\(503\)/)
})

check('MIGRATION: rollback/uniqueness documented; index + function are additive', () => {
  assert.match(migrationAtomic, /create unique index if not exists gym_subscriptions_payment_id_key/i)
  assert.match(migrationAtomic, /create or replace function public\.apply_subscription_payment/i)
  assert.match(migrationAtomic, /drop function if exists public\.apply_subscription_payment/i)
  assert.match(migrationAtomic, /drop index if exists public\.gym_subscriptions_payment_id_key/i)
})

check('SIGNUP: migration establishes active + 21-day trial + subscription_status trial (rls-test.mjs aligned)', () => {
  // The trigger in 20261023000000 must set the documented values — this is the
  // source of truth the updated RLS signup assertion now checks.
  assert.match(migrationSubs, /'active',\s*-- automatically active for 21-day trial/i)
  assert.match(migrationSubs, /current_date \+ interval '21 days'/i)
  assert.match(migrationSubs, /'trial',\s*\n\s*'trial'/i)
  const rlsTest = readFileSync(join(root, 'scripts', 'rls-test.mjs'), 'utf8')
  assert.match(rlsTest, /subscription_status === 'trial'/, 'RLS test asserts trial signup status')
})

check('SIGNUP: a fresh-signup gym shape passes frontend access predicates as trial-active', () => {
  // Mirrors what handle_new_user() writes: status active, valid_until +21d, trial.
  const fresh = { status: 'active', valid_until: '2026-11-16', subscription_status: 'trial' }
  assert.equal(canUseGym(fresh, TODAY), true)
  assert.equal(isTrialGym(fresh), true)
  assert.equal(isBlockedGym(fresh), false)
})

// --- Result ---
await runAsyncTests()
console.log(`\n--- ACTIVATION & PAYMENT POLICY TESTS ---`)
console.log(`✓ ${passed} passed`)
if (failures.length > 0) {
  console.error(`✗ ${failures.length} failed:`)
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log('ALL POLICY TESTS PASSED!')
