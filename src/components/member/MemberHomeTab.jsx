import { useState } from 'react'
import GymLogo from '../GymLogo'
import MemberQRCode from '../MemberQRCode'
import { formatDate, formatMoney, dueAmount, daysLeft } from '../../lib/utils'

export default function MemberHomeTab({
  member,
  gym,
  announcements = [],
  notifications = [],
  onNavigateTab,
  onWhatsAppContact,
}) {
  const [showNotifDrawer, setShowNotifDrawer] = useState(false)

  // Status calculation
  const daysRemaining = daysLeft(member.end_date)
  const due = dueAmount(member)

  let statusBadge = { label: 'ACTIVE', tone: 'green' }
  if (daysRemaining < 0) {
    statusBadge = { label: 'EXPIRED', tone: 'red' }
  } else if (daysRemaining <= 7) {
    statusBadge = { label: 'EXPIRING SOON', tone: 'amber' }
  }

  // Time-of-day greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const firstName = (member.name || 'Member').split(' ')[0]

  const qrPassPayload = typeof window !== 'undefined'
    ? `${window.location.origin}/?phone=${encodeURIComponent(member.phone || '')}`
    : `GYM-PASS:${gym?.gym_name}:${member.name}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* ==============================================================
          A. WELCOME & GREETING HEADER
      ============================================================== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="muted small" style={{ letterSpacing: '0.5px' }}>
            {greeting},
          </span>
          <h1 style={{ margin: '2px 0 0', fontSize: '24px', fontWeight: 800 }}>
            {firstName}! 👋
          </h1>
          <span className="muted small block" style={{ marginTop: '2px' }}>
            Welcome back to <b>{gym?.gym_name || 'Fitness Club'}</b>
          </span>
        </div>

        {/* Notification Bell */}
        <button
          type="button"
          onClick={() => setShowNotifDrawer(!showNotifDrawer)}
          title="Notifications & Alerts"
          style={{
            position: 'relative',
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '18px',
          }}
        >
          <span>🔔</span>
          {notifications.some((n) => !n.is_read) && (
            <span
              style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--danger, #ef4444)',
              }}
            />
          )}
        </button>
      </div>

      {/* ==============================================================
          B. DIGITAL VIP MEMBERSHIP CARD & COUNTDOWN
      ============================================================== */}
      <div
        className="card member-vip-card"
        style={{
          borderRadius: '22px',
          padding: '24px',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #13241b 0%, #0d1812 60%, #16291f 100%)',
          color: '#FFFFFF',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          boxShadow: '0 16px 36px -4px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Subtle Background Watermark */}
        <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.06, pointerEvents: 'none' }}>
          <GymLogo size={200} />
        </div>

        {/* Card Top: Gym Name & Status Badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.2px', opacity: 0.7, fontWeight: 700 }}>
              Digital Gym Membership
            </span>
            <h2 style={{ margin: '2px 0 0', fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>
              {gym?.gym_name || 'Fitness Club'}
            </h2>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              fontSize: '11.5px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: statusBadge.tone === 'green' ? '#10b981' : statusBadge.tone === 'amber' ? '#f59e0b' : '#ef4444',
                boxShadow: `0 0 8px ${statusBadge.tone === 'green' ? '#10b981' : '#f59e0b'}`,
              }}
            />
            <span>{statusBadge.label}</span>
          </div>
        </div>

        {/* Card Middle: Member Name & Integrated QR Pass */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.8px' }}>
              Member Name
            </span>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', margin: '2px 0 4px' }}>
              {member.name}
            </div>
            <div style={{ fontSize: '13px', opacity: 0.75, fontFamily: 'monospace' }}>
              📱 {member.phone || 'No phone'}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
              <span style={{ background: 'rgba(255,255,255,0.16)', padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                {member.plan || 'Standard'}
              </span>
              <span style={{ background: 'rgba(16, 185, 129, 0.25)', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                {member.facility || 'Gym & Fitness'}
              </span>
              {member.personal_trainer && (
                <span style={{ background: 'rgba(244, 114, 182, 0.25)', border: '1px solid rgba(244, 114, 182, 0.4)', padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                  ⚡ PT: {member.trainer_name || 'Coach'}
                </span>
              )}
            </div>
          </div>

          {/* Scannable Check-in Pass */}
          <div style={{ textAlign: 'center' }}>
            <MemberQRCode value={qrPassPayload} label={`${member.name} · ${gym?.gym_name}`} size={105} />
          </div>
        </div>

        {/* Card Bottom: Validity & Live Countdown */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.12)',
            fontSize: '12px',
            opacity: 0.85,
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div>
            <span>Valid: </span>
            <b>{formatDate(member.start_date)}</b> → <b>{formatDate(member.end_date)}</b>
          </div>

          <div
            style={{
              fontWeight: 800,
              fontSize: '12px',
              background: 'rgba(0,0,0,0.3)',
              padding: '3px 10px',
              borderRadius: '8px',
            }}
          >
            ⏱️ {daysRemaining > 0 ? `${daysRemaining} Days Remaining` : daysRemaining === 0 ? 'Expires Today' : `Expired ${-daysRemaining} Days Ago`}
          </div>
        </div>
      </div>

      {/* ==============================================================
          C. FINANCIAL SUMMARY CARDS
      ============================================================== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        <div className="card" style={{ padding: '14px 10px', textAlign: 'center', borderRadius: '14px' }}>
          <span className="muted small block" style={{ fontSize: '11px' }}>Total Package</span>
          <b style={{ fontSize: '17px', marginTop: '2px', display: 'block' }}>{formatMoney(member.total_fee)}</b>
        </div>
        <div className="card" style={{ padding: '14px 10px', textAlign: 'center', borderRadius: '14px' }}>
          <span className="muted small block" style={{ fontSize: '11px' }}>Amount Paid</span>
          <b style={{ fontSize: '17px', color: 'var(--success, #10b981)', marginTop: '2px', display: 'block' }}>
            {formatMoney(member.paid_amount)}
          </b>
        </div>
        <div className="card" style={{ padding: '14px 10px', textAlign: 'center', borderRadius: '14px' }}>
          <span className="muted small block" style={{ fontSize: '11px' }}>Balance Due</span>
          <b
            style={{
              fontSize: '17px',
              color: due > 0 ? 'var(--danger, #ef4444)' : 'var(--muted)',
              marginTop: '2px',
              display: 'block',
            }}
          >
            {formatMoney(due)}
          </b>
        </div>
      </div>

      {/* ==============================================================
          D. QUICK ACTIONS GRID
      ============================================================== */}
      <div className="card">
        <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700 }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          <button
            type="button"
            className="btn secondary"
            onClick={() => onNavigateTab('attendance')}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 6px', gap: '6px' }}
          >
            <span style={{ fontSize: '20px' }}>📅</span>
            <span style={{ fontSize: '11px', fontWeight: 600 }}>Attendance</span>
          </button>

          <button
            type="button"
            className="btn secondary"
            onClick={() => onNavigateTab('workout')}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 6px', gap: '6px' }}
          >
            <span style={{ fontSize: '20px' }}>🏋️</span>
            <span style={{ fontSize: '11px', fontWeight: 600 }}>Workouts</span>
          </button>

          <button
            type="button"
            className="btn secondary"
            onClick={() => onNavigateTab('payments')}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 6px', gap: '6px' }}
          >
            <span style={{ fontSize: '20px' }}>💰</span>
            <span style={{ fontSize: '11px', fontWeight: 600 }}>Payments</span>
          </button>

          <button
            type="button"
            className="btn secondary"
            onClick={() => onWhatsAppContact()}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 6px', gap: '6px' }}
          >
            <span style={{ fontSize: '20px' }}>💬</span>
            <span style={{ fontSize: '11px', fontWeight: 600 }}>Contact Gym</span>
          </button>
        </div>
      </div>

      {/* ==============================================================
          E. IMPORTANT ALERTS & ANNOUNCEMENTS
      ============================================================== */}
      {due > 0 && (
        <div
          className="alert warning"
          style={{
            margin: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 14px',
            borderRadius: '14px',
          }}
        >
          <div>
            <b>Pending Fee Balance: {formatMoney(due)}</b>
            <span className="small block" style={{ marginTop: '2px', opacity: 0.9 }}>
              Please clear your dues with the gym reception desk or pay via UPI.
            </span>
          </div>
          <button
            type="button"
            className="btn sm"
            onClick={() => onNavigateTab('payments')}
            style={{ whiteSpace: 'nowrap', marginLeft: '10px' }}
          >
            View Details
          </button>
        </div>
      )}

      {/* Gym Announcements */}
      {announcements && announcements.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>📢 Gym Announcements</h3>
            <span className="badge blue" style={{ fontSize: '10px' }}>Latest</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {announcements.slice(0, 3).map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '10px 12px',
                  background: 'var(--bg-subtle, rgba(0,0,0,0.02))',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                }}
              >
                <b style={{ fontSize: '13px' }}>{item.title}</b>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {item.message}
                </p>
                <span className="muted xs block" style={{ marginTop: '4px' }}>
                  {formatDate(item.created_at?.slice(0, 10))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==============================================================
          F. NOTIFICATION DRAWER / MODAL
      ============================================================== */}
      {showNotifDrawer && (
        <div className="modal-backdrop" onClick={() => setShowNotifDrawer(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-head">
              <h3>Notifications & Reminders</h3>
              <button type="button" className="btn sm icon-btn" onClick={() => setShowNotifDrawer(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '60vh', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div className="empty" style={{ padding: '20px', textAlign: 'center' }}>
                  <p className="muted small" style={{ margin: 0 }}>No new notifications at this time.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: '10px 12px',
                      background: n.is_read ? 'var(--card)' : 'var(--bg-subtle, rgba(79, 70, 229, 0.05))',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <b style={{ fontSize: '13px' }}>{n.title}</b>
                    <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {n.message}
                    </p>
                    <span className="muted xs block" style={{ marginTop: '4px' }}>
                      {formatDate(n.created_at?.slice(0, 10))}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
