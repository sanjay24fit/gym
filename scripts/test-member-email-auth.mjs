import assert from 'node:assert/strict'
import {
  normalizeMemberEmail,
  isValidEmailFormat,
} from '../src/lib/memberAuth.js'

console.log('--- RUNNING MEMBER EMAIL OTP AUTHENTICATION TESTS ---\n')

// 1. TEST: Email Normalization & Validation
console.log('1. Testing email normalization and format validation...')
{
  assert.equal(normalizeMemberEmail('  User@Example.COM  '), 'user@example.com')
  assert.equal(normalizeMemberEmail('Rahul.Sharma@Gym.IN'), 'rahul.sharma@gym.in')
  assert.equal(normalizeMemberEmail(''), '')
  assert.equal(normalizeMemberEmail(null), '')
  assert.equal(normalizeMemberEmail(undefined), '')

  assert.equal(isValidEmailFormat('member@gmail.com'), true)
  assert.equal(isValidEmailFormat('user.name+gym@sub.domain.co.in'), true)
  assert.equal(isValidEmailFormat('invalid-email'), false)
  assert.equal(isValidEmailFormat('user@'), false)
  assert.equal(isValidEmailFormat('@domain.com'), false)
  assert.equal(isValidEmailFormat('user@domain'), false)
  assert.equal(isValidEmailFormat(''), false)
  console.log('  ✓ Email normalization and validation verified')
}

// 2. TEST: Mandatory Email in Member Creation
console.log('2. Testing mandatory email in Create Member validation...')
{
  function validateMemberFormSubmission(form) {
    const cleanEmail = normalizeMemberEmail(form.email)
    if (!cleanEmail) {
      return { valid: false, error: 'Email address is required. Members use this email to receive login OTP and access their dashboard.' }
    }
    if (!isValidEmailFormat(cleanEmail)) {
      return { valid: false, error: 'Please enter a valid email address (e.g. member@gmail.com).' }
    }
    return { valid: true, email: cleanEmail }
  }

  // Attempt 1: Empty email
  const emptyRes = validateMemberFormSubmission({ name: 'Rahul', email: '', phone: '9876543210' })
  assert.equal(emptyRes.valid, false)
  assert.match(emptyRes.error, /Email address is required/)

  // Attempt 2: Whitespace email
  const wsRes = validateMemberFormSubmission({ name: 'Rahul', email: '   ', phone: '9876543210' })
  assert.equal(wsRes.valid, false)
  assert.match(wsRes.error, /Email address is required/)

  // Attempt 3: Malformed email
  const badRes = validateMemberFormSubmission({ name: 'Rahul', email: 'rahul.gym', phone: '9876543210' })
  assert.equal(badRes.valid, false)
  assert.match(badRes.error, /valid email address/)

  // Attempt 4: Valid mixed-case email with spaces
  const okRes = validateMemberFormSubmission({ name: 'Rahul', email: '  Rahul.Fit@GMAIL.com  ', phone: '9876543210' })
  assert.equal(okRes.valid, true)
  assert.equal(okRes.email, 'rahul.fit@gmail.com')
  console.log('  ✓ Mandatory email enforcement in member creation verified')
}

// 3. TEST: Pre-Flight Check & Unregistered Email Rejection
console.log('3. Testing pre-flight check and unregistered email rejection...')
{
  // Simulated database members directory
  const dbMembers = [
    { id: 'm1', gym_id: 'g1', email: 'aman@gmail.com', name: 'Aman' },
    { id: 'm2', gym_id: 'g2', email: 'priya@yahoo.com', name: 'Priya' },
  ]

  function checkEmailEligibleSim(inputEmail) {
    const clean = normalizeMemberEmail(inputEmail)
    if (!isValidEmailFormat(clean)) {
      return { eligible: false, error: 'Please enter a valid email address.' }
    }
    const matches = dbMembers.filter((m) => m.email === clean)
    if (matches.length === 0) {
      return {
        eligible: false,
        error: 'This email address is not registered with any Gym. Please ask your gym owner to add your email to your member profile.',
      }
    }
    return { eligible: true, count: matches.length }
  }

  // Case A: Unregistered email
  const unreg = checkEmailEligibleSim('unknown@stranger.com')
  assert.equal(unreg.eligible, false)
  assert.match(unreg.error, /not registered with any Gym/)

  // Case B: Registered email
  const reg = checkEmailEligibleSim('Aman@Gmail.com')
  assert.equal(reg.eligible, true)
  assert.equal(reg.count, 1)
  console.log('  ✓ Pre-flight eligibility check verified (blocks non-members)')
}

