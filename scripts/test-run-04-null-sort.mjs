import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

console.log('--- RUN-04: localeCompare Null / Undefined Safe Sort Test ---')

// 1. Verify Dashboard.jsx does not have unprotected a.end_date.localeCompare
const dashboardPath = path.join(rootDir, 'src', 'components', 'Dashboard.jsx')
const dashboardSource = fs.readFileSync(dashboardPath, 'utf8')

assert.ok(
  !dashboardSource.includes('a.end_date.localeCompare(b.end_date)'),
  'FAIL: Dashboard.jsx still contains unsafe a.end_date.localeCompare'
)
assert.ok(
  dashboardSource.includes("(a.end_date || '').localeCompare(b.end_date || '')"),
  'FAIL: Dashboard.jsx must use null-safe (a.end_date || "").localeCompare'
)
console.log('✓ 1. Dashboard.jsx is protected against null/undefined end_date sort crash.')

// 2. Verify Members.jsx does not have unprotected a.end_date.localeCompare
const membersPath = path.join(rootDir, 'src', 'components', 'Members.jsx')
const membersSource = fs.readFileSync(membersPath, 'utf8')

assert.ok(
  !membersSource.includes('a.end_date.localeCompare(b.end_date)'),
  'FAIL: Members.jsx still contains unsafe a.end_date.localeCompare'
)
assert.ok(
  membersSource.includes("(a.end_date || '').localeCompare(b.end_date || '')"),
  'FAIL: Members.jsx must use null-safe (a.end_date || "").localeCompare'
)
console.log('✓ 2. Members.jsx is protected against null/undefined end_date sort crash.')

// 3. Runtime Simulation: Sort array with null, undefined, blank, and valid dates
const mockMembers = [
  { id: '1', name: 'Alice', end_date: null },
  { id: '2', name: 'Bob', end_date: '2026-12-15' },
  { id: '3', name: 'Charlie', end_date: undefined },
  { id: '4', name: 'David', end_date: '' },
  { id: '5', name: 'Eve', end_date: '2026-11-20' },
]

assert.doesNotThrow(() => {
  const sorted = [...mockMembers].sort((a, b) =>
    (a.end_date || '').localeCompare(b.end_date || '')
  )
  assert.equal(sorted.length, 5, 'Must retain all members')
  // Valid dates should be sorted, empty/null grouped at start
  const dates = sorted.map((m) => m.end_date)
  assert.equal(dates[dates.length - 1], '2026-12-15', 'Latest date should be at the end')
  assert.equal(dates[dates.length - 2], '2026-11-20', 'Earliest valid date before latest')
}, 'FAIL: Sorting with null/undefined dates threw an exception!')

console.log('✓ 3. Runtime sort simulation with null/undefined values passed without error.')
console.log('ALL RUN-04 TESTS PASSED SUCCESSFULLY! 🎉')
