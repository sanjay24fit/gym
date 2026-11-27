import { createClient } from '@supabase/supabase-js'
import { planForAmountPaise } from './policy.js'

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()

    const { amount = 1, currency = 'INR', plan: requestedPlan = 'monthly' } = req.body || {}
    const numericAmount = Math.round(Number(amount)) || 1
    const amountInPaise = numericAmount * 100 // e.g. ₹1 -> 100 paise, ₹499 -> 49900 paise, ₹2,499 -> 249900 paise, ₹4,499 -> 449900 paise
    // Note: razorpay.me handles reject query parameters with "Amount not valid" error.
    // The handle URL must be kept clean without ?amount= query parameters.
    const dynamicFallbackUrl = 'https://razorpay.me/@gymmanagerapk'

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET

    const isPlaceholderKey =
      !razorpayKeyId ||
      !razorpayKeySecret ||
      razorpayKeySecret === 'YOUR-RAZORPAY-KEY-SECRET' ||
      razorpayKeySecret.startsWith('YOUR-') ||
      razorpayKeyId.includes('xxxx')

    if (isPlaceholderKey) {
      console.warn('[Payments] Razorpay API keys are not configured or using placeholders. Returning graceful fallback.')
      return res.status(503).json({
        error: 'Online payment is temporarily unavailable. Please use the Direct UPI / QR option.',
        isConfigIssue: true,
        fallbackUrl: dynamicFallbackUrl,
        amount: amountInPaise,
        amountInRupees: numericAmount,
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

    // Fetch gym details to use gym_name as the display merchant name
    const { data: gym } = await supabase
      .from('gyms')
      .select('gym_name, owner_name, phone')
      .eq('id', user.id)
      .maybeSingle()

    const gymName = gym?.gym_name || 'Gym Manager'

    // Server-side plan gate (D1): orders can only be created for published
    // catalog plans — a client cannot order an arbitrary amount and later
    // claim a longer plan at verification time.
    const plan = planForAmountPaise(amountInPaise)
    if (!plan) {
      return res.status(400).json({
        error: `Unsupported plan amount ₹${numericAmount}. Supported plans: ₹1 / ₹499 (1 Month), ₹2,499 (6 Months), ₹4,499 (12 Months).`,
        fallbackUrl: dynamicFallbackUrl,
      })
    }

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
          merchant_name: gymName,
          gym_name: gymName,
          gym_id: user.id,
          user_email: user.email,
          plan: plan.planId,
          platform: 'Gym Manager',
        },
      }),
    })

    const orderData = await rzpResponse.json()

    if (!rzpResponse.ok) {
      return res.status(rzpResponse.status).json({
        error: orderData.error?.description || 'Failed to create Razorpay order',
        details: orderData,
        fallbackUrl: dynamicFallbackUrl,
      })
    }

    return res.status(200).json({
      orderId: orderData.id,
      amount: orderData.amount, // in paise from Razorpay (49900, 249900, 449900)
      amountInRupees: numericAmount,
      currency: orderData.currency || 'INR',
      keyId: razorpayKeyId,
      gymId: user.id,
      gymName: gymName,
    })
  } catch (err) {
    console.error('Error creating Razorpay order:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