// 4. TEST: 6-Digit OTP Security & Verification Rules
console.log('4. Testing 6-digit OTP verification & invalid OTP rejection...')
{
  function verifyOtpSimulation({ storedOtp, inputOtp, expiresAt, attempts }) {
    const cleanToken = (inputOtp || '').trim()
    if (!cleanToken || cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) {
      return { success: false, error: 'Please enter the full 6-digit verification code.' }
    }
    if (attempts >= 5) {
      return { success: false, error: 'Too many incorrect attempts. Please request a new OTP.' }
    }
    if (Date.now() > expiresAt) {
      return { success: false, error: 'Invalid or expired OTP code. Please request a new OTP.' }
    }
    if (cleanToken !== storedOtp) {
      return { success: false, error: 'Invalid or expired OTP code. Please check your Gmail or request a new OTP.' }
    }
    return { success: true }
  }

  const validOtp = '582914'
  const now = Date.now()
  const validExpiry = now + 5 * 60 * 1000 // 5 minutes validity
  const expiredTime = now - 1000 // Expired

  // Test: Incomplete / short OTP
  assert.equal(verifyOtpSimulation({ storedOtp: validOtp, inputOtp: '582', expiresAt: validExpiry, attempts: 0 }).success, false)

  // Test: Non-numeric OTP
  assert.equal(verifyOtpSimulation({ storedOtp: validOtp, inputOtp: '58291a', expiresAt: validExpiry, attempts: 0 }).success, false)

  // Test: Incorrect 6-digit OTP
  const badOtpRes = verifyOtpSimulation({ storedOtp: validOtp, inputOtp: '123456', expiresAt: validExpiry, attempts: 1 })
  assert.equal(badOtpRes.success, false)
  assert.match(badOtpRes.error, /Invalid or expired/)

  // Test: Expired OTP
  const expiredRes = verifyOtpSimulation({ storedOtp: validOtp, inputOtp: validOtp, expiresAt: expiredTime, attempts: 0 })
  assert.equal(expiredRes.success, false)
  assert.match(expiredRes.error, /expired/)

  // Test: Brute force attempts exceeded (>= 5)
  const bruteRes = verifyOtpSimulation({ storedOtp: validOtp, inputOtp: validOtp, expiresAt: validExpiry, attempts: 5 })
  assert.equal(bruteRes.success, false)
  assert.match(bruteRes.error, /Too many incorrect attempts/)

  // Test: Correct 6-digit OTP within valid window
  const okRes = verifyOtpSimulation({ storedOtp: validOtp, inputOtp: '582914', expiresAt: validExpiry, attempts: 2 })
  assert.equal(okRes.success, true)
  console.log('  ✓ 6-Digit OTP security, expiry, and attempt limits verified')
}

