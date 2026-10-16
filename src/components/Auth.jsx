import { useState } from 'react'
import { supabase } from '../lib/supabase'
import WhatsAppSupport from './WhatsAppSupport'

export default function Auth() {
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
      const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
      if (error) setError(friendly(error.message))
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { gym_name: form.gym_name, owner_name: form.owner_name, phone: form.phone } },
      })
      if (error) setError(friendly(error.message))
      else if (data.user?.identities?.length === 0) setError(friendly('already registered'))
      else if (!data.session) setInfo('Account created. Please confirm your email, then wait for admin approval.')
    }
    setLoading(false)
  }

  return (
    <div className="center-page">
      <form className="card auth-card" onSubmit={submit}>
        <div className="brand">
          <span className="logo">GM</span>
          <div>
            <h1>Gym Manager</h1>
            <p className="muted">Membership &amp; payment tracking</p>
          </div>
        </div>

        <div className="tabs">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
          <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Register Gym</button>
        </div>

        {mode === 'signup' && (
          <>
            <label>Gym name<input required value={form.gym_name} onChange={set('gym_name')} /></label>
            <label>Owner name<input required value={form.owner_name} onChange={set('owner_name')} /></label>
            <label>Mobile number<input required type="tel" value={form.phone} onChange={set('phone')} /></label>
          </>
        )}
        <label>Email<input required type="email" autoComplete="email" value={form.email} onChange={set('email')} /></label>
        <label>Password<input required type="password" minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={set('password')} /></label>

        {error && <div className="alert error">{error}</div>}
        {info && <div className="alert info">{info}</div>}

        <button className="btn primary full" disabled={loading}>
          {loading ? 'Please wait…' : mode === 'login' ? 'Login' : 'Register'}
        </button>
        {mode === 'signup' && <p className="muted small">After registering, you can use the app only after admin approval.</p>}

        <div className="auth-support">
          <WhatsAppSupport variant="link" label="Need help? Customer Support" />
        </div>
      </form>
    </div>
  )
}
