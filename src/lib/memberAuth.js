import { supabase } from './supabase.js'

/**
 * Resolves the authenticated user's role from trusted backend logic.
 * Returns: { role: 'admin' | 'owner' | 'member' | 'none' | 'unauthenticated', ...details }
 */
export async function fetchUserRole() {
  try {
    const { data, error } = await supabase.rpc('get_user_role')
    if (error) {
      console.warn('Error fetching user role via RPC:', error)
      return { role: 'none', error: error.message }
    }
    return data || { role: 'none' }
  } catch (err) {
    console.error('Network error resolving user role:', err)
    return { role: 'none', error: err.message }
  }
}

/**
 * Validates a Gym Connection Code without exposing sensitive data.
 * Calls RPC: public.verify_gym_code(gym_code text)
 * Returns: { valid: boolean, gym_id?: string, gym_name?: string, owner_name?: string, error?: string }
 */
export async function verifyGymConnectionCode(code) {
  if (!code || typeof code !== 'string' || code.trim().length < 3) {
    return { valid: false, error: 'Please enter a valid 6-digit Gym Connection Code.' }
  }
  const cleanCode = code.trim().toUpperCase()

  try {
    const { data, error } = await supabase.rpc('verify_gym_code', {
      gym_code: cleanCode,
    })

    if (error) {
      if (error.code === 'PGRST202' || error.message?.includes('schema cache')) {
        return {
          valid: false,
          error: 'Database function "verify_gym_code" is not loaded in Supabase. Please run the SQL migration in Supabase SQL Editor.',
          code: 'PGRST202',
        }
      }
      return { valid: false, error: error.message || 'Verification failed.' }
    }

    if (!data) {
      return { valid: false, error: 'Invalid response from server.' }
    }

    return data
  } catch (err) {
    return { valid: false, error: err.message || 'Network error verifying gym code.' }
  }
}

/**
 * Submits a membership join request for the authenticated member.
 * Calls RPC: public.submit_member_join_request(gym_code text, full_name text, phone text)
 */
export async function submitMemberJoinRequest({ gymCode, fullName, phone }) {
  if (!gymCode || !fullName || !phone) {
    return { success: false, error: 'Gym Code, Full Name, and Mobile Number are required.' }
  }

  try {
    const { data, error } = await supabase.rpc('submit_member_join_request', {
      gym_code: gymCode.trim().toUpperCase(),
      full_name: fullName.trim(),
      phone: phone.trim(),
    })

    if (error) {
      if (error.code === 'PGRST202' || error.message?.includes('schema cache')) {
        return {
          success: false,
          error: 'Function "submit_member_join_request" not found in database. Please run the SQL migration in Supabase.',
          code: 'PGRST202',
        }
      }
      return { success: false, error: error.message }
    }

    return data || { success: true }
  } catch (err) {
    return { success: false, error: err.message || 'Failed to submit join request.' }
  }
}

/**
 * Fetches the authenticated member's authorized dashboard data.
 * Calls RPC: public.get_authenticated_member_data()
 * Returns: { success: boolean, status: 'pending' | 'approved' | 'rejected', member?, gym?, request?, notes? }
 */
export async function fetchAuthenticatedMemberData() {
  try {
    const { data, error } = await supabase.rpc('get_authenticated_member_data')
    if (error) {
      return { success: false, error: error.message }
    }
    return data || { success: false, error: 'No data returned.' }
  } catch (err) {
    return { success: false, error: err.message || 'Failed to load member details.' }
  }
}

/**
 * Gym Owner: Generates/Rotates the unique 6-digit Gym Connection Code in the database.
 * Calls RPC: public.regenerate_gym_connect_code() / public.rotate_gym_code()
 */
export async function rotateGymConnectionCode() {
  try {
    const { data, error } = await supabase.rpc('regenerate_gym_connect_code')
    if (!error && data?.success) {
      return data
    }
    // Fallback to alias if needed
    const alt = await supabase.rpc('rotate_gym_code')
    if (alt.error) {
      return { success: false, error: alt.error.message }
    }
    return alt.data || { success: true }
  } catch (err) {
    return { success: false, error: err.message || 'Failed to generate gym code.' }
  }
}

/**
 * Gym Owner: Approves a member join request.
 * Calls RPC: public.approve_member_request(request_id uuid, target_member_id uuid)
 */
export async function approveMemberJoinRequest(requestId, targetMemberId = null) {
  try {
    const { data, error } = await supabase.rpc('approve_member_request', {
      request_id: requestId,
      target_member_id: targetMemberId || null,
    })
    if (error) {
      return { success: false, error: error.message }
    }
    return data || { success: true }
  } catch (err) {
    return { success: false, error: err.message || 'Failed to approve request.' }
  }
}

