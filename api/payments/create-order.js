import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET

    if (!razorpayKeyId || !razorpayKeySecret) {
      return res.status(500).json({
        error: 'Razorpay keys not configured on server. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel environment variables.',
        fallbackUrl: 'https://razorpay.me/@sanjaysalvi2245',
      })
    }

    // Verify authenticated user with Supabase
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: missing authorization token' })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized: invalid token' })
    }

    const { amount = 499, currency = 'INR', plan = 'monthly' } = req.body || {}
    const amountInPaise = Math.round(Number(amount) * 100) // ₹499 = 49900 paise

    // Create Razorpay Order via REST API
    const authString = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64')
    const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${authString}`,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: currency,
        receipt: `receipt_gym_${user.id.slice(0, 8)}_${Date.now()}`,
        notes: {
          gym_id: user.id,
          user_email: user.email,
          plan: plan,
          platform: 'GymManager',
          handle: 'sanjaysalvi2245',
        },
      }),
    })

    const orderData = await rzpResponse.json()

    if (!rzpResponse.ok) {
      return res.status(rzpResponse.status).json({
        error: orderData.error?.description || 'Failed to create Razorpay order',
        details: orderData,
      })
    }

    return res.status(200).json({
      orderId: orderData.id,
      amount: orderData.amount,
      currency: orderData.currency,
      keyId: razorpayKeyId,
      gymId: user.id,
    })
  } catch (err) {
    console.error('Error creating Razorpay order:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
