import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

console.log('--- SEC-02: Fast2SMS API Key Security Test ---')

// 1. Verify api/member/send-otp.js has NO hardcoded keys and NO VITE_ fallback
const sendOtpPath = path.join(rootDir, 'api', 'member', 'send-otp.js')
const sendOtpSource = fs.readFileSync(sendOtpPath, 'utf8')

assert.ok(
  !sendOtpSource.includes('tHzSYs4RH'),
  'FAIL: api/member/send-otp.js must NOT contain hardcoded Fast2SMS key'
)
assert.ok(
  !sendOtpSource.includes('VITE_FAST2SMS'),
  'FAIL: api/member/send-otp.js must NOT reference client-exposed VITE_FAST2SMS'
)
assert.ok(
  sendOtpSource.includes('process.env.FAST2SMS_API_KEY'),
  'FAIL: api/member/send-otp.js must strictly use process.env.FAST2SMS_API_KEY'
)
console.log('✓ 1. api/member/send-otp.js is clean of hardcoded keys and VITE_ fallbacks.')

// 2. Verify .env.example documents FAST2SMS_API_KEY without VITE_ prefix
const envExamplePath = path.join(rootDir, '.env.example')
const envExampleSource = fs.readFileSync(envExamplePath, 'utf8')

assert.ok(
  envExampleSource.includes('FAST2SMS_API_KEY='),
  'FAIL: .env.example must document FAST2SMS_API_KEY'
)
assert.ok(
  !envExampleSource.includes('VITE_FAST2SMS'),
  'FAIL: .env.example must NOT suggest VITE_FAST2SMS'
)
console.log('✓ 2. .env.example properly documents server-only FAST2SMS_API_KEY.')

// 3. Verify no file under src/ references FAST2SMS
const srcDir = path.join(rootDir, 'src')
function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      scanDir(fullPath)
    } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8')
      assert.ok(
        !content.includes('FAST2SMS'),
        `FAIL: Client file ${entry.name} must not mention FAST2SMS`
      )
    }
  }
}
scanDir(srcDir)
console.log('✓ 3. src/ directory has zero client-side FAST2SMS references.')

// 4. Test handler behavior when FAST2SMS_API_KEY is not configured
const originalKey = process.env.FAST2SMS_API_KEY
delete process.env.FAST2SMS_API_KEY

const { default: handler } = await import(pathToFileURL(sendOtpPath).href)

let statusCode = 200
let responseBody = null
const mockRes = {
  status(code) {
    statusCode = code
    return this
  },
  json(data) {
    responseBody = data
    return this
  },
}

const mockReq = {
  method: 'POST',
  body: { phone: '9876543210', otp: '123456' },
  headers: {},
}

await handler(mockReq, mockRes)

assert.equal(statusCode, 500, 'FAIL: Handler must return 500 when FAST2SMS_API_KEY is missing')
assert.equal(responseBody?.success, false, 'FAIL: Response must indicate failure')
assert.equal(
  responseBody?.error,
  'SMS service is not configured on the server.',
  'FAIL: Response must state SMS service is not configured'
)
console.log('✓ 4. Handler safely rejects with 500 when FAST2SMS_API_KEY is absent.')

// Restore process.env
if (originalKey) {
  process.env.FAST2SMS_API_KEY = originalKey
}

// 5. Build the frontend and assert dist/ contains no FAST2SMS or key string
console.log('Building frontend to verify bundle security...')
execSync('npm run build', { cwd: rootDir, stdio: 'pipe' })

const distDir = path.join(rootDir, 'dist')
assert.ok(fs.existsSync(distDir), 'FAIL: dist directory must exist after build')

function scanDist(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      scanDist(fullPath)
    } else if (/\.(js|html|css|json)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8')
      assert.ok(
        !content.includes('FAST2SMS') && !content.includes('tHzSYs4RH'),
        `FAIL: Production bundle ${entry.name} must NOT leak FAST2SMS or key!`
      )
    }
  }
}
scanDist(distDir)
console.log('✓ 5. Production dist/ bundle is 100% free of FAST2SMS keys and references.')

console.log('--- ALL SEC-02 SECURITY TESTS PASSED ---')
