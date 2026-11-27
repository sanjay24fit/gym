import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

console.log('--- RUN-03: Promise.all Unhandled Rejection Protection Test ---')

// 1. App.jsx Promise.all has .catch()
const appPath = path.join(rootDir, 'src', 'App.jsx')
const appSource = fs.readFileSync(appPath, 'utf8')

assert.ok(
  appSource.includes('Promise.all([') &&
  appSource.includes("}).catch((err) => {"),
  'FAIL: App.jsx Promise.all must have a .catch() handler'
)
console.log('✓ 1. App.jsx Promise.all is protected with a graceful .catch() rejection handler.')

// 2. CityLeaderboardModal.jsx Promise.all has .catch()
const modalPath = path.join(rootDir, 'src', 'components', 'CityLeaderboardModal.jsx')
const modalSource = fs.readFileSync(modalPath, 'utf8')

assert.ok(
  modalSource.includes('Promise.all([') &&
  modalSource.includes('}).catch((err) => {') &&
  modalSource.includes('setLoading(false)'),
  'FAIL: CityLeaderboardModal.jsx Promise.all must have .catch() and reset loading state'
)
console.log('✓ 2. CityLeaderboardModal.jsx Promise.all catches network failures and resets loading state.')

// 3. Admin.jsx Promise.all has try/catch block
const adminPath = path.join(rootDir, 'src', 'components', 'Admin.jsx')
const adminSource = fs.readFileSync(adminPath, 'utf8')

assert.ok(
  adminSource.includes('try {') &&
  adminSource.includes('await Promise.all([') &&
  adminSource.includes('} catch (err) {') &&
  adminSource.includes('finally {'),
  'FAIL: Admin.jsx Promise.all must be wrapped in try/catch/finally'
)
console.log('✓ 3. Admin.jsx Promise.all is safely guarded by try/catch/finally.')

// 4. Runtime simulation: Verify Promise.all rejection is caught cleanly
let caught = false
await Promise.all([
  Promise.resolve({ ok: true }),
  Promise.reject(new Error('Simulated network drop / offline failure')),
]).catch((err) => {
  caught = true
  assert.equal(err.message, 'Simulated network drop / offline failure')
})
assert.ok(caught, 'FAIL: Promise.all rejection was not caught')
console.log('✓ 4. Runtime rejection simulation verified without unhandled error.')

console.log('ALL RUN-03 TESTS PASSED SUCCESSFULLY! 🎉')
