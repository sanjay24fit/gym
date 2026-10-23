import { supabase } from './supabase'

export const RAZORPAY_ME_HANDLE_URL = 'https://razorpay.me/@sanjaysalvi2245'
export const DEFAULT_SUBSCRIPTION_AMOUNT = 499

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
 * Initiates Razorpay payment for Gym Subscription (₹499/month)
 *
 * @param {Object} options
 * @param {Object} options.gym - Gym record object (id, gym_name, phone, email)
 * @param {string} options.userEmail - Logged-in user's email
 * @param {number} [options.amount=499] - Amount in rupees
 * @param {Function} options.onSuccess - Callback on verified payment (data) => void
 * @param {Function} options.onError - Callback on error (errMsg) => void
 */
export async function initiateSubscriptionPayment({
  gym,
  userEmail,
  amount = DEFAULT_SUBSCRIPTION_AMOUNT,
  onSuccess,
  onError,
}) {
  try {
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
    const orderRes = await fetch('/api/payments/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount,
        currency: 'INR',
        plan: 'monthly',
      }),
    })

    const orderData = await orderRes.json()

    if (!orderRes.ok) {
      // If serverless is not reachable or keys not configured yet, offer direct handle fallback
      if (orderData.fallbackUrl || orderRes.status === 404 || orderRes.status === 500) {
        const proceedDirect = window.confirm(
          `Razorpay automated gateway notice: ${orderData.error || 'Server API not connected yet'}.\n\nWould you like to pay directly via UPI / QR at ${RAZORPAY_ME_HANDLE_URL}?`
        )
        if (proceedDirect) {
          window.open(RAZORPAY_ME_HANDLE_URL, '_blank', 'noopener,noreferrer')
        }
      }
      throw new Error(orderData.error || 'Failed to create payment order.')
    }

    const { orderId, keyId } = orderData

    // 2. Open Razorpay Checkout Modal
    const rzpOptions = {
      key: keyId,
      amount: orderData.amount,
      currency: orderData.currency || 'INR',
      name: 'Gym Manager Portal',
      description: 'Monthly Gym Subscription (₹499 / 30 Days)',
      image: '/gym-logo.png',
      order_id: orderId,
      prefill: {
        name: gym?.owner_name || gym?.gym_name || '',
        email: userEmail || gym?.email || '',
        contact: gym?.phone || '',
      },
      notes: {
        gym_id: gym?.id,
        gym_name: gym?.gym_name,
        handle: 'sanjaysalvi2245',
      },
      theme: {
        color: '#2563eb', // Matches Gym Manager athletic blue accent
      },
      handler: async function (response) {
        try {
          // 3. Verify payment signature on backend
          const verifyRes = await fetch('/api/payments/verify-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan_days: 30,
              amount,
            }),
          })

          const verifyData = await verifyRes.json()

          if (!verifyRes.ok || !verifyData.success) {
            throw new Error(verifyData.error || 'Payment verification failed.')
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
    if (onError) onError(err.message || 'Could not initiate payment.')
  }
}
