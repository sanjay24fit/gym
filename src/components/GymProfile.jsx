import { useState } from 'react'
import { formatDate, daysLeft } from '../lib/utils'
import { supabase } from '../lib/supabase'
import WhatsAppSupport from './WhatsAppSupport'
import Modal from './Modal'
import { useTheme } from '../lib/theme'
import LanguageToggle from './LanguageToggle'
import { initiateSubscriptionPayment, RAZORPAY_ME_HANDLE_URL } from '../lib/razorpay'
import { STANDARD_FACILITIES, updateGymLocation } from '../lib/ranking'

export default function GymProfile({
  gym,
  userEmail,
  onLogout,
  onRefresh,
  isInstalled = false,
  onDownloadApp,
}) {
  const { theme, setTheme } = useTheme()
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')
  const [paySuccess, setPaySuccess] = useState('')

  const [selectedCity, setSelectedCity] = useState(gym?.city || 'Udaipur')
  const [selectedState, setSelectedState] = useState(gym?.state || 'Rajasthan')
  const [selectedPincode, setSelectedPincode] = useState(gym?.pincode || '')
  const [selectedArea, setSelectedArea] = useState(gym?.area || 'City Center')
  const [gymFacilities, setGymFacilities] = useState(() => {
    if (Array.isArray(gym?.facilities) && gym.facilities.length > 0) return gym.facilities
    return ['Cardio Zone (Treadmill, Cycles, Steppers)', 'Strength & Heavy Free Weights', 'Personal Training (Certified Coaches)']
  })
  const [savingLocation, setSavingLocation] = useState(false)
  const [locationSuccess, setLocationSuccess] = useState('')
  const [locationError, setLocationError] = useState('')

  async function handleSaveLocation(e) {
    e.preventDefault()
    setSavingLocation(true)
    setLocationError('')
    setLocationSuccess('')
    const res = await updateGymLocation({
      city: selectedCity,
      state: selectedState,
      pincode: selectedPincode,
      area: selectedArea,
      facilities: gymFacilities,
    })
    setSavingLocation(false)
    if (res.success) {
      setLocationSuccess('Gym location and facilities saved! City leaderboard rank updated.')
      if (onRefresh) onRefresh()
    } else {
      setLocationError(res.error || 'Failed to update location.')
    }
  }

  const validUntil = gym?.valid_until
  const daysRemaining = validUntil ? daysLeft(validUntil) : null
  // D3: explicit backend field — 'trial' until the first verified payment
  // (verify-payment.js sets 'active'); missing field = not a trial.
  const isTrial = gym?.subscription_status === 'trial'

  async function handlePasswordSubmit(e) {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (!currentPassword) {
      setPasswordError('Please enter your current password.')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }

    setPasswordLoading(true)

    // Verify current password first via Supabase auth
    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword,
    })

    if (verifyErr) {
      setPasswordLoading(false)
      setPasswordError('Incorrect current password. Please try again.')
      return
    }

    // Current password verified -> proceed to update password
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordLoading(false)

    if (updateErr) {
      setPasswordError(updateErr.message)
    } else {
      setPasswordSuccess('Password successfully updated!')
      setTimeout(() => {
        setShowPasswordModal(false)
        setCurrentPassword('')
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
                borderRadius: '50%',
                background: 'var(--pastel-lavender-bg)',
                border: '1px solid var(--pastel-lavender-border)',
                color: 'var(--pastel-lavender-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 800,
                fontFamily: "'Outfit', sans-serif",
                flexShrink: 0,
              }}
            >
              {gym?.gym_name ? gym.gym_name.slice(0, 2).toUpperCase() : 'GM'}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px' }}>{gym?.gym_name || 'Gym Manager'}</h3>
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

        {/* Gym Location & City Leaderboard Settings */}
        <form className="card" onSubmit={handleSaveLocation}>
          <div className="section-head" style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>Gym City & Ranking Location</span>
              </h4>
              <span className="muted small">Set your city and area for the City Leaderboard & Market Ranking</span>
            </div>
            <span className="badge purple" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
              </svg>
              <span>Leaderboard Active</span>
            </span>
          </div>

          <p className="small muted" style={{ marginBottom: '14px' }}>
            Aapka gym kis city me operate karta hai? City select karne par aapka gym us city ke total gyms (e.g. Udaipur 200+ Gyms) me rank hoga.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>
                City (Ranking Region) *
              </label>
              <input
                type="text"
                placeholder="e.g. Udaipur"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                required
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--input-bg, var(--card))', color: 'var(--text)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>
                State *
              </label>
              <input
                type="text"
                placeholder="e.g. Rajasthan"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                required
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--input-bg, var(--card))', color: 'var(--text)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>
                PIN Code *
              </label>
              <input
                type="text"
                placeholder="e.g. 313001"
                maxLength={6}
                value={selectedPincode}
                onChange={(e) => setSelectedPincode(e.target.value)}
                required
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--input-bg, var(--card))', color: 'var(--text)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>
                Area / Locality *
              </label>
              <input
                type="text"
                placeholder="e.g. Hiran Magri / City Center"
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                required
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--input-bg, var(--card))', color: 'var(--text)' }}
              />
            </div>
          </div>

          {/* Verified Facilities Checklist */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
              Gym Facilities & Equipment (Adds +20 pts to Rank Score)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '6px' }}>
              {STANDARD_FACILITIES.map((f) => {
                const checked = gymFacilities.includes(f.label)
                return (
                  <label
                    key={f.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      padding: '7px 10px',
                      borderRadius: '8px',
                      background: checked ? 'var(--card-hover)' : 'transparent',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setGymFacilities([...gymFacilities, f.label])
                        } else {
                          setGymFacilities(gymFacilities.filter((x) => x !== f.label))
                        }
                      }}
                    />
                    <span>{f.label}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {locationSuccess && <div className="alert success small" style={{ marginBottom: '12px' }}>✓ {locationSuccess}</div>}
          {locationError && <div className="alert error small" style={{ marginBottom: '12px' }}>✕ {locationError}</div>}

          <button
            type="submit"
            className="btn primary"
            disabled={savingLocation}
            style={{ padding: '8px 18px', fontSize: '13px' }}
          >
            <span>{savingLocation ? 'Updating Location…' : 'Save City & Facilities'}</span>
          </button>
        </form>

        {/* Subscription & Validity Card */}
        <div className="card">
          <div className="section-head" style={{ marginBottom: '10px' }}>
            <h4>Subscription Status</h4>
            <span className={`badge ${daysRemaining !== null && daysRemaining <= 0 ? 'red' : 'green'}`}>
              ● {daysRemaining !== null && daysRemaining <= 0 ? 'Expired' : isTrial ? 'Free Trial' : 'Active Plan'}
            </span>
          </div>

          <p className="small muted" style={{ marginBottom: '14px' }}>
            Your Gym Manager {isTrial ? '21-day free trial' : 'subscription'} gives you unlimited members, paper register scanning, and automated expiry tracking.
          </p>

          <div className="row" style={{ background: 'var(--card-subtle)', padding: '14px 18px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', marginBottom: '16px' }}>
            <div>
              <span className="small muted block">{isTrial ? 'Trial Valid Until:' : 'Plan Valid Until:'}</span>
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
              <span>{paying ? 'Connecting to Razorpay…' : 'Renew Plan (₹499 / 30 Days)'}</span>
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

        {/* Theme & Appearance */}
        <div className="card settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <b>Theme & Appearance / थीम</b>
            <span className="small muted block">
              {theme === 'dark' ? 'Forest Charcoal (Dark Mode active)' : 'Off-White Emerald (Light Mode active)'}
            </span>
          </div>

          <div
            className="theme-segmented-toggle"
            role="radiogroup"
            aria-label="Theme Selection"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'var(--card-subtle, rgba(0, 0, 0, 0.06))',
              border: '1.5px solid var(--border)',
              borderRadius: '999px',
              padding: '3px',
              gap: '4px',
              userSelect: 'none',
            }}
          >
            {/* Light Mode Option with Sun SVG Icon */}
            <button
              type="button"
              role="radio"
              aria-checked={theme === 'light'}
              onClick={() => setTheme('light')}
              title="Switch to Light Mode"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '999px',
                border: theme === 'light' ? '1px solid var(--border)' : '1px solid transparent',
                background: theme === 'light' ? 'var(--card, #FFFFFF)' : 'transparent',
                color: theme === 'light' ? 'var(--primary, #145C43)' : 'var(--text-secondary, #718096)',
                fontWeight: theme === 'light' ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: theme === 'light' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.18s ease',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: theme === 'light' ? '#D97706' : 'currentColor' }}
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
              <span>Light Mode</span>
            </button>

            {/* Dark Mode Option with Half Moon SVG Icon */}
            <button
              type="button"
              role="radio"
              aria-checked={theme === 'dark'}
              onClick={() => setTheme('dark')}
              title="Switch to Dark Mode"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '999px',
                border: theme === 'dark' ? '1px solid var(--border)' : '1px solid transparent',
                background: theme === 'dark' ? 'var(--card, #1A231F)' : 'transparent',
                color: theme === 'dark' ? 'var(--accent, #35B982)' : 'var(--text-secondary, #718096)',
                fontWeight: theme === 'dark' ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: theme === 'dark' ? '0 2px 6px rgba(0,0,0,0.18)' : 'none',
                transition: 'all 0.18s ease',
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill={theme === 'dark' ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: theme === 'dark' ? 'var(--accent, #35B982)' : 'currentColor' }}
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
              <span>Dark Mode</span>
            </button>
          </div>
        </div>

        {/* Language & Regional Settings Card */}
        <div className="card settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <b>App Language / भाषा</b>
            <span className="small muted block">Choose your preferred language (हिन्दी, English, मराठी, etc.)</span>
          </div>
          <LanguageToggle />
        </div>

        {/* Password & Security */}
        <div className="card settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
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

        {/* Download App (PWA) */}
        {!isInstalled && onDownloadApp && (
          <div className="card settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <b>Install Mobile App (iOS / Android)</b>
              <span className="small muted block">Install Gym Manager directly onto your iPhone or Android phone for fast full-screen access</span>
            </div>
            <button
              type="button"
              className="btn accent"
              onClick={onDownloadApp}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Install App</span>
            </button>
          </div>
        )}

        {/* Customer Support Card */}
        <div className="card">
          <div className="section-head" style={{ marginBottom: '8px' }}>
            <h4>Help & Technical Support</h4>
          </div>
          <p className="small muted" style={{ marginBottom: '14px' }}>
            Need help? Contact support.
          </p>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <WhatsAppSupport />
          </div>
        </div>

        {/* Account Actions */}
        <div className="card settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <b>Sign Out</b>
            <span className="small muted block">Log out of your gym owner account on this device</span>
          </div>
          <button
            type="button"
            className="btn danger"
            onClick={() => setShowLogoutModal(true)}
          >
            Logout
          </button>
        </div>
      </div>

      {showPasswordModal && (
        <Modal
          title="Change Password"
          onClose={() => {
            setShowPasswordModal(false)
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
            setPasswordError('')
          }}
        >
          <form onSubmit={handlePasswordSubmit}>
            <label>
              Current Password *
              <div style={{ position: 'relative' }}>
                <input
                  required
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    padding: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showCurrentPassword ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </label>

            <label style={{ marginTop: '12px' }}>
              New Password *
              <div style={{ position: 'relative' }}>
                <input
                  required
                  type={showNewPassword ? 'text' : 'password'}
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    padding: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showNewPassword ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </label>

            <label style={{ marginTop: '12px' }}>
              Confirm New Password *
              <input
                required
                type={showNewPassword ? 'text' : 'password'}
                minLength={6}
                placeholder="Re-enter new password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>

            {passwordError && <div className="alert error" style={{ marginTop: '12px' }}>{passwordError}</div>}
            {passwordSuccess && <div className="alert success" style={{ marginTop: '12px' }}>{passwordSuccess}</div>}

            <div className="dialog-actions" style={{ marginTop: '18px' }}>
              <button
                type="button"
                className="btn"
                disabled={passwordLoading}
                onClick={() => {
                  setShowPasswordModal(false)
                  setCurrentPassword('')
                  setNewPassword('')
                  setConfirmPassword('')
                  setPasswordError('')
                }}
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
