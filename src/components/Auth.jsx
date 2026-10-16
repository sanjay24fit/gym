import { useState } from 'react'
import { supabase } from '../lib/supabase'
import WhatsAppSupport from './WhatsAppSupport'
import GymLogo from './GymLogo'

export default function Auth({ onDownloadApp }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', gym_name: '', owner_name: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const friendly = (msg) => {
    if (msg === 'Invalid login credentials') return 'Incorrect email or password'
    if (/email not confirmed/i.test(msg)) return 'Your email is not confirmed yet. Please contact the admin.'
    if (/rate limit/i.test(msg)) return 'Too many attempts. Please wait a while and try again.'
    if (/already registered/i.test(msg)) return 'An account with this email already exists. Please login.'
    return msg
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    if (mode === 'login') {
      const { error: loginErr } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
      if (loginErr) setError(friendly(loginErr.message))
    } else {
      const { data, error: signupErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { gym_name: form.gym_name, owner_name: form.owner_name, phone: form.phone } },
      })
      if (signupErr) setError(friendly(signupErr.message))
      else if (data.user?.identities?.length === 0) setError(friendly('already registered'))
      else if (!data.session) setInfo('Account created. Please confirm your email, then wait for admin approval.')
    }
    setLoading(false)
  }

  return (
    <div className="center-page">
      <form className="card auth-card" onSubmit={submit}>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <GymLogo size={56} />
          </div>
          <h1 style={{ fontSize: '24px', margin: '0 0 4px' }}>Gym Manager</h1>
          <p className="muted small" style={{ margin: 0 }}>Smart member, attendance &amp; billing portal</p>
        </div>

        <div className="tabs" style={{ margin: '8px 0' }}>
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            Owner Login
          </button>
          <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>
            Register New Gym
          </button>
        </div>

        {mode === 'signup' && (
          <>
            <label>Gym Name *<input required value={form.gym_name} placeholder="e.g. Iron Fitness Club" onChange={set('gym_name')} /></label>
            <label>Owner Name *<input required value={form.owner_name} placeholder="e.g. Rahul Sharma" onChange={set('owner_name')} /></label>
            <label>Mobile Number *<input required type="tel" value={form.phone} placeholder="10-digit mobile number" onChange={set('phone')} /></label>
          </>
        )}
        <label>Email Address *<input required type="email" autoComplete="email" placeholder="owner@gym.com" value={form.email} onChange={set('email')} /></label>
        <label>Password *<input required type="password" minLength={6} placeholder="••••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={set('password')} /></label>

        {error && <div className="alert error">{error}</div>}
        {info && <div className="alert info">{info}</div>}

        <button className="btn primary full" style={{ marginTop: '6px', padding: '11px' }} disabled={loading}>
          {loading ? 'Authenticating…' : mode === 'login' ? 'Sign In to Portal' : 'Register Gym Account'}
        </button>

        {mode === 'signup' && (
          <p className="muted small" style={{ textAlign: 'center', margin: '4px 0 0' }}>
            Account will be activated by platform admin after registration.
          </p>
        )}

        <div className="auth-support" style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
          {onDownloadApp && (
            <button
              type="button"
              className="btn-download-app"
              onClick={onDownloadApp}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Download Mobile App</span>
            </button>
          )}
          <WhatsAppSupport variant="link" label="Need assistance? WhatsApp Support" />
        </div>
      </form>
    </div>
  )
}
