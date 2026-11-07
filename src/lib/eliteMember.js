import { supabase } from './supabase'

/**
 * Fetches the unified elite member dataset for all 5 tabs in a single roundtrip.
 * Returns { success, gym, member, attendance, workouts, diet, announcements, notifications, payment_history }
 */
export async function fetchEliteMemberData() {
  try {
    const { data, error } = await supabase.rpc('get_elite_member_data')
    if (error) {
      console.warn('RPC get_elite_member_data error:', error)
      return { success: false, error: error.message }
    }
    return data || { success: false, error: 'No data returned.' }
  } catch (err) {
    console.error('Network error loading elite member data:', err)
    return { success: false, error: err.message || 'Failed to connect.' }
  }
}

/**
 * Marks a member notification as read.
 */
export async function markNotificationAsRead(notificationId) {
  try {
    const { error } = await supabase
      .from('member_notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    return !error
  } catch (err) {
    console.warn('Could not mark notification read:', err)
    return false
  }
}

/**
 * Gym Owner: Quickly record attendance for a member.
 */
export async function recordAttendance(memberId, date = null, status = 'present') {
  try {
    const { data, error } = await supabase.rpc('record_member_attendance', {
      p_member_id: memberId,
      p_date: date || undefined,
      p_status: status,
    })
    if (error) {
      return { success: false, error: error.message }
    }
    return data || { success: true }
  } catch (err) {
    return { success: false, error: err.message || 'Attendance recording failed.' }
  }
}

