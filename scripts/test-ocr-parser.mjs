import assert from 'node:assert'
import { parseNotebookText, parseAnyDate, extractPhone, normalizePlan } from '../src/lib/ocrParser.js'

console.log('--- RUNNING OCR PARSER TESTS ---')

// 1. Date parsing test
assert.strictEqual(parseAnyDate('01/10/2026'), '2026-10-01')
assert.strictEqual(parseAnyDate('15-11-2026'), '2026-11-15')
assert.strictEqual(parseAnyDate('2026-12-31'), '2026-12-31')
assert.strictEqual(parseAnyDate('14 Oct 2026'), '2026-10-14')
assert.strictEqual(parseAnyDate('invalid-date'), null)
console.log('✓ parseAnyDate tests passed')

// 2. Phone extraction test
assert.strictEqual(extractPhone('Rahul 9876543210 Gym'), '9876543210')
assert.strictEqual(extractPhone('+91 98765 43210'), '9876543210')
assert.strictEqual(extractPhone('No phone here'), '')
console.log('✓ extractPhone tests passed')

// 3. Plan normalization test
assert.strictEqual(normalizePlan('3 Months'), '3 Months')
assert.strictEqual(normalizePlan('1 Year'), '12 Months')
assert.strictEqual(normalizePlan('6 month package'), '6 Months')
assert.strictEqual(normalizePlan('Special VIP 2 Months'), 'Custom')
console.log('✓ normalizePlan tests passed')

// 4. Single clearly labeled member entry
const labeledText = `
Name: Rahul Sharma
Mobile: 9876543210
Plan: 3 Months
Fee: 3000
Paid: 2000
Joining Date: 01/10/2026
Expiry Date: 31/12/2026
`
const parsedSingle = parseNotebookText(labeledText)
assert.strictEqual(parsedSingle.length, 1)
assert.strictEqual(parsedSingle[0].name, 'Rahul Sharma')
assert.strictEqual(parsedSingle[0].phone, '9876543210')
assert.strictEqual(parsedSingle[0].plan, '3 Months')
assert.strictEqual(parsedSingle[0].total_fee, 3000)
assert.strictEqual(parsedSingle[0].paid_amount, 2000)
assert.strictEqual(parsedSingle[0].start_date, '2026-10-01')
assert.strictEqual(parsedSingle[0].end_date, '2026-12-31')
console.log('✓ Single labeled record test passed')

// 5. Multiple tabular rows per page
const tabularText = `
Sr | Name | Mobile | Plan | Fee | Paid
1. Amit Verma | 9811223344 | 1 Month | 1200 | 1200
2. Rohit Kumar | 9922334455 | 6 Months | 5000 | 3000
3. Priya Singh | 9733445566 | 3 Months | 3000 | 3000
`
const parsedTabular = parseNotebookText(tabularText)
assert.strictEqual(parsedTabular.length, 3)
assert.strictEqual(parsedTabular[0].name, 'Amit Verma')
assert.strictEqual(parsedTabular[0].phone, '9811223344')
assert.strictEqual(parsedTabular[0].plan, '1 Month')
assert.strictEqual(parsedTabular[1].name, 'Rohit Kumar')
assert.strictEqual(parsedTabular[1].phone, '9922334455')
assert.strictEqual(parsedTabular[1].plan, '6 Months')
assert.strictEqual(parsedTabular[2].name, 'Priya Singh')
assert.strictEqual(parsedTabular[2].phone, '9733445566')
console.log('✓ Multiple tabular records test passed')

// 6. Multiple block-style entries separated by numbers or names
const multiBlockText = `
1. Name: Karan Johar
Mobile: 9111222333
Fee: 2500
Paid: 2500

2. Name: Vikas Gupta
Mobile: 9444555666
Plan: 12 Months
Fee: 10000
Paid: 5000
`
const parsedMulti = parseNotebookText(multiBlockText)
assert.strictEqual(parsedMulti.length, 2)
assert.strictEqual(parsedMulti[0].name, 'Karan Johar')
assert.strictEqual(parsedMulti[0].phone, '9111222333')
assert.strictEqual(parsedMulti[1].name, 'Vikas Gupta')
assert.strictEqual(parsedMulti[1].phone, '9444555666')
assert.strictEqual(parsedMulti[1].plan, '12 Months')
console.log('✓ Multiple block-style records test passed')

// 7. Unreadable / empty text
const emptyResults = parseNotebookText('??? ### @@@')
assert.strictEqual(emptyResults.length, 0)
console.log('✓ Empty/unreadable text test passed')

console.log('ALL 7 OCR PARSER TESTS PASSED SUCCESSFULLY! 🎉')
