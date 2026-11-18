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
