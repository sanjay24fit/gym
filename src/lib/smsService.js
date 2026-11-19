/**
 * Fast2SMS Mobile OTP Delivery Service
 * Sends real 6-digit SMS OTP directly to Indian telecom mobile numbers (+91)
 */

const DEFAULT_FAST2SMS_KEY = 'tHzSYs4RHChQmjElGk6h46AaRClQTKFiYmi38HPzQ6zofPWbSzSQJ13Ibn5gkJIubibkt7hTXMDP412I'

export async function sendMobileOtp({ phone, otp }) {
  const cleanPhone = String(phone).replace(/\D/g, '').slice(-10)
  if (!cleanPhone || cleanPhone.length < 10) {
    return { success: false, error: 'Please enter a valid 10-digit mobile number.' }
  }

  // 1. Try serverless backend route first
  try {
    const res = await fetch('/api/member/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleanPhone, otp }),
    })
    const data = await res.json()
    if (res.ok && data.success) {
      return { success: true, message: 'OTP sent to mobile successfully.' }
    }
    if (data.code === 'PAYMENT_REQUIRED') {
      return {
        success: false,
        code: 'PAYMENT_REQUIRED',
        error: data.error,
      }
    }
  } catch {
    // Continue to direct Fast2SMS call if local serverless route is not running
  }

  // 2. Direct Fast2SMS API call fallback
  try {
    const apiKey =
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FAST2SMS_API_KEY) ||
      DEFAULT_FAST2SMS_KEY

    const directRes = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'q',
        message: `Your Gym Manager login verification code is: ${otp}. Valid for 5 minutes.`,
        language: 'english',
        numbers: cleanPhone,
      }),
    })

    const directData = await directRes.json()

    if (directData.return) {
      return { success: true, message: 'SMS OTP sent to your phone.' }
    }

    if (directData.status_code === 999) {
      return {
        success: false,
        code: 'PAYMENT_REQUIRED',
        error:
          'Fast2SMS API route activate karne ke liye Fast2SMS dashboard me "+ Add Amount" se ₹100 ka one-time recharge karein.',
      }
    }

    return {
      success: false,
      error: directData.message || 'Failed to dispatch SMS OTP.',
    }
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Network error while sending SMS OTP.',
    }
  }
}
