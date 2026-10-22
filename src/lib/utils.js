export const EXPIRING_DAYS = 7

export const PLANS = [
  { label: '1 Month', months: 1 },
  { label: '3 Months', months: 3 },
  { label: '6 Months', months: 6 },
  { label: '12 Months', months: 12 },
]

export const FACILITIES = [
  'Gym & Fitness',
  'Cardio + Strength',
  'CrossFit & Functional',
  'Zumba & Aerobics',
  'Yoga & Pilates',
  'Swimming Pool',
  'Steam & Sauna',
  'All Access (Full Gym)',
]

export function getMemberFacility(m) {
  if (!m) return 'Gym & Fitness'
  if (m.facility && m.facility.trim()) return m.facility.trim()
  if (m.notes) {
    const match = m.notes.match(/\[Facility:\s*([^\]|]+)\]/i)
    if (match && match[1]) return match[1].trim()
  }
  return 'Gym & Fitness'
}

export function hasPersonalTrainer(m) {
  if (!m) return false
  if (m.personal_trainer === true || m.personal_trainer === 'true') return true
  if (m.notes) {
    if (/\[PT:\s*(true|yes)/i.test(m.notes) || /\[Trainer:/i.test(m.notes)) {
      return true
    }
  }
  return false
}

export function getTrainerName(m) {
  if (!m) return ''
  if (m.trainer_name && m.trainer_name.trim()) return m.trainer_name.trim()
  if (m.notes) {
    const match = m.notes.match(/Trainer:\s*([^\]|]+)/i)
    if (match && match[1]) return match[1].trim()
  }
  return ''
}

export function toISO(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISO(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function today() {
  return toISO(new Date())
}

export function addDays(iso, days) {
  const d = parseISO(iso)
  d.setDate(d.getDate() + days)
  return toISO(d)
}

// End date of a plan that starts on `startIso` and lasts `months` months
export function planEndDate(startIso, months) {
  const d = parseISO(startIso)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, lastDay))
  d.setDate(d.getDate() - 1)
  return toISO(d)
}

export function daysLeft(endIso) {
  const ms = parseISO(endIso) - parseISO(today())
  return Math.round(ms / 86400000)
}

export function dueAmount(m) {
  return Math.max(0, Number(m.total_fee) - Number(m.paid_amount))
}

export function membershipStatus(m) {
  const left = daysLeft(m.end_date)
  if (left < 0) return 'expired'
  if (left <= EXPIRING_DAYS) return 'expiring'
  return 'active'
}

export function formatDate(iso) {
  if (!iso) return '-'
  return parseISO(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatMoney(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

export function expiryText(endIso) {
  const left = daysLeft(endIso)
  if (left < 0) return `Expired ${-left} day${left === -1 ? '' : 's'} ago`
  if (left === 0) return 'Expires today'
  return `${left} day${left === 1 ? '' : 's'} left`
}
