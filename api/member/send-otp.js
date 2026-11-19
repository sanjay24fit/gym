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

    const apiKey =
      process.env.FAST2SMS_API_KEY ||
      process.env.VITE_FAST2SMS_API_KEY ||
      'tHzSYs4RHChQmjElGk6h46AaRClQTKFiYmi38HPzQ6zofPWbSzSQJ13Ibn5gkJIubibkt7hTXMDP412I'

    const smsRes = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': apiKey,
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
