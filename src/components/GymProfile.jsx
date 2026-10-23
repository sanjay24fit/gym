import { useState } from 'react'
import { formatDate, daysLeft } from '../lib/utils'
import { supabase } from '../lib/supabase'
import WhatsAppSupport from './WhatsAppSupport'
import Modal from './Modal'
import { useTheme } from '../lib/theme'
import LanguageToggle from './LanguageToggle'
import { initiateSubscriptionPayment, RAZORPAY_ME_HANDLE_URL } from '../lib/razorpay'

export default function GymProfile({ gym, userEmail, onLogout, onDownloadApp, isInstalled, onRefresh }) {
  const { theme, setTheme } = useTheme()
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')
  const [paySuccess, setPaySuccess] = useState('')

  const validUntil = gym?.valid_until
  const daysRemaining = validUntil ? daysLeft(validUntil) : null

  async function handlePasswordSubmit(e) {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    setPasswordLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordLoading(false)

    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordSuccess('Password successfully updated!')
      setTimeout(() => {
        setShowPasswordModal(false)
        setNewPassword('')
        setConfirmPassword('')
        setPasswordSuccess('')
      }, 1500)
    }
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div className="section-head" style={{ marginBottom: '16px' }}>
        <div>
          <h2>Gym & Account Settings</h2>
          <span className="muted small">Manage your gym profile and subscription status</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Gym Identity Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: 'var(--primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: 700,
              }}
            >
              {gym?.gym_name ? gym.gym_name.slice(0, 2).toUpperCase() : 'GM'}
            </div>
            <div>
              <h3 style={{ margin: 0 }}>{gym?.gym_name || 'Gym Manager'}</h3>
              <span className="muted small block">Owner: {gym?.owner_name || 'Owner'}</span>
            </div>
          </div>

          <div className="row" style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
            <div>
              <span className="small muted block">Login Email:</span>
              <b>{userEmail || gym?.email}</b>
            </div>
            <div>
              <span className="small muted block">Contact Phone:</span>
              <b>{gym?.phone || 'Not provided'}</b>
            </div>
          </div>
        </div>

        {/* Subscription & Validity Card */}
        <div className="card">
          <div className="section-head" style={{ marginBottom: '10px' }}>
            <h4>Subscription Status</h4>
            <span className={`badge ${daysRemaining !== null && daysRemaining <= 0 ? 'red' : 'green'}`}>
              ● {daysRemaining !== null && daysRemaining <= 0 ? 'Expired' : 'Active Plan'}
            </span>
          </div>

          <p className="small muted" style={{ marginBottom: '14px' }}>
            Your Gym Manager subscription gives you unlimited members, paper register scanning, and automated expiry tracking.
          </p>

          <div className="row" style={{ background: 'var(--card-subtle)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '14px' }}>
            <div>
              <span className="small muted block">Plan Valid Until:</span>
              <b>{validUntil ? formatDate(validUntil) : 'Unlimited Access'}</b>
            </div>
            <div>
              <span className="small muted block">Remaining Days:</span>
              <b>{daysRemaining !== null ? (daysRemaining >= 0 ? `${daysRemaining} days remaining` : 'Expired') : 'No expiry limit'}</b>
            </div>
          </div>

          {payError && <div className="alert error small" style={{ marginBottom: '10px' }}>{payError}</div>}
          {paySuccess && <div className="alert success small" style={{ marginBottom: '10px' }}>{paySuccess}</div>}

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn primary"
              disabled={paying}
              onClick={async () => {
                setPayError('')
                setPaySuccess('')
                setPaying(true)
                await initiateSubscriptionPayment({
                  gym,
                  userEmail,
                  amount: 499,
                  onSuccess: (data) => {
                    setPaying(false)
                    setPaySuccess(data.message || 'Payment successful! Subscription extended by 30 days.')
                    if (onRefresh) onRefresh()
                  },
                  onError: (err) => {
                    setPaying(false)
                    setPayError(err)
                  },
                })
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span>{paying ? 'Connecting to Razorpay…' : '⚡ Renew Plan (₹499 / 30 Days)'}</span>
            </button>

            <a
              href={RAZORPAY_ME_HANDLE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn secondary"
              style={{ fontSize: '12.5px', textDecoration: 'none' }}
            >
              Direct UPI / QR (Gym Manager)
            </a>
          </div>
        </div>

        {/* Download App Card */}
        {!isInstalled && onDownloadApp && (
          <div className="card">
            <div className="section-head" style={{ marginBottom: '8px' }}>
              <div>
                <h4 style={{ margin: 0 }}>Download Mobile App</h4>
                <span className="muted small">Install Gym Manager directly onto your phone</span>
              </div>
              <span className="badge blue">● PWA Ready</span>
            </div>
            <p className="small muted" style={{ marginBottom: '14px' }}>
              Get fast 1-tap access right from your home screen without opening a browser every time. Works smoothly on Android, iPhone, and PC.
            </p>
            <div>
              <button
                type="button"
                className="btn accent"
                onClick={onDownloadApp}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Download App</span>
              </button>
            </div>
          </div>
        )}

        {/* Theme & Appearance */}
        <div className="card">
          <div className="section-head" style={{ marginBottom: '10px' }}>
            <div>
              <h4 style={{ margin: 0 }}>Theme & Appearance</h4>
              <span className="muted small">Choose between athletic Dark mode and daylight Light mode</span>
            </div>
            <span className="badge blue">
              {theme === 'dark' ? '● Dark Mode Active' : '● Light Mode Active'}
            </span>
          </div>

          <div className="theme-options-grid">
            {/* Dark Theme Option */}
            <div
              className={`theme-option-card ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme('dark')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setTheme('dark') }}
            >
              <div className="theme-option-preview dark-preview">
                <div className="preview-bar" />
                <div className="preview-body">
                  <div className="preview-card" />
                  <div className="preview-accent" />
                </div>
              </div>
              <div className="theme-option-info">
                <div className="theme-option-name">
                  <span>🌙 Athletic Dark</span>
                </div>
                <div className="theme-option-check">
                  {theme === 'dark' && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </div>
            </div>

            {/* Light Theme Option */}
            <div
              className={`theme-option-card ${theme === 'light' ? 'active' : ''}`}
              onClick={() => setTheme('light')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setTheme('light') }}
            >
              <div className="theme-option-preview light-preview">
                <div className="preview-bar" />
                <div className="preview-body">
                  <div className="preview-card" />
                  <div className="preview-accent" />
                </div>
              </div>
              <div className="theme-option-info">
                <div className="theme-option-name">
                  <span>☀️ Clean Light</span>
                </div>
                <div className="theme-option-check">
                  {theme === 'light' && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Language & Regional Settings Card */}
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <b>App Language / भाषा</b>
            <span className="small muted block">Choose your preferred language (हिन्दी, English, मराठी, etc.)</span>
          </div>
          <LanguageToggle />
        </div>

        {/* Password & Security */}
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <b>Password & Security</b>
            <span className="small muted block">Update your login password</span>
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setPasswordError('')
              setPasswordSuccess('')
              setShowPasswordModal(true)
            }}
          >
            Change Password
          </button>
        </div>

        {/* Customer Support Card */}
        <div className="card">
          <div className="section-head" style={{ marginBottom: '8px' }}>
            <h4>Help & Technical Support</h4>
          </div>
          <p className="small muted" style={{ marginBottom: '14px' }}>
            Need help with setup, custom features, or member import? Contact our support team directly.
          </p>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <WhatsAppSupport />
          </div>
        </div>

        {/* Account Actions */}
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <b>Sign Out</b>
            <span className="small muted block">Log out of your gym owner account on this device</span>
          </div>
          <button
            type="button"
            className="btn danger"
            onClick={() => {
              if (confirm('Are you sure you want to sign out?')) {
                onLogout()
              }
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {showPasswordModal && (
        <Modal title="Change Password" onClose={() => setShowPasswordModal(false)}>
          <form onSubmit={handlePasswordSubmit}>
            <label>
              New Password *
              <input
                required
                type="password"
                minLength={6}
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </label>
            <label style={{ marginTop: '8px' }}>
              Confirm New Password *
              <input
                required
                type="password"
                minLength={6}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>

            {passwordError && <div className="alert error" style={{ marginTop: '10px' }}>{passwordError}</div>}
            {passwordSuccess && <div className="alert success" style={{ marginTop: '10px' }}>{passwordSuccess}</div>}

            <div className="dialog-actions" style={{ marginTop: '16px' }}>
              <button
                type="button"
                className="btn"
                disabled={passwordLoading}
                onClick={() => setShowPasswordModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn primary"
                disabled={passwordLoading || !!passwordSuccess}
              >
                {passwordLoading ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
