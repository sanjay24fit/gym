import { useState } from 'react'
import { supabase } from '../lib/supabase'
import WhatsAppSupport from './WhatsAppSupport'
import GymLogo from './GymLogo'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'
import { lookupMemberPortal, normalizePhone } from '../lib/memberPortal'
import { verifyGymConnectionCode, submitMemberJoinRequest } from '../lib/memberAuth'

export default function Auth({ onDownloadApp, isInstalled, onMemberLogin, initialPhone = '' }) {
  // Primary Role Selection: 'owner' (Option A) vs 'member' (Option B)
  const [role, setRole] = useState(() => (initialPhone ? 'member' : 'owner'))
  
  // Sub-modes for Owner
  const [ownerMode, setOwnerMode] = useState('login') // 'login' | 'signup' | 'forgot'

  // Sub-modes for Member
  const [memberMode, setMemberMode] = useState(() => (initialPhone ? 'quick_pass' : 'login')) // 'login' | 'signup' | 'quick_pass' | 'forgot'

  // Form State
  const [form, setForm] = useState({
    email: '',
    password: '',
    gym_name: '',
    owner_name: '',
    phone: '',
    full_name: '',
    gym_code: '',
  })

  // Quick Pass Phone
  const [memberPhone, setMemberPhone] = useState(initialPhone)
  const [availableMemberships, setAvailableMemberships] = useState([])

  // Gym Code Live Verification State
  const [verifiedGym, setVerifiedGym] = useState(null)
  const [verifyingCode, setVerifyingCode] = useState(false)
  const [codeError, setCodeError] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const set = (k) => (e) => {
    const val = e.target.value
    setForm({ ...form, [k]: val })
    if (k === 'gym_code') {
      setVerifiedGym(null)
      setCodeError('')
    }
  }

  // Handle Gym Code Verification on Blur / Button
  const handleVerifyGymCode = async (codeToVerify) => {
    const cleanCode = (codeToVerify || form.gym_code).trim().toUpperCase()
    if (!cleanCode || cleanCode.length < 3) return
    setVerifyingCode(true)
    setCodeError('')
    const res = await verifyGymConnectionCode(cleanCode)
    setVerifyingCode(false)
    if (res.valid) {
      setVerifiedGym(res)
    } else {
      setCodeError(res.error || 'Invalid Gym Code')
      setVerifiedGym(null)
    }
  }

  const friendly = (msg) => {
    if (!msg) return ''
    if (msg === 'Invalid login credentials') return 'Incorrect email or password'
    if (/email not confirmed/i.test(msg)) return 'Your email is not confirmed yet. Please contact the admin.'
    if (/rate limit/i.test(msg)) return 'Too many attempts. Please wait a while and try again.'
    if (/already registered/i.test(msg)) return 'An account with this email already exists. Please login.'
    if (/user not found/i.test(msg)) return 'No account found with this email address.'
    return msg
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    // ------------------------------------------------------------------------
    // CASE 1: Member Direct Phone Lookup (Quick Pass)
    // ------------------------------------------------------------------------
    if (role === 'member' && memberMode === 'quick_pass') {
      const cleanPhone = normalizePhone(memberPhone)
      if (!cleanPhone || cleanPhone.length < 10) {
        setError('Please enter a valid 10-digit registered mobile number.')
        setLoading(false)
        return
      }

      const res = await lookupMemberPortal(cleanPhone)
      if (!res.success) {
        setError(res.error)
        setLoading(false)
        return
      }

      if (res.memberships && res.memberships.length === 1) {
        onMemberLogin(res.memberships[0])
      } else if (res.memberships && res.memberships.length > 1) {
        setAvailableMemberships(res.memberships)
        setInfo('Found multiple gym memberships for this number. Please select your gym below.')
      } else {
        setError('No active membership records found for this mobile number.')
      }
      setLoading(false)
      return
    }

    // ------------------------------------------------------------------------
    // CASE 2: Forgot Password (Owner or Member)
    // ------------------------------------------------------------------------
    const isForgot = (role === 'owner' && ownerMode === 'forgot') || (role === 'member' && memberMode === 'forgot')
    if (isForgot) {
      const emailToReset = form.email.trim()
      if (!emailToReset) {
        setError('Please enter your registered email address.')
        setLoading(false)
        return
      }

      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(emailToReset, {
        redirectTo: redirectUrl,
      })

      if (resetErr) {
        setError(friendly(resetErr.message))
      } else {
        setInfo('Password reset link sent! Please check your email inbox and click the link to set your new password.')
      }
      setLoading(false)
      return
    }

    // ------------------------------------------------------------------------
    // CASE 3: Gym Owner Login
    // ------------------------------------------------------------------------
    if (role === 'owner' && ownerMode === 'login') {
      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      })
      if (loginErr) setError(friendly(loginErr.message))
      setLoading(false)
      return
    }

    // ------------------------------------------------------------------------
    // CASE 4: Gym Owner Registration
    // ------------------------------------------------------------------------
    if (role === 'owner' && ownerMode === 'signup') {
      const { data, error: signupErr } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            role: 'owner',
            gym_name: form.gym_name,
            owner_name: form.owner_name,
            phone: form.phone,
          },
        },
      })
      if (signupErr) {
        setError(friendly(signupErr.message))
      } else if (data.user?.identities?.length === 0) {
        setError(friendly('already registered'))
      } else if (!data.session) {
        setInfo('Gym Owner account created! Please check your email to confirm your account.')
      }
      setLoading(false)
      return
    }

    // ------------------------------------------------------------------------
    // CASE 5: Gym Member Login
    // ------------------------------------------------------------------------
    if (role === 'member' && memberMode === 'login') {
      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      })
      if (loginErr) setError(friendly(loginErr.message))
      setLoading(false)
      return
    }

    // ------------------------------------------------------------------------
    // CASE 6: Gym Member Registration with Gym Connection Code
    // ------------------------------------------------------------------------
    if (role === 'member' && memberMode === 'signup') {
      const cleanCode = form.gym_code.trim().toUpperCase()
      if (!cleanCode) {
        setError('Gym Connection Code is required.')
        setLoading(false)
        return
      }

      // Verify code first before signing up
      const checkRes = await verifyGymConnectionCode(cleanCode)
      if (!checkRes.valid) {
        setError(checkRes.error || 'Invalid Gym Connection Code.')
        setLoading(false)
        return
      }

      const { data, error: signupErr } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            role: 'member',
            full_name: form.full_name,
            phone: form.phone,
            gym_code: cleanCode,
          },
        },
      })

      if (signupErr) {
        setError(friendly(signupErr.message))
        setLoading(false)
        return
      }

      if (data.user?.identities?.length === 0) {
        setError('An account with this email already exists. Please login.')
        setLoading(false)
        return
      }

      // If user session is active immediately (confirm email is off)
      if (data.session) {
        const reqRes = await submitMemberJoinRequest({
          gymCode: cleanCode,
          fullName: form.full_name,
          phone: form.phone,
        })
        if (!reqRes.success) {
          setError(reqRes.error || 'Account created but failed to link gym. Please contact your gym owner.')
        }
      } else {
        setInfo('Member account created! Please confirm your email, then log in to view your membership.')
      }
      setLoading(false)
    }
  }

  const isForgotMode = (role === 'owner' && ownerMode === 'forgot') || (role === 'member' && memberMode === 'forgot')

  return (
    <div className="center-page">
      <div className="auth-theme-bar">
        <LanguageToggle size="sm" />
        <ThemeToggle size="sm" showLabel />
      </div>

      <form className="card auth-card" onSubmit={submit} style={{ maxWidth: '420px', width: '100%' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
            <GymLogo size={52} />
          </div>
          <h1 style={{ fontSize: '22px', margin: '0 0 4px', fontWeight: 800 }}>
            {isForgotMode
              ? 'Reset Password'
              : role === 'owner'
              ? 'Gym Manager · Owner'
              : 'Gym Manager · Member'}
          </h1>
          <p className="muted small" style={{ margin: 0 }}>
            {isForgotMode
              ? 'Enter your registered email to receive a password reset link'
              : role === 'owner'
              ? 'Smart management portal for gym owners'
              : 'Connect to your gym with your Gym Code'}
          </p>
        </div>

        {/* APK Download Button if applicable */}
        {!isInstalled && onDownloadApp && !isForgotMode && (
          <div style={{ textAlign: 'center', margin: '2px 0 8px' }}>
            <button
              type="button"
              className="btn-download-app"
              onClick={onDownloadApp}
              title="Download APK / Install app"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Download APK</span>
            </button>
          </div>
        )}

        {/* Primary Role Selector (Owner vs Member) */}
        {!isForgotMode && (
          <div
            className="tabs"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              marginBottom: '10px',
              padding: '3px',
              background: 'var(--bg-subtle, rgba(0,0,0,0.04))',
              borderRadius: '12px',
            }}
          >
            <button
              type="button"
              className={role === 'owner' ? 'active' : ''}
              onClick={() => {
                setError('')
                setInfo('')
                setRole('owner')
              }}
              style={{ fontWeight: 700, fontSize: '13px', padding: '9px 4px', borderRadius: '9px' }}
            >
              🏋️ Gym Owner
            </button>
            <button
              type="button"
              className={role === 'member' ? 'active' : ''}
              onClick={() => {
                setError('')
                setInfo('')
                setRole('member')
              }}
              style={{ fontWeight: 700, fontSize: '13px', padding: '9px 4px', borderRadius: '9px' }}
            >
              👤 Gym Member
            </button>
          </div>
        )}

        {/* ================================================================
            OPTION A: GYM OWNER FLOWS
        ================================================================ */}
        {role === 'owner' && !isForgotMode && (
          <div className="tabs" style={{ margin: '6px 0 12px', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <button
              type="button"
              className={ownerMode === 'login' ? 'active' : ''}
              onClick={() => {
                setError('')
                setInfo('')
                setOwnerMode('login')
              }}
              style={{ fontSize: '12px', padding: '7px 4px' }}
            >
              Owner Login
            </button>
            <button
              type="button"
              className={ownerMode === 'signup' ? 'active' : ''}
              onClick={() => {
                setError('')
                setInfo('')
                setOwnerMode('signup')
              }}
              style={{ fontSize: '12px', padding: '7px 4px' }}
            >
              Register Gym
            </button>
          </div>
        )}

        {/* Owner Signup Fields */}
        {role === 'owner' && ownerMode === 'signup' && (
          <>
            <label>Gym Name *<input required value={form.gym_name} placeholder="e.g. Iron Fitness Club" onChange={set('gym_name')} /></label>
            <label>Owner Name *<input required value={form.owner_name} placeholder="e.g. Rahul Sharma" onChange={set('owner_name')} /></label>
            <label>Mobile Number *<input required type="tel" value={form.phone} placeholder="10-digit mobile number" onChange={set('phone')} /></label>
          </>
        )}

        {/* ================================================================
            OPTION B: GYM MEMBER FLOWS
        ================================================================ */}
        {role === 'member' && !isForgotMode && (
          <div className="tabs" style={{ margin: '6px 0 12px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <button
              type="button"
              className={memberMode === 'login' ? 'active' : ''}
              onClick={() => {
                setError('')
                setInfo('')
                setMemberMode('login')
              }}
              style={{ fontSize: '11.5px', padding: '7px 2px' }}
            >
              Member Login
            </button>
            <button
              type="button"
              className={memberMode === 'signup' ? 'active' : ''}
              onClick={() => {
                setError('')
                setInfo('')
                setMemberMode('signup')
              }}
              style={{ fontSize: '11.5px', padding: '7px 2px', fontWeight: memberMode === 'signup' ? 700 : 500 }}
            >
              Join Gym (Code)
            </button>
            <button
              type="button"
              className={memberMode === 'quick_pass' ? 'active' : ''}
              onClick={() => {
                setError('')
                setInfo('')
                setMemberMode('quick_pass')
              }}
              style={{ fontSize: '11.5px', padding: '7px 2px' }}
            >
              📱 Quick Pass
            </button>
          </div>
        )}

        {/* Member Signup: Requires Gym Connection Code */}
        {role === 'member' && memberMode === 'signup' && (
          <>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ margin: 0 }}>
                <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <b>Gym Connection Code *</b>
                  {verifyingCode && <span className="small muted">Verifying…</span>}
                </span>
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  <input
                    required
                    type="text"
                    value={form.gym_code}
                    placeholder="e.g. GM-8K92X5"
                    onChange={(e) => set('gym_code')({ target: { value: e.target.value.toUpperCase() } })}
                    onBlur={() => handleVerifyGymCode(form.gym_code)}
                    style={{ textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}
                  />
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => handleVerifyGymCode(form.gym_code)}
                    disabled={verifyingCode || !form.gym_code}
                    style={{ padding: '0 12px', whiteSpace: 'nowrap' }}
                  >
                    Verify
                  </button>
                </div>
              </label>

              {/* Verified Gym Feedback */}
              {verifiedGym && (
                <div className="alert success small" style={{ margin: '6px 0 0', padding: '6px 10px' }}>
                  ✓ Connected to <b>{verifiedGym.gym_name}</b> {verifiedGym.owner_name && `(${verifiedGym.owner_name})`}
                </div>
              )}
              {codeError && (
                <div className="alert error small" style={{ margin: '6px 0 0', padding: '6px 10px' }}>
                  ✕ {codeError}
                </div>
              )}
              <span className="muted small" style={{ display: 'block', marginTop: '4px' }}>
                Ask your gym owner for their 6-character Gym Connection Code.
              </span>
            </div>

            <label>Full Name *<input required value={form.full_name} placeholder="e.g. Sunny Verma" onChange={set('full_name')} /></label>
            <label>Mobile Number *<input required type="tel" maxLength={10} value={form.phone} placeholder="10-digit registered number" onChange={set('phone')} /></label>
          </>
        )}

        {/* Member Quick Pass Mode (Phone-only lookup) */}
        {role === 'member' && memberMode === 'quick_pass' && (
          <>
            <label style={{ marginTop: '8px' }}>
              <span>Registered Mobile Number *</span>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '12px', fontWeight: 600, fontSize: '14px', color: 'var(--muted)' }}>
                  +91
                </span>
                <input
                  required
                  type="tel"
                  maxLength={10}
                  autoFocus
                  placeholder="9876543210"
                  value={memberPhone}
                  onChange={(e) => setMemberPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  style={{ paddingLeft: '46px', fontSize: '16px', letterSpacing: '0.5px' }}
                />
              </div>
              <span className="muted small" style={{ display: 'block', marginTop: '4px' }}>
                Enter the phone number registered in your gym records
              </span>
            </label>

            {availableMemberships.length > 0 && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className="small muted">Select your gym membership:</span>
                {availableMemberships.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="btn secondary full"
                    onClick={() => onMemberLogin(item)}
                    style={{ textAlign: 'left', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <b>{item.gym?.gym_name || 'Gym'}</b>
                      <span className="muted small block">{item.member?.plan} · {item.member?.facility}</span>
                    </div>
                    <span style={{ fontSize: '18px' }}>→</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Common Email & Password for Auth */}
        {!(role === 'member' && memberMode === 'quick_pass') && (
          <>
            <label>
              Email Address *
              <input
                required
                type="email"
                autoComplete="email"
                placeholder={role === 'owner' ? 'owner@gym.com' : 'member@email.com'}
                value={form.email}
                onChange={set('email')}
              />
            </label>

            {!isForgotMode && (
              <label>
                Password *
                <div style={{ position: 'relative' }}>
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    minLength={6}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={set('password')}
                    style={{ paddingRight: '38px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--muted)',
                      cursor: 'pointer',
                      padding: '4px',
                      fontSize: '14px',
                    }}
                  >
                    {showPassword ? '👁️' : '🔒'}
                  </button>
                </div>
              </label>
            )}
          </>
        )}

        {/* Forgot Password Link */}
        {!isForgotMode && !(role === 'member' && memberMode === 'quick_pass') && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-4px', marginBottom: '8px' }}>
            <button
              type="button"
              onClick={() => {
                setError('')
                setInfo('')
                if (role === 'owner') setOwnerMode('forgot')
                else setMemberMode('forgot')
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: '2px 0',
                color: 'var(--accent, #2563eb)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Forgot password?
            </button>
          </div>
        )}

        {error && <div className="alert error">{error}</div>}
        {info && <div className="alert info">{info}</div>}

        {/* Submit Button */}
        <button className="btn primary full" style={{ marginTop: '6px', padding: '11px' }} disabled={loading}>
          {loading
            ? 'Processing…'
            : isForgotMode
            ? 'Send Password Reset Link'
            : role === 'owner'
            ? ownerMode === 'login'
              ? 'Sign In as Owner'
              : 'Register Gym (21-Day Trial)'
            : memberMode === 'login'
            ? 'Sign In as Member'
            : memberMode === 'signup'
            ? 'Join Gym & Create Account'
            : 'View Digital Pass'}
        </button>

        {/* Back to Login if in Forgot Password Mode */}
        {isForgotMode && (
          <button
            type="button"
            className="btn full"
            style={{ marginTop: '8px', padding: '10px' }}
            disabled={loading}
            onClick={() => {
              setError('')
              setInfo('')
              if (role === 'owner') setOwnerMode('login')
              else setMemberMode('login')
            }}
          >
            ← Back to Login
          </button>
        )}

        {role === 'owner' && ownerMode === 'signup' && (
          <p className="muted small" style={{ textAlign: 'center', margin: '6px 0 0' }}>
            Activates automatically with a 21-day free trial. Gym Connection Code is generated immediately.
          </p>
        )}

        {role === 'member' && memberMode === 'signup' && (
          <p className="muted small" style={{ textAlign: 'center', margin: '6px 0 0' }}>
            Your connection request will be sent to the gym owner for approval.
          </p>
        )}

        <div className="auth-support" style={{ marginTop: '14px', textAlign: 'center' }}>
          <WhatsAppSupport variant="link" label="Need assistance? WhatsApp Support" />
        </div>
      </form>
    </div>
  )
}
