import { supabase } from './supabase'

export const RAZORPAY_ME_BASE_URL = 'https://razorpay.me/@gymmanagerapk'
export const DEFAULT_SUBSCRIPTION_AMOUNT = 499

/**
 * Returns the verified Razorpay.me UPI payment handle URL.
 * Note: razorpay.me/@handle endpoints reject query parameters with
 * "Amount not valid. Please contact the merchant for assistance."
 * Therefore the handle URL is kept clean, and the amount to enter
 * is displayed to the user in the UI and instructions.
 *
 * @param {number|string} [amount=499] - Plan amount in Rupees (e.g. 499, 2499, 4499)
 * @returns {string} e.g. 'https://razorpay.me/@gymmanagerapk'
 */
export function getRazorpayMeUrl(_amount = DEFAULT_SUBSCRIPTION_AMOUNT) {
  return RAZORPAY_ME_BASE_URL
}

export const RAZORPAY_ME_HANDLE_URL = RAZORPAY_ME_BASE_URL

/**
 * Dynamically loads Razorpay checkout SDK if not already in window
 */
export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false)
      return
    }
    if (window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

/**
 * Initiates Razorpay payment for Gym Subscription
 * Supports 1 Month (₹499), 6 Months (₹2,499), and 12 Months (₹4,499)
 *
 * @param {Object} options
 * @param {Object} options.gym - Gym record object (id, gym_name, phone, email)
 * @param {string} options.userEmail - Logged-in user's email
 * @param {number} [options.amount=499] - Amount in rupees
 * @param {number} [options.planDays=30] - Plan duration in days (30, 180, 365)
 * @param {string} [options.planId='monthly'] - Plan ID identifier
 * @param {string} [options.planTitle='Monthly Plan'] - Readable title for Razorpay modal
 * @param {Function} options.onSuccess - Callback on verified payment (data) => void
 * @param {Function} options.onError - Callback on error (errMsg) => void
 */
export async function initiateSubscriptionPayment({
  gym,
  userEmail,
  amount = DEFAULT_SUBSCRIPTION_AMOUNT,
  planDays = 30,
  planId = 'monthly',
  planTitle = 'Monthly Plan',
  onSuccess,
  onError,
}) {
  try {
    const numericAmount = Math.round(Number(amount)) || DEFAULT_SUBSCRIPTION_AMOUNT
    const directFallbackUrl = getRazorpayMeUrl(numericAmount)

    const isScriptLoaded = await loadRazorpayScript()
    if (!isScriptLoaded) {
      throw new Error('Could not load Razorpay payment SDK. Please check your internet connection.')
    }

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    if (!token) {
      throw new Error('Please login to continue with payment.')
    }

    // 1. Call backend serverless route to create order
    let orderRes
    try {
      orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: numericAmount,
          currency: 'INR',
          plan: planId,
        }),
      })
    } catch (fetchErr) {
      throw new Error(`Unable to connect to payment server: ${fetchErr.message}`)
    }

    let orderData = null
    try {
      const text = await orderRes.text()
      orderData = text ? JSON.parse(text) : null
    } catch {
      orderData = null
    }

    if (!orderRes.ok || !orderData) {
      const isConfigIssue =
        orderRes.status === 503 ||
        orderRes.status === 500 ||
        orderRes.status === 404 ||
        Boolean(orderData?.isConfigIssue)

      const friendlyError = isConfigIssue
        ? 'Online payment is temporarily unavailable. Please use the Direct UPI / QR option.'
        : (orderData?.error || 'Payment order creation failed. Please try again or use Direct UPI / QR.')

      const paymentErr = new Error(friendlyError)
      paymentErr.isConfigIssue = isConfigIssue
      paymentErr.fallbackUrl = orderData?.fallbackUrl || directFallbackUrl
      paymentErr.status = orderRes.status
      throw paymentErr
    }

    const { orderId, keyId, gymName: serverGymName } = orderData

    // Use gym's name or fallback to 'Gym Manager'
    const businessTitle = gym?.gym_name || serverGymName || 'Gym Manager'
    const amountInPaise = orderData.amount || (numericAmount * 100)

    // 2. Open Razorpay Checkout Modal with exact order amount in paise
    const rzpOptions = {
      key: keyId,
      amount: amountInPaise,
      currency: orderData.currency || 'INR',
      name: businessTitle, // Display name at the top of Razorpay payment page
      description: `${businessTitle} · ${planTitle} (₹${numericAmount.toLocaleString('en-IN')})`,
      image: '/gym-logo.png',
      order_id: orderId,
      prefill: {
        name: gym?.owner_name || gym?.gym_name || '',
        email: userEmail || gym?.email || '',
        contact: gym?.phone || '',
      },
      notes: {
        business_name: businessTitle,
        gym_id: gym?.id,
        gym_name: businessTitle,
        plan_id: planId,
        plan_days: String(planDays),
        amount_rupees: String(numericAmount),
        platform: 'Gym Manager',
      },
      theme: {
        color: '#FF6200', // Athletic Electric Orange Theme
      },
      handler: async function (response) {
        try {
          // 3. Verify payment signature on backend
          let verifyRes
          try {
            verifyRes = await fetch('/api/payments/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })
          } catch (netErr) {
            throw new Error(`Payment succeeded, but could not contact verification server: ${netErr.message}`)
          }

          let verifyData = null
          try {
            const vText = await verifyRes.text()
            verifyData = vText ? JSON.parse(vText) : null
          } catch {
            verifyData = null
          }

          if (!verifyRes.ok || !verifyData?.success) {
            throw new Error(verifyData?.error || 'Payment verification failed.')
          }

          if (onSuccess) onSuccess(verifyData)
        } catch (err) {
          console.error('Verification error:', err)
          if (onError) onError(err.message || 'Payment verification failed.')
        }
      },
      modal: {
        ondismiss: function () {
          console.log('Payment modal dismissed by user.')
        },
      },
    }

    const rzp = new window.Razorpay(rzpOptions)
    rzp.on('payment.failed', function (response) {
      console.error('Razorpay payment failed:', response.error)
      if (onError) {
        onError(response.error.description || 'Payment was unsuccessful. Please try again.')
      }
    })
    rzp.open()
  } catch (err) {
    console.error('Initiate payment error:', err)
    if (onError) {
      onError(err.message || 'Could not initiate payment.', {
        isConfigIssue: Boolean(err.isConfigIssue),
        fallbackUrl: err.fallbackUrl || getRazorpayMeUrl(),
      })
    }
  }
}
