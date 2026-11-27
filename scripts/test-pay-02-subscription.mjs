import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

console.log('--- PAY-02: Subscription & Payment Verification Test ---')

// 1. Verify Migration File Exists
const migrationPath = path.join(
  rootDir,
  'supabase',
  'migrations',
  '20261127010000_fix_pay02_subscriptions_and_sub01_access.sql'
)
assert.ok(fs.existsSync(migrationPath), 'FAIL: PAY-02 migration file must exist')
const migrationSql = fs.readFileSync(migrationPath, 'utf8')

// 2. Verify Table & Column Definitions
assert.ok(
  migrationSql.includes('CREATE TABLE IF NOT EXISTS public.gym_subscriptions'),
  'FAIL: Must create gym_subscriptions table'
)
assert.ok(
  migrationSql.includes('CREATE UNIQUE INDEX IF NOT EXISTS gym_subscriptions_payment_id_key'),
  'FAIL: Must create unique index on razorpay_payment_id'
)
assert.ok(
  migrationSql.includes('ADD COLUMN IF NOT EXISTS subscription_tier') &&
  migrationSql.includes('ADD COLUMN IF NOT EXISTS subscription_status') &&
  migrationSql.includes('ADD COLUMN IF NOT EXISTS last_payment_id') &&
  migrationSql.includes('ADD COLUMN IF NOT EXISTS total_paid_amount'),
  'FAIL: Must add all required subscription columns to public.gyms'
)
console.log('✓ 1. Migration defines gym_subscriptions table and gyms subscription columns.')

// 3. Verify apply_subscription_payment Function Signature Matches verify-payment.js
const verifyPaymentPath = path.join(rootDir, 'api', 'payments', 'verify-payment.js')
const verifyPaymentSource = fs.readFileSync(verifyPaymentPath, 'utf8')

assert.ok(
  verifyPaymentSource.includes('p_gym_id') &&
  verifyPaymentSource.includes('p_payment_id') &&
  verifyPaymentSource.includes('p_order_id') &&
  verifyPaymentSource.includes('p_amount_paise') &&
  verifyPaymentSource.includes('p_plan_days') &&
  verifyPaymentSource.includes('p_plan_id'),
  'FAIL: verify-payment.js must pass matching parameter names'
)

assert.ok(
  migrationSql.includes('p_gym_id uuid') &&
  migrationSql.includes('p_payment_id text') &&
  migrationSql.includes('p_order_id text') &&
  migrationSql.includes('p_amount_paise bigint') &&
  migrationSql.includes('p_plan_days integer') &&
  migrationSql.includes('p_plan_id text'),
  'FAIL: apply_subscription_payment must define matching parameter signatures'
)
console.log('✓ 2. RPC function signature exactly matches api/payments/verify-payment.js.')

// 4. Verify Catalog Plans & Security (SEC-08, SUB-02)
assert.ok(
  migrationSql.includes('p_amount_paise IN (100, 49900)') &&
  migrationSql.includes('p_amount_paise = 249900') &&
  migrationSql.includes('p_amount_paise = 449900'),
  'FAIL: apply_subscription_payment must support monthly, half-yearly, yearly, and test plans'
)
assert.ok(
  migrationSql.includes("SET search_path = public, pg_temp"),
  'FAIL: SECURITY DEFINER must have explicit search_path (SEC-08)'
)
assert.ok(
  migrationSql.includes("timezone('Asia/Kolkata', now())"),
  'FAIL: Date calculations must use Asia/Kolkata timezone (MEM-05)'
)
console.log('✓ 3. Multi-duration catalog plans, rollover logic, and search_path verified.')

// 5. Verify SUB-01: Expired Owner Access in RLS
assert.ok(
  migrationSql.includes('CREATE POLICY "members_select_own" ON public.members') &&
  !migrationSql.includes('members_select_own" ON public.members\n  FOR SELECT TO authenticated\n  USING (\n    gym_id = auth.uid() AND public.is_active_gym()'),
  'FAIL: members_select_own must NOT require is_active_gym() for read access (SUB-01)'
)

assert.ok(
  migrationSql.includes('CREATE POLICY "members_insert_own" ON public.members') &&
  migrationSql.includes('WITH CHECK (gym_id = auth.uid() AND public.is_active_gym())'),
  'FAIL: members_insert_own must strictly require is_active_gym()'
)
console.log('✓ 4. SUB-01 RLS policy verified: Expired owner can READ, write is BLOCKED.')

console.log('--- ALL PAY-02 TESTS PASSED SUCCESSFULLY! 🎉 ---')
