import { useState } from 'react'
import { formatDate, today } from '../lib/utils'
import { isBlockedGym, isExpiredGym, isTrialGym } from '../lib/access'
import WhatsAppSupport from './WhatsAppSupport'
import GymLogo from './GymLogo'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'
import Modal from './Modal'
import { initiateSubscriptionPayment, RAZORPAY_ME_HANDLE_URL } from '../lib/razorpay'

export default function AccessBlocked({ gym, userEmail, onLogout, onRefresh }) {
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [loadingPay, setLoadingPay] = useState(false)
  const [payError, setPayError] = useState('')
  const [paySuccess, setPaySuccess] = useState('')

  // Account state derived from status + dates (T01 AB1: predicate fixed) using
  // the shared access predicates (src/lib/access.js) that mirror SQL is_usable().
  // AccessBlocked only renders when the gym is not usable (App.jsx canUseGym gate).
  const isBlocked = isBlockedGym(gym)
  const isExpired = isExpiredGym(gym, today())
  // D3: trial vs paid comes from the explicit DB field written by the backend —
  // the signup trigger sets subscription_status = 'trial' (21-day trial) and
  // payment verification sets it to 'active' (verify-payment.js). No heuristic;
  // rows without the field (legacy accounts) are treated as paid/not-trial.
  const isTrial = isTrialGym(gym)

  let title = 'Approval pending'
  let text = 'Your account has been created. You can use the app once the admin approves it, or activate it via subscription.'
  if (!gym) {
    title = 'Account not found'
    text = 'No gym account is linked to this login.'
  } else if (isBlocked) {
    title = 'Account blocked'
    text = 'Your account has been blocked by the administrator. Please contact support.'
  } else if (isExpired && isTrial) {
    title = 'Free Trial Ended'
    text = `Your 21-day free trial ended on ${formatDate(gym.valid_until)}. Subscribe to the monthly plan to continue managing your members without data loss.`
  } else if (isExpired) {
    title = 'Subscription Expired'
    text = `Your access expired on ${formatDate(gym.valid_until)}. Renew now to continue managing your members without data loss.`
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
        <LanguageToggle size="sm" />
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
              background: 'var(--pastel-mint-bg)',
              border: '1px solid var(--pastel-mint-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '18px',
              marginBottom: '16px',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontWeight: 700, fontSize: '15px' }}>Monthly Gym Plan</span>
              <span className="badge blue" style={{ fontSize: '12px', fontWeight: 700 }}>₹499 / 30 Days</span>
            </div>
            <ul style={{ margin: '0 0 12px 18px', padding: 0, fontSize: '12.5px', color: 'var(--muted)' }}>
              <li>Unlimited members & billing</li>
              <li>Paper register notebook scanner</li>
              <li>Payment dues tracking & WhatsApp support</li>
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
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                  <span>Pay ₹499 via Razorpay / UPI</span>
                </span>
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
                Or pay directly via UPI / QR (Gym Manager)
              </a>
            </div>
          </div>
        )}

        <button className="btn full" style={{ marginBottom: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={onRefresh}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 21h5v-5" />
          </svg>
          <span>Refresh Account Status</span>
        </button>
        <WhatsAppSupport label="Need Help? Contact Admin via WhatsApp" className="full" />
        <button className="btn secondary full" style={{ marginTop: '8px' }} onClick={() => setShowLogoutModal(true)}>
          Logout
        </button>
      </div>

      {showLogoutModal && (
        <Modal title="Confirm Sign Out" onClose={() => setShowLogoutModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.5, color: 'var(--text)' }}>
              Are you sure you want to log out?
            </p>
            <div className="modal-actions" style={{ marginTop: '16px' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn danger-solid"
                onClick={() => {
                  setShowLogoutModal(false)
                  onLogout()
                }}
              >
                Log Out
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
