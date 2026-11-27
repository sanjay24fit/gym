/**
 * Serverless Handler: Secure Fast2SMS OTP Dispatch
 * Enforces server-side secret isolation and anti-spam rate limiting.
 */

// In-memory sliding window rate limiter
const requestHistory = new Map()

function isRateLimited(key, maxRequests = 4, windowMs = 5 * 60 * 1000) {
  const now = Date.now()
  const history = requestHistory.get(key) || []
  const validHistory = history.filter((time) => now - time < windowMs)

  if (validHistory.length >= maxRequests) {
    return true
  }

  validHistory.push(now)
  requestHistory.set(key, validHistory)

  // Periodic memory cleanup
  if (requestHistory.size > 2000) {
    for (const [k, times] of requestHistory.entries()) {
      if (times.every((t) => now - t > windowMs)) {
        requestHistory.delete(k)
      }
    }
  }

  return false
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { phone, otp } = req.body || {}
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone number and OTP code are required.' })
    }

    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10)
    if (cleanPhone.length < 10) {
      return res.status(400).json({ error: 'Invalid 10-digit mobile number.' })
    }

    // Rate Limiting: Max 4 OTPs per phone number per 5 minutes
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'ip'
    if (isRateLimited(`phone:${cleanPhone}`, 4, 300000) || isRateLimited(`ip:${clientIp}`, 10, 300000)) {
      return res.status(429).json({
        success: false,
        error: 'Too many OTP requests. Please wait a few minutes before trying again.',
      })
    }

    const apiKey = process.env.FAST2SMS_API_KEY

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'SMS service is not configured on the server.',
      })
    }

    const smsRes = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'q',
        message: `Your Gym Manager login verification code is: ${otp}. Valid for 5 minutes. Do not share with anyone.`,
        language: 'english',
        numbers: cleanPhone,
      }),
    })

    const data = await smsRes.json()

    if (data.return) {
      return res.status(200).json({
        success: true,
        message: 'SMS OTP sent to mobile successfully.',
      })
    }

    if (data.status_code === 999) {
      return res.status(400).json({
        success: false,
        code: 'PAYMENT_REQUIRED',
        error:
          'Fast2SMS API route activate karne ke liye Fast2SMS dashboard me "+ Add Amount" se ₹100 ka one-time recharge zaroori hai.',
      })
    }

    return res.status(400).json({
      success: false,
      error: data.message || 'Failed to send SMS OTP.',
    })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
