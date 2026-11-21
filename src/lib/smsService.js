/**
 * Mobile OTP Delivery Service
 * Securely routes OTP dispatch through the backend API (/api/member/send-otp).
 * Keeps authorization keys hidden from client-side bundles and browser network inspect.
 */

export async function sendMobileOtp({ phone, otp }) {
  const cleanPhone = String(phone).replace(/\D/g, '').slice(-10)
  if (!cleanPhone || cleanPhone.length < 10) {
    return { success: false, error: 'Please enter a valid 10-digit mobile number.' }
  }

  try {
    const res = await fetch('/api/member/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleanPhone, otp }),
    })

    const data = await res.json().catch(() => ({}))

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

    return {
      success: false,
      error: data.error || data.message || 'Failed to dispatch SMS OTP.',
    }
  } catch (_err) {
    return {
      success: false,
      error: 'Unable to connect to SMS delivery service. Please try Quick Pass or contact support.',
    }
  }
}
