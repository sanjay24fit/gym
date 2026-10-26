import { toISO, today } from './utils'

const STORAGE_KEY_PREFIX = 'gym_attendance_'

export function getAttendanceLogs(gymId = 'default') {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + gymId)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    console.error('Error loading attendance:', e)
    return []
  }
}

export function saveAttendanceLogs(gymId = 'default', logs = []) {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + gymId, JSON.stringify(logs))
  } catch (e) {
    console.error('Error saving attendance:', e)
  }
}

export function markMemberAttendance(gymId = 'default', member) {
  if (!member) return false
  const logs = getAttendanceLogs(gymId)
  const todayStr = today()
  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  // Check if already checked in today
  const existing = logs.find((l) => l.memberId === member.id && l.date === todayStr)
  if (existing) {
    return { success: false, alreadyMarked: true, log: existing }
  }

  const newLog = {
    id: 'att_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    memberId: member.id,
    memberName: member.name,
    memberPhone: member.phone || '',
    plan: member.plan || 'Standard',
    date: todayStr,
    time: timeStr,
    timestamp: Date.now(),
  }

  const updated = [newLog, ...logs]
  saveAttendanceLogs(gymId, updated)
  return { success: true, log: newLog }
}

export function removeAttendanceLog(gymId = 'default', logId) {
  const logs = getAttendanceLogs(gymId)
  const updated = logs.filter((l) => l.id !== logId)
  saveAttendanceLogs(gymId, updated)
  return updated
}

export function getTodayCheckins(gymId = 'default') {
  const logs = getAttendanceLogs(gymId)
  const todayStr = today()
  return logs.filter((l) => l.date === todayStr)
}

export function getMonthAttendanceStats(gymId = 'default', yearMonthStr = null) {
  const logs = getAttendanceLogs(gymId)
  const targetPrefix = yearMonthStr || today().slice(0, 7) // 'YYYY-MM'
  const monthLogs = logs.filter((l) => l.date && l.date.startsWith(targetPrefix))
  
  const uniqueMemberIds = new Set(monthLogs.map((l) => l.memberId))
  return {
    totalCheckins: monthLogs.length,
    uniqueMembers: uniqueMemberIds.size,
    logs: monthLogs,
  }
}
