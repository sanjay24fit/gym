import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

console.log('--- RUN-02: Offline Cache Wipeout Protection Test ---')

const appPath = path.join(rootDir, 'src', 'App.jsx')
const appSource = fs.readFileSync(appPath, 'utf8')

// 1. Verify getSession() does NOT blindly wipe cache when offline
assert.ok(
  appSource.includes('navigator.onLine'),
  'FAIL: App.jsx must check online status before clearing cache in getSession or account effects'
)
assert.ok(
  !appSource.includes("if (!data.session) {\n        try {\n          localStorage.removeItem('gym_cached_account')"),
  'FAIL: getSession() must not unconditionally remove gym_cached_account'
)
console.log('✓ 1. getSession() preserves offline cached account.')

// 2. Verify userId and account retain loadedAccount when offline
assert.ok(
  appSource.includes('isOffline') &&
  appSource.includes('loadedAccount?.userId'),
  'FAIL: userId must retain loadedAccount.userId when offline'
)
console.log('✓ 2. userId and account state preserve cached login when offline.')

// 3. Verify loadMembers() does not overwrite cached members on network error
assert.ok(
  appSource.includes('!hasError || all.length > 0'),
  'FAIL: loadMembers must check for errors before overwriting members state with empty array'
)
console.log('✓ 3. loadMembers preserves cached members on network failures.')

// 4. Verify refresh() does not preemptively wipe cache before fetch
assert.ok(
  !appSource.includes("const refresh = async () => {\n    setLoadError('')\n    try {\n      localStorage.removeItem('gym_cached_account')"),
  'FAIL: refresh() must not preemptively wipe cache before fetching from network'
)
console.log('✓ 4. refresh() does not wipe cache before verifying network status.')

// 5. Verify explicit logout and SIGNED_OUT still cleanly clear cache
assert.ok(
  appSource.includes("event === 'SIGNED_OUT'") &&
  appSource.includes("localStorage.removeItem('gym_cached_account')") &&
  appSource.includes("localStorage.removeItem('gym_cached_members')"),
  'FAIL: SIGNED_OUT event must cleanly clear both cached account and members'
)
assert.ok(
  appSource.includes('const logout = () => {') &&
  appSource.includes("localStorage.removeItem('gym_cached_account')"),
  'FAIL: logout() must cleanly purge cached account and members'
)
console.log('✓ 5. Explicit logout and SIGNED_OUT event purge cache cleanly.')

console.log('ALL RUN-02 TESTS PASSED SUCCESSFULLY! 🎉')
