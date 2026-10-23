import { useState } from 'react'
import { formatDate } from '../lib/utils'
import WhatsAppSupport from './WhatsAppSupport'
import GymLogo from './GymLogo'
import ThemeToggle from './ThemeToggle'
import { initiateSubscriptionPayment, RAZORPAY_ME_HANDLE_URL } from '../lib/razorpay'

export default function AccessBlocked({ gym, userEmail, onLogout, onRefresh }) {
  const [loadingPay, setLoadingPay] = useState(false)
  const [payError, setPayError] = useState('')
  const [paySuccess, setPaySuccess] = useState('')

  const isExpired = gym?.status === 'active' || Boolean(gym?.valid_until)
  const isBlocked = gym?.status === 'blocked'

  let title = 'Approval pending'
  let text = 'Your account has been created. You can use the app once the admin approves it or activate via subscription.'
  if (isBlocked) {
    title = 'Account blocked'
    text = 'Your account has been blocked by the administrator. Please contact support.'
  } else if (isExpired) {
    title = 'Subscription Expired'
    text = gym?.valid_until
      ? `Your access expired on ${formatDate(gym.valid_until)}. Renew now to continue managing your members without data loss.`
      : 'Your trial period has ended. Activate monthly subscription to continue.'
  } else if (!gym) {
    title = 'Account not found'
    text = 'No gym account is linked to this login.'
  }

  async function handlePay() {
    setPayError('')
    setPaySuccess('')
    setLoadingPay(true)

    await initiateSubscriptionPayment({
      gym,
      userEmail: userEmail || gym?.email,
      amount: 499,
      onSuccess: (data) => {
        setLoadingPay(false)
        setPaySuccess(data.message || 'Payment successful! Reactivating your account…')
        setTimeout(() => {
          if (onRefresh) onRefresh()
        }, 1200)
      },
      onError: (err) => {
        setLoadingPay(false)
        setPayError(err)
      },
    })
  }

  return (
    <div className="center-page">
      <div className="auth-theme-bar">
        <ThemeToggle size="sm" showLabel />
      </div>
      <div className="card auth-card" style={{ textAlign: 'center', maxWidth: '440px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
          <GymLogo size={56} />
        </div>
        <h2 style={{ margin: '4px 0 2px' }}>{title}</h2>
        <p className="muted small" style={{ marginBottom: '14px' }}>{text}</p>

        {gym && (
          <div
            style={{
              background: 'var(--card-subtle)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '10px',
              marginBottom: '16px',
            }}
          >
            <p className="small" style={{ margin: 0 }}>
              <b>{gym.gym_name || 'Your Gym'}</b> · {gym.email}
            </p>
          </div>
        )}

        {/* Razorpay Subscription Renewal Card for Expired or Pending Accounts */}
        {!isBlocked && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(29,78,216,0.03))',
              border: '1px solid rgba(37,99,235,0.3)',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '14px',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontWeight: 700, fontSize: '15px' }}>Monthly Gym Plan</span>
              <span className="badge blue" style={{ fontSize: '12px', fontWeight: 700 }}>₹499 / 30 Days</span>
            </div>
            <ul style={{ margin: '0 0 12px 18px', padding: 0, fontSize: '12.5px', color: 'var(--muted)' }}>
              <li>Unlimited members, attendance & billing</li>
              <li>Paper register notebook scanner</li>
              <li>Automated payment dues & WhatsApp alerts</li>
            </ul>

            {payError && <div className="alert error small" style={{ marginBottom: '10px' }}>{payError}</div>}
            {paySuccess && <div className="alert success small" style={{ marginBottom: '10px' }}>{paySuccess}</div>}

            <button
              type="button"
              className="btn primary full"
              onClick={handlePay}
              disabled={loadingPay}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '11px',
                fontWeight: 600,
              }}
            >
              {loadingPay ? (
                'Connecting to Razorpay…'
              ) : (
                <>
                  <span>💳 Pay ₹499 via Razorpay / UPI</span>
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <a
                href={RAZORPAY_ME_HANDLE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="muted small"
                style={{ textDecoration: 'underline' }}
              >
                Or pay directly via UPI / QR (@sanjaysalvi2245)
              </a>
            </div>
          </div>
        )}

        <button className="btn full" style={{ marginBottom: '8px' }} onClick={onRefresh}>
          🔄 Refresh Account Status
        </button>
        <WhatsAppSupport label="Need Help? Contact Admin via WhatsApp" className="full" />
        <button className="btn secondary full" style={{ marginTop: '8px' }} onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  )
}
