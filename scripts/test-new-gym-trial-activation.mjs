import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

console.log('--- TEST: New Gym 21-Day Trial Activation & Members Schema ---')

// 1. Verify Migration File Exists
const migrationPath = path.join(
  rootDir,
  'supabase',
  'migrations',
  '20261128000000_fix_new_gym_trial_activation_and_members_schema.sql'
)
assert.ok(fs.existsSync(migrationPath), 'FAIL: 20261128000000 migration file must exist')
const migrationSql = fs.readFileSync(migrationPath, 'utf8')

// 2. Verify Members Schema Columns
assert.ok(
  migrationSql.includes('ADD COLUMN IF NOT EXISTS facility') &&
  migrationSql.includes('ADD COLUMN IF NOT EXISTS personal_trainer') &&
  migrationSql.includes('ADD COLUMN IF NOT EXISTS trainer_name'),
  'FAIL: Migration must ensure facility, personal_trainer, and trainer_name on members'
)
console.log('✓ 1. Members schema columns (facility, PT, trainer_name) are verified.')

// 3. Verify Gyms Schema Columns & 21-Day Trial in handle_new_user()
assert.ok(
  migrationSql.includes('ADD COLUMN IF NOT EXISTS connection_code') &&
  migrationSql.includes('ADD COLUMN IF NOT EXISTS trial_ends_at'),
  'FAIL: Migration must ensure connection_code and trial_ends_at on gyms'
)
assert.ok(
  migrationSql.includes("'active'") &&
  migrationSql.includes("interval '21 days'") &&
  migrationSql.includes("'trial'"),
  'FAIL: handle_new_user() must grant 21-day active trial'
)
console.log('✓ 2. handle_new_user() upgrades signup to 21-day active trial.')

// 4. Verify Immediate Activation of Pending Gyms
assert.ok(
  migrationSql.includes("UPDATE public.gyms") &&
  migrationSql.includes("SET status = 'active'") &&
  migrationSql.includes("WHERE status = 'pending'"),
  'FAIL: Migration must immediately activate existing pending gyms'
)
console.log('✓ 3. Migration immediately transitions pending gyms to active trial status.')

// 5. Verify Frontend Members.jsx includes gym_id in payload
const membersJsxPath = path.join(rootDir, 'src', 'components', 'Members.jsx')
const membersJsx = fs.readFileSync(membersJsxPath, 'utf8')

assert.ok(
  membersJsx.includes('gym_id: gym.id'),
  'FAIL: Members.jsx must explicitly attach gym_id to member insert payload'
)
console.log('✓ 4. Frontend Members.jsx explicitly assigns gym_id to member insert payload.')

console.log('ALL TRIAL ACTIVATION TESTS PASSED SUCCESSFULLY! 🎉')