/**
 * Gym Owner: Rejects a member join request.
 * Calls RPC: public.reject_member_request(request_id uuid, reason text)
 */
export async function rejectMemberJoinRequest(requestId, reason = '') {
  try {
    const { data, error } = await supabase.rpc('reject_member_request', {
      request_id: requestId,
      reason: reason.trim(),
    })
    if (error) {
      return { success: false, error: error.message }
    }
    return data || { success: true }
  } catch (err) {
    return { success: false, error: err.message || 'Failed to reject request.' }
  }
}

/**
 * Gym Owner: Fetches pending and past member requests for their gym.
 */
export async function fetchGymMemberRequests(gymId) {
  if (!gymId) return []
  try {
    const { data, error } = await supabase
      .from('gym_member_requests')
      .select('*, members(id, name, phone, plan, total_fee, paid_amount, start_date, end_date)')
      .eq('gym_id', gymId)
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Error fetching member requests:', error)
      return []
    }
    return data || []
  } catch (err) {
    console.error('Network error fetching requests:', err)
    return []
  }
}

// ============================================================================
// MEMBER EMAIL OTP AUTHENTICATION & SINGLE-SOURCE DIRECTORY
// ============================================================================

/**
 * Normalizes email address (trims whitespace, converts to lowercase)
 */
export function normalizeMemberEmail(email) {
  if (!email || typeof email !== 'string') return ''
  return email.trim().toLowerCase()
}

/**
 * Basic email format validator regex
 */
export function isValidEmailFormat(email) {
  const clean = normalizeMemberEmail(email)
  if (!clean || clean.length < 5 || clean.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)
}

/**
 * Pre-flight check: Verifies if the email exists in public.members for an active gym.
 * Returns { eligible: boolean, count?: number, error?: string }
 */
export async function checkMemberEmailEligible(email) {
  const cleanEmail = normalizeMemberEmail(email)
  if (!isValidEmailFormat(cleanEmail)) {
    return {
      eligible: false,
      error: 'Please enter a valid email address (e.g. member@gmail.com).',
    }
  }

  try {
    const { data, error } = await supabase.rpc('check_member_email_eligible', {
      member_email: cleanEmail,
    })

    if (!error && data) {
      return data
    }

    // Graceful fallback if RPC is compiling or migrating
    if (error && (error.code === 'PGRST202' || error.message?.includes('not found') || error.message?.includes('schema cache'))) {
      const { data: rawCheck, error: rawErr } = await supabase
        .from('members')
        .select('id, gym_id')
        .ilike('email', cleanEmail)
        .limit(1)

      if (!rawErr && rawCheck && rawCheck.length > 0) {
        return { eligible: true, count: rawCheck.length }
      }
      return {
        eligible: false,
        error: 'This email is not registered with any gym. Please contact your gym owner to add you as a member.',
      }
    }

    return { eligible: false, error: error?.message || 'Eligibility check failed.' }
  } catch (err) {
    return { eligible: false, error: err.message || 'Network error verifying email eligibility.' }
  }
}

/**
 * Dispatches a 6-digit OTP to the verified member's email address using Supabase Auth signInWithOtp.
 * Pre-flight enforces that the email belongs to an existing eligible member.
 */
export async function sendMemberEmailOtp(email) {
  const cleanEmail = normalizeMemberEmail(email)

  // Step 1: Strict pre-flight check in database
  const eligibility = await checkMemberEmailEligible(cleanEmail)
  if (!eligibility.eligible) {
    return {
      success: false,
      error: eligibility.error || 'This email address is not registered with any Gym. Please ask your gym owner to add your email to your member profile.',
    }
  }

  // Step 2: Supabase Auth Email OTP
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        data: { role: 'member' },
        shouldCreateUser: true,
      },
    })

    if (error) {
      let friendly = error.message
      if (/rate limit/i.test(error.message)) {
        friendly = 'Too many OTP requests. Please wait a few minutes before trying again.'
      } else if (/signups not allowed/i.test(error.message)) {
        friendly = 'Email signups are currently restricted in Supabase project settings.'
      }
      return { success: false, error: friendly }
    }

    return { success: true, email: cleanEmail }
  } catch (err) {
    return { success: false, error: err.message || 'Failed to dispatch email verification code.' }
  }
}

/**
 * Verifies the 6-digit Email OTP and fetches all eligible gym memberships.
 * Returns { success: boolean, memberships: Array, session?, error? }
 */
