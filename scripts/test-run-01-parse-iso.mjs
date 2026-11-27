import assert from 'node:assert/strict'
import {
  parseISO,
  daysLeft,
  formatDate,
  membershipStatus,
  expiryText,
  addDays,
  planEndDate,
  toISO,
} from '../src/lib/utils.js'

console.log('--- RUN-01: parseISO & Date Utilities Null / Undefined Safety Test ---')

// 1. parseISO Null / Undefined / Invalid Type Tests
assert.doesNotThrow(() => {
  const nullDate = parseISO(null)
  assert.ok(isNaN(nullDate.getTime()), 'parseISO(null) should return invalid Date without crashing')

  const undefDate = parseISO(undefined)
  assert.ok(isNaN(undefDate.getTime()), 'parseISO(undefined) should return invalid Date without crashing')

  const emptyDate = parseISO('')
  assert.ok(isNaN(emptyDate.getTime()), 'parseISO("") should return invalid Date without crashing')

  const invalidDate = parseISO('not-a-date')
  assert.ok(isNaN(invalidDate.getTime()), 'parseISO("not-a-date") should return invalid Date without crashing')

  const validDate = parseISO('2026-11-27')
  assert.equal(validDate.getFullYear(), 2026)
  assert.equal(validDate.getMonth(), 10) // 0-indexed November
  assert.equal(validDate.getDate(), 27)
}, 'FAIL: parseISO threw an error on invalid or missing input')
console.log('✓ 1. parseISO handles null, undefined, blank, and malformed strings safely.')

// 2. daysLeft Null / Undefined Tests
assert.doesNotThrow(() => {
  assert.equal(daysLeft(null), -1, 'daysLeft(null) should return -1')
  assert.equal(daysLeft(undefined), -1, 'daysLeft(undefined) should return -1')
  assert.equal(daysLeft(''), -1, 'daysLeft("") should return -1')
  assert.equal(daysLeft('invalid'), -1, 'daysLeft("invalid") should return -1')
}, 'FAIL: daysLeft threw on null or missing input')
console.log('✓ 2. daysLeft safely handles null/missing dates without throwing.')

// 3. formatDate Tests
assert.equal(formatDate(null), '-')
assert.equal(formatDate(undefined), '-')
assert.equal(formatDate(''), '-')
assert.equal(formatDate('invalid-date'), '-')
assert.ok(formatDate('2026-11-27').includes('2026'))
console.log('✓ 3. formatDate returns "-" on null/invalid inputs without crashing.')

// 4. membershipStatus Tests
assert.equal(membershipStatus(null), 'expired')
assert.equal(membershipStatus({}), 'expired')
assert.equal(membershipStatus({ end_date: null }), 'expired')
assert.equal(membershipStatus({ end_date: undefined }), 'expired')
console.log('✓ 4. membershipStatus safely treats null/missing end_date as "expired".')

// 5. expiryText Tests
assert.equal(expiryText(null), 'No expiry date')
assert.equal(expiryText(undefined), 'No expiry date')
assert.equal(expiryText(''), 'No expiry date')
console.log('✓ 5. expiryText safely provides fallback for null/missing dates.')

// 6. addDays and planEndDate Tests
assert.doesNotThrow(() => {
  const added = addDays(null, 5)
  assert.ok(added.length === 10, 'addDays(null) should default to today + days')

  const planEnd = planEndDate(null, 3)
  assert.ok(planEnd.length === 10, 'planEndDate(null) should default to today + months')
})
console.log('✓ 6. addDays and planEndDate handle null start dates cleanly.')

console.log('ALL RUN-01 TESTS PASSED SUCCESSFULLY! 🎉')
