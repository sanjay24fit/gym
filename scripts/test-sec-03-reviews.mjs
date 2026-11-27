import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

console.log('--- SEC-03: Verified Member Reviews & Anti-Sabotage Security Test ---')

// 1. Verify Migration File Exists
const migrationPath = path.join(
  rootDir,
  'supabase',
  'migrations',
  '20261127020000_fix_sec03_verified_member_reviews.sql'
)
assert.ok(fs.existsSync(migrationPath), 'FAIL: SEC-03 migration file must exist')
const migrationSql = fs.readFileSync(migrationPath, 'utf8')

// 2. Verify Table & Columns Definitions
assert.ok(
  migrationSql.includes('CREATE TABLE IF NOT EXISTS public.gym_reviews'),
  'FAIL: Must create public.gym_reviews table'
)
assert.ok(
  migrationSql.includes('ALTER TABLE public.gyms') &&
  migrationSql.includes('ADD COLUMN IF NOT EXISTS rating') &&
  migrationSql.includes('ADD COLUMN IF NOT EXISTS total_reviews'),
  'FAIL: Must ensure rating and total_reviews columns on public.gyms'
)
assert.ok(
  migrationSql.includes('ALTER TABLE public.members') &&
  migrationSql.includes('ADD COLUMN IF NOT EXISTS user_id'),
  'FAIL: Must ensure user_id on public.members for verified auth linking'
)
console.log('✓ 1. Migration defines gym_reviews table, gyms rating columns, and members user_id.')

// 3. Verify DB-01 Index & Anti-Spam Constraints
assert.ok(
  migrationSql.includes('CREATE INDEX IF NOT EXISTS gym_reviews_gym_rating_idx ON public.gym_reviews (gym_id, rating)'),
  'FAIL: DB-01 composite index (gym_id, rating) must exist'
)
assert.ok(
  migrationSql.includes('CREATE UNIQUE INDEX IF NOT EXISTS gym_reviews_gym_user_idx'),
  'FAIL: Unique index on (gym_id, user_id) must prevent duplicate reviews'
)
assert.ok(
  migrationSql.includes('CREATE UNIQUE INDEX IF NOT EXISTS gym_reviews_gym_member_idx'),
  'FAIL: Unique index on (gym_id, member_id) must prevent duplicate reviews'
)
console.log('✓ 2. DB-01 composite index and unique anti-spam indexes defined.')

// 4. Verify RLS Policies (Anti-Sabotage)
assert.ok(
  migrationSql.includes('ALTER TABLE public.gym_reviews ENABLE ROW LEVEL SECURITY;'),
  'FAIL: RLS must be enabled on public.gym_reviews'
)
assert.ok(
  !migrationSql.includes('CREATE POLICY "gym_reviews_insert_authenticated" ON public.gym_reviews\n  FOR INSERT TO public\n  WITH CHECK (true)'),
  'FAIL: Public insert policy with check (true) must NOT exist'
)
assert.ok(
  migrationSql.includes('CREATE POLICY "gym_reviews_insert_verified" ON public.gym_reviews'),
  'FAIL: Must enforce gym_reviews_insert_verified policy'
)
assert.ok(
  migrationSql.includes('m.gym_id = gym_reviews.gym_id') &&
  migrationSql.includes('m.user_id = auth.uid()'),
  'FAIL: Insert policy must verify caller is enrolled in the target gym'
)
assert.ok(
  !migrationSql.includes('g.user_id'),
  'FAIL: gyms table does not have user_id column; owner check must use gym_id = auth.uid()'
)
console.log('✓ 3. RLS prevents competitor sabotage; only verified members can insert.')

// 5. Verify submit_gym_review RPC Validation & Search Path
assert.ok(
  migrationSql.includes('CREATE OR REPLACE FUNCTION public.submit_gym_review'),
  'FAIL: Must create or replace submit_gym_review'
)
assert.ok(
  migrationSql.includes('SET search_path = public, pg_temp'),
  'FAIL: All functions must have search_path = public, pg_temp'
)
assert.ok(
  migrationSql.includes('user_id = uid AND gym_id = p_gym_id') ||
  migrationSql.includes('id = p_member_id AND gym_id = p_gym_id'),
  'FAIL: submit_gym_review must verify membership against public.members'
)
assert.ok(
  migrationSql.includes('Only active or registered members of this gym can submit reviews'),
  'FAIL: submit_gym_review must reject unverified non-members'
)
console.log('✓ 4. submit_gym_review strictly validates caller membership and sets search_path.')

// 6. Verify Frontend reviews.js RPC Compatibility
const reviewsJsPath = path.join(rootDir, 'src', 'lib', 'reviews.js')
const reviewsJs = fs.readFileSync(reviewsJsPath, 'utf8')

assert.ok(
  reviewsJs.includes("p_gym_id: gymId") &&
  reviewsJs.includes("p_rating: cleanRating") &&
  reviewsJs.includes("p_review_text: reviewPayload.reviewText") &&
  reviewsJs.includes("p_member_id: memberId || null"),
  'FAIL: src/lib/reviews.js parameters must match RPC signature'
)
console.log('✓ 5. Frontend submitMemberGymReview parameters match RPC signature.')

console.log('ALL SEC-03 VERIFICATION TESTS PASSED SUCCESSFULLY!')
