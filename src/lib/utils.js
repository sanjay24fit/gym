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

// Schema-drift detection shared by the member-save and scanner-import flows
// (T01 M6): older Supabase deployments may lack the optional
// facility / personal_trainer / trainer_name columns.
export function isSchemaDriftError(error) {
  if (!error) return false
  return (
    error.message?.includes('schema cache') ||
    error.message?.includes('facility') ||
    error.message?.includes('personal_trainer') ||
    error.message?.includes('trainer_name') ||
    error.code === 'PGRST204'
  )
}

// Fallback payload for older Supabase deployments: base columns only, with
// facility / PT re-encoded into notes tags so getMemberFacility(),
// hasPersonalTrainer() and getTrainerName() can still recover them from notes.
// Mirrors the original Members.jsx fallback exactly.
export function buildFallbackMemberValues(values) {
  const ptTag = values.personal_trainer
    ? `[PT: Yes${values.trainer_name ? ` | Trainer: ${values.trainer_name}` : ''}]`
    : ''
  const facilityTag = `[Facility: ${values.facility || 'Gym & Fitness'}]`

  const cleanNotes = (values.notes || '')
    .replace(/\[Facility:[^\]]*\]/gi, '')
    .replace(/\[PT:[^\]]*\]/gi, '')
    .trim()
  const fallbackNotes = `${cleanNotes} ${facilityTag} ${ptTag}`.trim()

  return {
    name: values.name,
    phone: values.phone,
    plan: values.plan,
    start_date: values.start_date,
    end_date: values.end_date,
    total_fee: values.total_fee,
    paid_amount: values.paid_amount,
    notes: fallbackNotes,
  }
}

// Shared collection-rate metric used by both Dashboard and Payments:
// percentage of expected revenue (collected + outstanding due) that has been collected.
// Truthful zero for an empty gym (no members, no expected revenue).
export function collectionRate(members) {
  const collected = members.reduce((s, m) => s + Number(m.paid_amount || 0), 0)
  const due = members.reduce((s, m) => s + dueAmount(m), 0)
  const expected = collected + due
  return expected > 0 ? Math.min(100, Math.round((collected / expected) * 100)) : 0
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
