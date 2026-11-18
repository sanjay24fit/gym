import { formatDate } from './utils.js'

/**
 * Builds the polite Hindi / Hinglish WhatsApp expiry reminder message:
 * "Aapki membership khatam hone wali hai"
 */
export function buildExpiryReminderText({
  memberName,
  gymName,
  endDate,
  daysLeftCount = 2,
  ownerPhone = '',
}) {
  const daysText =
    daysLeftCount === 2
      ? '2 din baad'
      : daysLeftCount === 1
      ? 'kal'
      : daysLeftCount === 0
      ? 'aaj'
      : `${daysLeftCount} din me`

  const dateStr = formatDate(endDate)
  const safeGymName = gymName || 'Fitness Club'
  const safeMemberName = memberName ? `${memberName} ji` : 'Member ji'

  return (
    `Namaste ${safeMemberName}! 🏋️‍♂️\n\n` +
    `Aapki *${safeGymName}* ki gym membership ${daysText} (${dateStr}) ko *khatam hone wali hai*.\n\n` +
    `Apni regular workout aur fitness journey ko uninterrupted rakhne ke liye kripya samay par apni membership renew karwayein.\n\n` +
    `Kripya gym counter par visit karein ya online renew karein.\n\n` +
    `Dhanyawad,\n` +
    `*${safeGymName}*` +
    (ownerPhone ? `\n📞 Helpline: ${ownerPhone}` : '')
  )
}

/**
 * Normalizes phone number into international format for WhatsApp wa.me link:
 * Handles 10-digit Indian numbers (prepends 91) and cleans non-digits.
 */
export function formatPhoneForWhatsApp(phone) {
  if (!phone) return ''
  const digits = String(phone).replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return digits
  return digits
}

/**
 * Builds direct WhatsApp URL to message member's registered phone number:
 * https://wa.me/91XXXXXXXXXX?text=...
 */
export function buildWhatsAppReminderUrl({
  phone,
  memberName,
  gymName,
  endDate,
  daysLeftCount = 2,
  ownerPhone = '',
}) {
  const waPhone = formatPhoneForWhatsApp(phone)
  const message = buildExpiryReminderText({
    memberName,
    gymName,
    endDate,
    daysLeftCount,
    ownerPhone,
  })

  if (waPhone) {
    return `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`
  }
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

/**
 * Checks if a WhatsApp reminder has already been marked as sent today
 * for this member's current expiry date.
 */
export function isReminderSent(memberId, endDate) {
  if (!memberId || !endDate) return false
  const key = `wa_expiry_rem_${memberId}_${endDate}`
  return Boolean(localStorage.getItem(key))
}

/**
 * Marks a WhatsApp reminder as sent in localStorage with timestamp.
 */
export function markReminderSent(memberId, endDate) {
  if (!memberId || !endDate) return
  const key = `wa_expiry_rem_${memberId}_${endDate}`
  localStorage.setItem(key, new Date().toISOString())
}
