import { useState } from 'react'
import { supabase } from '../lib/supabase'
import WhatsAppSupport from './WhatsAppSupport'
import GymLogo from './GymLogo'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'

export default function Auth({ onDownloadApp, isInstalled }) {
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'forgot'
  const [form, setForm] = useState({ email: '', password: '', gym_name: '', owner_name: '', phone: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

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

    if (mode === 'forgot') {
      const emailToReset = form.email.trim()
      if (!emailToReset) {
        setError('Please enter your registered email address.')
        setLoading(false)
        return
      }

      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : undefined

      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(emailToReset, {
        redirectTo: redirectUrl,
      })

      if (resetErr) {
        setError(friendly(resetErr.message))
      } else {
        setInfo('Password reset link sent! Please check your email inbox (and spam/junk folder) and click the link to set your new password.')
      }
      setLoading(false)
      return
    }

    if (mode === 'login') {
      const { error: loginErr } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password })
      if (loginErr) setError(friendly(loginErr.message))
    } else {
      const { data, error: signupErr } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: { data: { gym_name: form.gym_name, owner_name: form.owner_name, phone: form.phone } },
      })
      if (signupErr) setError(friendly(signupErr.message))
      else if (data.user?.identities?.length === 0) setError(friendly('already registered'))
      else if (!data.session) setInfo('Account created. Please confirm your email to sign in — your account activates automatically with a 21-day free trial.')
    }
    setLoading(false)
  }

  return (
    <div className="center-page">
      <div className="auth-theme-bar" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <LanguageToggle size="sm" />
        <ThemeToggle size="sm" showLabel />
      </div>
      <form className="card auth-card" onSubmit={submit}>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <GymLogo size={56} />
          </div>
          <h1 style={{ fontSize: '24px', margin: '0 0 4px' }}>
            {mode === 'forgot' ? 'Reset Password' : 'Gym Manager'}
          </h1>
          <p className="muted small" style={{ margin: 0 }}>
            {mode === 'forgot'
              ? 'Enter your registered email to receive a password reset link'
              : 'Smart member & billing portal with paper register scanning'}
          </p>
        </div>

        {!isInstalled && onDownloadApp && mode !== 'forgot' && (
          <div style={{ textAlign: 'center', margin: '4px 0 6px' }}>
            <button
              type="button"
              className="link small"
              onClick={onDownloadApp}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'none',
                border: 'none',
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: '12.5px',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Install app on phone</span>
            </button>
          </div>
        )}

        {mode !== 'forgot' ? (
          <div className="tabs" style={{ margin: '8px 0' }}>
            <button
              type="button"
              className={mode === 'login' ? 'active' : ''}
              onClick={() => {
                setError('')
                setInfo('')
                setMode('login')
              }}
            >
              Owner Login
            </button>
            <button
              type="button"
              className={mode === 'signup' ? 'active' : ''}
              onClick={() => {
                setError('')
                setInfo('')
                setMode('signup')
              }}
            >
              Register New Gym
            </button>
          </div>
        ) : null}

        {mode === 'signup' && (
          <>
            <label>Gym Name *<input required value={form.gym_name} placeholder="e.g. Iron Fitness Club" onChange={set('gym_name')} /></label>
            <label>Owner Name *<input required value={form.owner_name} placeholder="e.g. Rahul Sharma" onChange={set('owner_name')} /></label>
            <label>Mobile Number *<input required type="tel" value={form.phone} placeholder="10-digit mobile number" onChange={set('phone')} /></label>
          </>
        )}

        <label>
          Email Address *
          <input
            required
            type="email"
            autoComplete="email"
            placeholder="owner@gym.com"
            value={form.email}
            onChange={set('email')}
          />
        </label>

        {mode !== 'forgot' && (
          <label>
            Password *
            <div style={{ position: 'relative' }}>
              <input
                required
                type={showPassword ? 'text' : 'password'}
                minLength={6}
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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

        {mode === 'login' && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-4px', marginBottom: '8px' }}>
            <button
              type="button"
              onClick={() => {
                setError('')
                setInfo('')
                setMode('forgot')
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: '2px 0',
                color: 'var(--accent, #2563eb)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>Forgot password? (पासवर्ड भूल गए?)</span>
            </button>
          </div>
        )}

        {error && <div className="alert error">{error}</div>}
        {info && <div className="alert info">{info}</div>}

        <button className="btn primary full" style={{ marginTop: '6px', padding: '11px' }} disabled={loading}>
          {loading
            ? (mode === 'forgot' ? 'Sending Reset Link…' : 'Authenticating…')
            : mode === 'forgot'
            ? 'Send Password Reset Link'
            : mode === 'login'
            ? 'Sign In'
            : 'Register Gym Account'}
        </button>

        {mode === 'forgot' && (
          <button
            type="button"
            className="btn full"
            style={{ marginTop: '8px', padding: '10px' }}
            disabled={loading}
            onClick={() => {
              setError('')
              setInfo('')
              setMode('login')
            }}
          >
            ← Back to Login
          </button>
        )}

        {mode === 'signup' && (
          <p className="muted small" style={{ textAlign: 'center', margin: '4px 0 0' }}>
            Your account activates automatically with a 21-day free trial after email confirmation — no admin approval needed.
          </p>
        )}

        <div className="auth-support" style={{ marginTop: '14px', textAlign: 'center' }}>
          <WhatsAppSupport variant="link" label="Need assistance? WhatsApp Support" />
        </div>
      </form>
    </div>
  )
}
