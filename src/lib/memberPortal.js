import { supabase } from './supabase'

const MEMBER_STORAGE_KEY = 'gym_member_session'
const WATER_STORAGE_KEY_PREFIX = 'gym_member_water_'

/**
 * Normalizes input phone string to 10 digits
 */
export function normalizePhone(raw) {
  if (!raw) return ''
  let digits = String(raw).replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2)
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1)
  }
  return digits
}

/**
 * Looks up member records by phone from Supabase RPC or API fallback
 */
export async function lookupMemberPortal(phone) {
  const cleanPhone = normalizePhone(phone)
  if (!cleanPhone || cleanPhone.length < 10) {
    return { success: false, error: 'Please enter a valid 10-digit mobile number' }
  }

  try {
    // 1. Primary: Direct Supabase RPC
    const { data, error } = await supabase.rpc('get_member_portal_data', {
      member_phone: cleanPhone,
    })

    if (!error && data) {
      if (!data.memberships || data.memberships.length === 0) {
        return {
          success: false,
          error: 'No gym membership found for this mobile number. Please confirm with your gym owner.',
        }
      }
      return { success: true, memberships: data.memberships }
    }

    // 2. Secondary: If RPC not found or blocked, try /api/member/lookup
    try {
      const resp = await fetch('/api/member/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      })
      if (resp.ok) {
        const apiData = await resp.json()
        if (apiData.memberships && apiData.memberships.length > 0) {
          return { success: true, memberships: apiData.memberships }
        }
      }
    } catch {
      // Fallback request ignored, handle via RPC error below
    }

    if (error) {
      if (error.code === 'PGRST202' || (error.message?.includes('function') && error.message?.includes('not found'))) {
        return {
          success: false,
          error: 'Member Portal database function not found. Gym Owner needs to run migration "20261107000000_add_member_portal.sql" in Supabase SQL editor.',
        }
      }
      return { success: false, error: `Database error: ${error.message || error.code || 'Lookup failed'}` }
    }

    return {
      success: false,
      error: 'No active membership found for this mobile number.',
    }
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Network error while looking up membership.',
    }
  }
}

/**
 * Session persistence helpers
 */
export function getStoredMemberSession() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(MEMBER_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setStoredMemberSession(sessionData) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(MEMBER_STORAGE_KEY, JSON.stringify(sessionData))
  } catch (err) {
    console.warn('Could not store member session:', err)
  }
}

export function clearMemberSession() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(MEMBER_STORAGE_KEY)
  } catch (err) {
    console.warn('Could not clear member session:', err)
  }
}

/**
 * BMI Calculator helpers
 */
export function calculateBmi(weightKg, heightCm) {
  const w = parseFloat(weightKg)
  const h = parseFloat(heightCm) / 100
  if (!w || !h || w <= 0 || h <= 0) return null
  const bmi = w / (h * h)
  return Math.round(bmi * 10) / 10
}

export function getBmiCategory(bmi) {
  if (!bmi || bmi <= 0) return null
  if (bmi < 18.5) return { label: 'Underweight', tone: 'amber', tip: 'Focus on caloric surplus and strength training to build lean muscle mass.' }
  if (bmi < 25) return { label: 'Healthy & Normal', tone: 'green', tip: 'Great shape! Maintain balanced nutrition and consistent workout intensity.' }
  if (bmi < 30) return { label: 'Overweight', tone: 'amber', tip: 'Aim for a slight calorie deficit combined with resistance training and cardio.' }
  return { label: 'Obese', tone: 'red', tip: 'Prioritize a structured workout plan, whole foods, and consultation with your gym trainer.' }
}

/**
 * Daily Water Tracker helpers (resets each day)
 */
export function getTodayDateKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function getWaterIntakeToday() {
  if (typeof window === 'undefined') return 0
  try {
    const key = WATER_STORAGE_KEY_PREFIX + getTodayDateKey()
    const val = parseInt(localStorage.getItem(key), 10)
    return isNaN(val) ? 0 : Math.min(8, Math.max(0, val))
  } catch {
    return 0
  }
}

export function setWaterIntakeToday(glasses) {
  if (typeof window === 'undefined') return
  try {
    const key = WATER_STORAGE_KEY_PREFIX + getTodayDateKey()
    localStorage.setItem(key, String(Math.min(8, Math.max(0, glasses))))
  } catch (err) {
    console.warn('Could not save water intake:', err)
  }
}

/**
 * Generate UPI deep-link for instant mobile payments
 */
export function generateMemberUpiUri(gymPhone, gymName, amount, memberName) {
  const cleanPhone = normalizePhone(gymPhone)
  const encodedName = encodeURIComponent(gymName || 'Gym Fees')
  const note = encodeURIComponent(`Gym Fee - ${memberName || 'Member'}`)
  // Standard UPI format; if phone is available, standard vpa fallback like phone@upi
  const pa = cleanPhone ? `${cleanPhone}@upi` : ''
  const amtParam = amount ? `&am=${encodeURIComponent(amount)}` : ''
  return `upi://pay?pa=${pa}&pn=${encodedName}&tn=${note}${amtParam}&cu=INR`
}

