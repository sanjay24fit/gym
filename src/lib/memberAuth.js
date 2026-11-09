import { supabase } from './supabase'

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
 * Returns: { valid: boolean, gym_id?: string, gym_name?: string, owner_name?: string, error?: string }
 */
export async function verifyGymConnectionCode(code) {
  if (!code || code.trim().length < 3) {
    return { valid: false, error: 'Please enter a valid Gym Connection Code.' }
  }
  try {
    const { data, error } = await supabase.rpc('verify_gym_code', {
      gym_code: code.trim().toUpperCase(),
    })
    if (error) {
      return { valid: false, error: error.message || 'Verification failed.' }
    }
    return data || { valid: false, error: 'Invalid response from server.' }
  } catch (err) {
    return { valid: false, error: err.message || 'Network error verifying gym code.' }
  }
}

/**
 * Submits a membership join request for the authenticated member.
 */
export async function submitMemberJoinRequest({ gymCode, fullName, phone }) {
  try {
    const { data, error } = await supabase.rpc('submit_member_join_request', {
      gym_code: gymCode.trim().toUpperCase(),
      full_name: fullName.trim(),
      phone: phone.trim(),
    })
    if (error) {
      return { success: false, error: error.message }
    }
    return data || { success: true }
  } catch (err) {
    return { success: false, error: err.message || 'Failed to submit join request.' }
  }
}

/**
 * Fetches the authenticated member's authorized dashboard data.
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
 * Gym Owner: Rotates the Gym Connection Code.
 */
export async function rotateGymConnectionCode() {
  try {
    const { data, error } = await supabase.rpc('rotate_gym_code')
    if (error) {
      return { success: false, error: error.message }
    }
    return data || { success: true }
  } catch (err) {
    return { success: false, error: err.message || 'Failed to rotate gym code.' }
  }
}

/**
 * Gym Owner: Approves a member join request.
 * Can optionally link to a specific existing member record.
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

