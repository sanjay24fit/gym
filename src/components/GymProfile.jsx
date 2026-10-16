import { formatDate, daysLeft } from '../lib/utils'
import WhatsAppSupport from './WhatsAppSupport'

export default function GymProfile({ gym, userEmail, onLogout, onDownloadApp, isInstalled }) {
  const validUntil = gym?.valid_until
  const daysRemaining = validUntil ? daysLeft(validUntil) : null

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
            <span className="badge green">● Active</span>
          </div>

          <p className="small muted" style={{ marginBottom: '14px' }}>
            Your Gym Manager subscription gives you unlimited members, paper register scanning, and automated expiry tracking.
          </p>

          <div className="row" style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
            <div>
              <span className="small muted block">Plan Valid Until:</span>
              <b>{validUntil ? formatDate(validUntil) : 'Unlimited Access'}</b>
            </div>
            <div>
              <span className="small muted block">Remaining Days:</span>
              <b>{daysRemaining !== null ? (daysRemaining >= 0 ? `${daysRemaining} days remaining` : 'Expired') : 'No expiry limit'}</b>
            </div>
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
    </div>
  )
}
