/**
 * Comprehensive Email Validator & Existence Checker
 * Prevents signups with fake, non-existent, random, typo, or disposable email addresses.
 */

// Common typos of popular email providers
const COMMON_TYPOS = {
  'gamil.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmai.co': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmale.com': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'hotmial.com': 'hotmail.com',
  'hotmaill.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloook.com': 'outlook.com',
  'redifmail.com': 'rediffmail.com',
}

// Known disposable and temporary email domains
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  '10minutemail.net',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.biz',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'trashmail.com',
  'trashmail.net',
  'fakeinbox.com',
  'sharklasers.com',
  'getairmail.com',
  'throwawaymail.com',
  'dispostable.com',
  'tempail.com',
  'mohmal.com',
  'generator.email',
  'maildrop.cc',
  'inboxkitten.com',
  'nada.ltd',
  'getnada.com',
  'emailondeck.com',
  'mytemp.email',
  'fakemailgenerator.com',
  'burnermail.io',
  'crazymailing.com',
  'zillamail.com',
  'spambog.com',
  'mailcatch.com',
  'trashmail.ws',
])

/**
 * Validates email format, provider rules, disposable domains, and checks MX records via DoH.
 * @param {string} email
 * @returns {Promise<{ valid: boolean, error?: string, email?: string }>}
 */
export async function validateEmailAddress(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Please enter your email address.' }
  }

  const clean = email.trim().toLowerCase()

  // 1. Basic RFC 5322 compliant regex check
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
  if (!emailRegex.test(clean)) {
    return { valid: false, error: 'Please enter a valid email format (e.g. yourname@gmail.com).' }
  }

  const parts = clean.split('@')
  if (parts.length !== 2) {
    return { valid: false, error: 'Invalid email address structure.' }
  }

  const [username, domain] = parts

  if (!username || username.length < 3) {
    return { valid: false, error: 'Email username is too short.' }
  }

  if (!domain || !domain.includes('.')) {
    return { valid: false, error: 'Email domain must contain a valid extension (e.g. .com, .in).' }
  }

  // 2. Check for common domain typos
  if (COMMON_TYPOS[domain]) {
    return {
      valid: false,
      error: `Did you mean @${COMMON_TYPOS[domain]}? Please check the spelling of '${domain}'.`,
    }
  }

  // 3. Block known temporary and disposable domains
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      valid: false,
      error: 'Temporary and disposable email addresses are not allowed. Please enter your real email.',
    }
  }

  // 4. Strict rules for @gmail.com
  if (domain === 'gmail.com') {
    // Google rule: username must be 6 to 30 characters
    if (username.length < 6) {
      return {
        valid: false,
        error: 'Gmail username must be at least 6 characters long.',
      }
    }
    if (username.length > 30) {
      return {
        valid: false,
        error: 'Gmail username cannot exceed 30 characters.',
      }
    }
    // Google allows only letters, numbers, and periods
    if (!/^[a-z0-9.]+$/.test(username)) {
      return {
        valid: false,
        error: 'Gmail addresses can only contain letters (a-z), numbers (0-9), and periods (.).',
      }
    }
    // Cannot start or end with a period
    if (username.startsWith('.') || username.endsWith('.')) {
      return {
        valid: false,
        error: 'Gmail username cannot start or end with a period.',
      }
    }
    // Cannot contain consecutive periods
    if (username.includes('..')) {
      return {
        valid: false,
        error: 'Gmail username cannot contain consecutive periods (..).',
      }
    }
    // Detect keyboard mashing / random gibberish (7+ consecutive consonants)
    if (/[bcdfghjklmnpqrstvwxyz]{7,}/i.test(username)) {
      return {
        valid: false,
        error: 'This email appears to be random or invalid. Please use your genuine email address.',
      }
    }
  }

  // 5. Live DNS MX Verification via Google DNS-over-HTTPS (DoH)
  // Ensures the domain actually exists and has active mail servers to receive emails
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2500)

    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, {
      signal: controller.signal,
      headers: { Accept: 'application/dns-json' },
    })
    clearTimeout(timeoutId)

    if (res.ok) {
      const data = await res.json()
      // Status 3 is NXDOMAIN (domain does not exist)
      if (data.Status === 3) {
        return {
          valid: false,
          error: `The email domain '@${domain}' does not exist. Please enter a real email address.`,
        }
      }
      // If Answer is missing or has no MX records
      if (data.Status === 0 && (!data.Answer || data.Answer.length === 0)) {
        return {
          valid: false,
          error: `The domain '@${domain}' cannot receive emails. Please use a standard email provider like Gmail.`,
        }
      }
    }
  } catch {
    // If offline or network timeout, do not block user if format is valid
  }

  return { valid: true, email: clean }
}
