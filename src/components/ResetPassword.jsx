import { useState } from 'react'
import { supabase } from '../lib/supabase'
import GymLogo from './GymLogo'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'

export default function ResetPassword({ onComplete, onCancel }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.')
      return
    }

    setLoading(true)
    try {
      const { error: updateErr } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateErr) {
        setError(updateErr.message || 'Could not update password. Please try again.')
        setLoading(false)
      } else {
        setSuccess('Password updated successfully! Redirecting…')
        setTimeout(() => {
          if (onComplete) onComplete()
        }, 1200)
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.')
      setLoading(false)
    }
  }

  return (
    <div className="center-page">
      <div className="auth-theme-bar" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <LanguageToggle size="sm" />
        <ThemeToggle size="sm" showLabel />
      </div>
      <form className="card auth-card" onSubmit={handleSubmit}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <GymLogo size={56} />
          </div>
          <h1 style={{ fontSize: '24px', margin: '0 0 6px' }}>Set New Password</h1>
          <p className="muted small" style={{ margin: 0 }}>
            Choose a new password for your account.
          </p>
        </div>

        <label>
          New Password *
          <div style={{ position: 'relative' }}>
            <input
              required
              type={showPassword ? 'text' : 'password'}
              minLength={6}
              placeholder="••••••••"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingRight: '40px' }}
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
          <span className="muted xs" style={{ display: 'block', marginTop: '3px' }}>
            Must be at least 6 characters
          </span>
        </label>

        <label style={{ marginTop: '10px' }}>
          Confirm New Password *
          <input
            required
            type={showPassword ? 'text' : 'password'}
            minLength={6}
            placeholder="••••••••"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </label>

        {error && <div className="alert error" style={{ marginTop: '10px' }}>{error}</div>}
        {success && <div className="alert success" style={{ marginTop: '10px' }}>{success}</div>}

        <button
          type="submit"
          className="btn primary full"
          style={{ marginTop: '14px', padding: '11px' }}
          disabled={loading || !!success}
        >
          {loading ? 'Updating Password…' : 'Save New Password & Continue'}
        </button>

        {onCancel && (
          <button
            type="button"
            className="btn full"
            style={{ marginTop: '8px' }}
            disabled={loading}
            onClick={onCancel}
          >
            Cancel / Back to Sign In
          </button>
        )}
      </form>
    </div>
  )
}
