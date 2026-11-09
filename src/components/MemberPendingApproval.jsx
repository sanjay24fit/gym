import { useState } from 'react'
import GymLogo from './GymLogo'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'
import { formatDate } from '../lib/utils'

export default function MemberPendingApproval({ gym, request, onRefresh, onLogout }) {
  const [checking, setChecking] = useState(false)

  const handleRefresh = async () => {
    setChecking(true)
    if (onRefresh) await onRefresh()
    setTimeout(() => setChecking(false), 800)
  }

  const gymPhone = gym?.phone || ''
  const cleanPhone = gymPhone.replace(/\D/g, '')

  const handleWhatsAppOwner = () => {
    const msg = `Hello ${gym?.owner_name || 'Gym Manager'}, I have created my account on Gym Manager for *${gym?.gym_name || 'the gym'}*. Please approve my membership connection request.`
    const url = cleanPhone ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

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

        <span className="badge amber" style={{ fontSize: '12px', padding: '4px 12px', marginBottom: '12px', display: 'inline-block' }}>
          ⏳ Pending Owner Approval
        </span>

        <h2 style={{ fontSize: '22px', margin: '4px 0 6px', fontWeight: 800 }}>
          Connection Request Sent
        </h2>

        <p className="muted small" style={{ margin: '0 0 18px', lineHeight: 1.5 }}>
          Your request to join <b>{gym?.gym_name || 'Fitness Club'}</b> has been sent to the gym owner for verification.
        </p>

        <div
          style={{
            background: 'var(--bg-subtle, rgba(0,0,0,0.03))',
            borderRadius: '14px',
            padding: '14px',
            textAlign: 'left',
            marginBottom: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '13px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="muted">Gym Name</span>
            <b>{gym?.gym_name || 'Gym'}</b>
          </div>
          {gym?.owner_name && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">Gym Owner</span>
              <b>{gym.owner_name}</b>
            </div>
          )}
          {request?.created_at && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">Requested On</span>
              <span>{formatDate(request.created_at.slice(0, 10))}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            className="btn primary full"
            onClick={handleRefresh}
            disabled={checking}
            style={{ padding: '11px' }}
          >
            {checking ? 'Checking Status…' : '🔄 Refresh Approval Status'}
          </button>

          {cleanPhone && (
            <button
              type="button"
              className="btn btn-whatsapp full"
              onClick={handleWhatsAppOwner}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px' }}
            >
              <span>💬</span>
              <span>Ping Gym Owner on WhatsApp</span>
            </button>
          )}

          <button
            type="button"
            className="btn full secondary"
            onClick={onLogout}
            style={{ marginTop: '4px' }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}