export async function verifyMemberEmailOtp(email, otpToken) {
  const cleanEmail = normalizeMemberEmail(email)
  const cleanToken = (otpToken || '').trim()

  if (!cleanToken || cleanToken.length < 6) {
    return { success: false, error: 'Please enter the full 6-digit verification code.' }
  }

  try {
    // 1. Verify OTP token via Supabase Auth
    let verifyRes = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'email',
    })

    // Fallback if 'email' type needs 'magiclink' depending on Supabase version
    if (verifyRes.error && (verifyRes.error.message?.includes('type') || verifyRes.error.message?.includes('invalid token'))) {
      const altRes = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'magiclink',
      })
      if (!altRes.error) {
        verifyRes = altRes
      }
    }

    if (verifyRes.error) {
      let friendly = verifyRes.error.message
      if (/token has expired|invalid/i.test(verifyRes.error.message)) {
        friendly = 'Invalid or expired OTP code. Please check your Gmail or request a new OTP.'
      }
      return { success: false, error: friendly }
    }

    // 2. Link member user_id to auth.uid() in database
    try {
      await supabase.rpc('link_member_auth_user')
    } catch {
      // Non-critical, fallback will resolve by verified email
    }

    // 3. Fetch verified gym memberships for this email
    const membershipsRes = await fetchMemberMembershipsByEmail(cleanEmail)
    if (!membershipsRes.success || !membershipsRes.memberships || membershipsRes.memberships.length === 0) {
      return {
        success: false,
        error: 'OTP verified successfully, but no active gym membership was found for this email address.',
      }
    }

    return {
      success: true,
      email: cleanEmail,
      session: verifyRes.data?.session,
      user: verifyRes.data?.user,
      memberships: membershipsRes.memberships,
    }
  } catch (err) {
    return { success: false, error: err.message || 'OTP verification failed. Please try again.' }
  }
}

/**
 * Fetches all active gym memberships linked to this verified email address.
 * Multi-gym support: A member can belong to multiple gyms under the same email.
 */
export async function fetchMemberMembershipsByEmail(email) {
  const cleanEmail = normalizeMemberEmail(email)
  if (!cleanEmail) {
    return { success: false, error: 'Email is required to fetch memberships.' }
  }

  try {
    // 1. Primary: RPC get_member_portal_data_by_email
    const { data, error } = await supabase.rpc('get_member_portal_data_by_email', {
      member_email: cleanEmail,
    })

    if (!error && data?.success && data?.memberships?.length > 0) {
      return { success: true, memberships: data.memberships }
    }

    // 2. Secondary: RPC get_authenticated_member_data
    const authDataRes = await supabase.rpc('get_authenticated_member_data')
    if (!authDataRes.error && authDataRes.data?.success) {
      if (authDataRes.data.memberships && authDataRes.data.memberships.length > 0) {
        return { success: true, memberships: authDataRes.data.memberships }
      }
      if (authDataRes.data.member && authDataRes.data.gym) {
        return {
          success: true,
          memberships: [{ member: authDataRes.data.member, gym: authDataRes.data.gym }],
        }
      }
    }

    // 3. Fallback direct query if allowed by RLS
    const { data: directMembers, error: directErr } = await supabase
      .from('members')
      .select('*, gyms(id, gym_name, owner_name, phone, email, city, area)')
      .ilike('email', cleanEmail)

    if (!directErr && directMembers && directMembers.length > 0) {
      const normalized = directMembers.map((m) => ({
        member: {
          id: m.id,
          gym_id: m.gym_id,
          name: m.name,
          phone: m.phone,
          email: m.email,
          plan: m.plan,
          facility: m.facility || 'Gym & Fitness',
          personal_trainer: Boolean(m.personal_trainer),
          trainer_name: m.trainer_name || '',
          start_date: m.start_date,
          end_date: m.end_date,
          total_fee: m.total_fee,
          paid_amount: m.paid_amount,
          notes: m.notes,
          created_at: m.created_at,
        },
        gym: {
          id: m.gyms?.id || m.gym_id,
          gym_name: m.gyms?.gym_name || 'Gym Fitness Center',
          owner_name: m.gyms?.owner_name || 'Gym Owner',
          phone: m.gyms?.phone || '',
          email: m.gyms?.email || '',
          city: m.gyms?.city || '',
          area: m.gyms?.area || '',
        },
      }))
      return { success: true, memberships: normalized }
    }

    return {
      success: false,
      error: error?.message || 'No gym memberships found for this email address.',
    }
  } catch (err) {
    return { success: false, error: err.message || 'Failed to fetch memberships.' }
  }
}

