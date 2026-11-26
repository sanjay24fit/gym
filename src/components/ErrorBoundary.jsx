import React from 'react'
import GymLogo from './GymLogo'
import WhatsAppSupport from './WhatsAppSupport'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Uncaught Error Boundary:', error, errorInfo)
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  handleClearCacheAndRestart = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('gym_cached_account')
        localStorage.removeItem('gym_cached_members')
        sessionStorage.clear()
      } catch {}
      window.location.href = '/'
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="center-page" style={{ padding: '20px' }}>
          <div
            className="card auth-card"
            style={{
              textAlign: 'center',
              maxWidth: '440px',
              padding: '28px 24px',
              borderRadius: 'var(--radius-xl, 20px)',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.12)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
              <GymLogo size={56} />
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px', color: 'var(--text)' }}>
              App Reload Required
            </h2>

            <p className="muted small" style={{ margin: '0 0 20px', fontSize: '13.5px', lineHeight: '1.5' }}>
              A temporary issue occurred while loading the app. Tap below to reload smoothly.
            </p>

            <button
              type="button"
              className="btn primary full"
              onClick={this.handleReload}
              style={{
                marginBottom: '10px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21h5v-5" />
              </svg>
              <span>Reload App</span>
            </button>

            <button
              type="button"
              className="btn full"
              onClick={this.handleClearCacheAndRestart}
              style={{
                marginBottom: '12px',
                background: 'var(--card-subtle)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontWeight: 600,
                fontSize: '13px',
              }}
            >
              Clear Cache & Fresh Restart
            </button>

            <WhatsAppSupport label="Need Help? Contact Admin via WhatsApp" className="full" />
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
