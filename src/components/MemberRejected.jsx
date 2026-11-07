import GymLogo from './GymLogo'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'

export default function MemberRejected({ gym, notes, onRetry, onLogout }) {
  return (
    <div className="center-page" style={{ padding: '20px 16px' }}>
      <div className="auth-theme-bar">
        <LanguageToggle size="sm" />
        <ThemeToggle size="sm" showLabel />
      </div>

      <div className="card auth-card" style={{ maxWidth: '440px', width: '100%', textAlign: 'center', padding: '28px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
          <GymLogo size={56} />
        </div>

        <span className="badge red" style={{ fontSize: '12px', padding: '4px 12px', marginBottom: '12px', display: 'inline-block' }}>
          ✕ Connection Request Denied
        </span>

        <h2 style={{ fontSize: '22px', margin: '4px 0 6px', fontWeight: 800 }}>
          Request Not Approved
        </h2>

        <p className="muted small" style={{ margin: '0 0 16px', lineHeight: 1.5 }}>
          Your request to connect to <b>{gym?.gym_name || 'the gym'}</b> was not approved by the gym administrator.
        </p>

        {notes && (
          <div className="alert warning small" style={{ marginBottom: '18px', textAlign: 'left' }}>
            <b>Reason:</b> {notes}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {onRetry && (
            <button
              type="button"
              className="btn primary full"
              onClick={onRetry}
              style={{ padding: '11px' }}
            >
              Enter a Different Gym Code
            </button>
          )}

          <button
            type="button"
            className="btn full secondary"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}