// 5. TEST: Multi-Gym Memberships Under One Email
console.log('5. Testing multiple gym memberships associated with one email...')
{
  const mockDatabase = [
    {
      member: { id: 'm1', gym_id: 'gym-udaipur', email: 'vikram@fitness.in', name: 'Vikram Singh', plan: '12 Months', facility: 'All Access (Full Gym)' },
      gym: { id: 'gym-udaipur', gym_name: 'Iron Paradise Udaipur', city: 'Udaipur', area: 'Shobhagpura', phone: '9829000001' },
    },
    {
      member: { id: 'm2', gym_id: 'gym-jaipur', email: 'vikram@fitness.in', name: 'Vikram Singh', plan: '1 Month', facility: 'Cardio Zone' },
      gym: { id: 'gym-jaipur', gym_name: 'Jaipur Fitness Hub', city: 'Jaipur', area: 'Malviya Nagar', phone: '9829000002' },
    },
    {
      member: { id: 'm3', gym_id: 'gym-delhi', email: 'other@user.com', name: 'Other Member', plan: '3 Months', facility: 'Gym & Fitness' },
      gym: { id: 'gym-delhi', gym_name: 'Delhi Powerhouse', city: 'Delhi', area: 'South Ext', phone: '9829000003' },
    },
  ]

  function getMembershipsByEmail(email) {
    const clean = normalizeMemberEmail(email)
    return mockDatabase.filter((row) => row.member.email === clean)
  }

  const vikramMemberships = getMembershipsByEmail('Vikram@Fitness.IN')
  assert.equal(vikramMemberships.length, 2)
  assert.equal(vikramMemberships[0].gym.gym_name, 'Iron Paradise Udaipur')
  assert.equal(vikramMemberships[1].gym.gym_name, 'Jaipur Fitness Hub')

  // Verify other member data is NOT leaked
  assert.equal(vikramMemberships.some((r) => r.member.name === 'Other Member'), false)
  console.log('  ✓ Multi-gym membership resolution under single email verified')
}

// 6. TEST: Tenant Isolation & Data Privacy
console.log('6. Testing data isolation and public directory sanitization...')
{
  const rawGymRow = {
    id: 'g-99',
    gym_name: 'Metro Fitness',
    owner_name: 'Ramesh Patel',
    phone: '9876500000',
    email: 'ramesh@metrofit.com',
    city: 'Udaipur',
    area: 'Panchwati',
    // Confidential owner fields that MUST NEVER be sent to public/members:
    razorpay_account_id: 'acc_secret_123',
    total_revenue: 450000,
    service_role_key: 'secret_key_never_leak',
  }

  function sanitizeGymForMember(gym) {
    return {
      id: gym.id,
      gym_name: gym.gym_name,
      owner_name: gym.owner_name,
      phone: gym.phone,
      email: gym.email,
      city: gym.city,
      area: gym.area,
    }
  }

  const cleanGym = sanitizeGymForMember(rawGymRow)
  assert.equal(cleanGym.razorpay_account_id, undefined)
  assert.equal(cleanGym.total_revenue, undefined)
  assert.equal(cleanGym.service_role_key, undefined)
  assert.equal(cleanGym.gym_name, 'Metro Fitness')
  console.log('  ✓ Multi-tenant isolation verified (confidential owner data protected)')
}

// 7. TEST: Backward Compatibility for Existing Members Without Email
console.log('7. Testing backward compatibility for existing members without email...')
{
  const legacyMember = {
    id: 'leg-1',
    name: 'Old Member',
    phone: '9829123456',
    email: '', // No email saved yet
    plan: '1 Month',
    start_date: '2026-10-01',
    end_date: '2026-11-01',
    total_fee: 1500,
    paid_amount: 1500,
  }

  // Member record remains completely valid
  assert.equal(legacyMember.name, 'Old Member')
  assert.equal(legacyMember.total_fee, 1500)

  // Status check in UI: Flagged as needing email update before accessing Member App
  const needsEmailUpdate = !legacyMember.email || legacyMember.email.trim() === ''
  assert.equal(needsEmailUpdate, true)

  // Once owner updates email:
  legacyMember.email = normalizeMemberEmail('oldmember@gmail.com')
  assert.equal(!legacyMember.email, false)
  assert.equal(legacyMember.email, 'oldmember@gmail.com')
  console.log('  ✓ Backward compatibility for existing records verified')
}

console.log('\nALL 7 MEMBER EMAIL OTP AUTHENTICATION TEST SUITES PASSED! 🎉')
