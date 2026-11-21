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
  onOpenReview,
  memberReview,
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
            {firstName}!
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
            color: 'var(--text)',
          }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
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

      {/* 2-Day Expiry Urgent In-App Notice */}
      {daysRemaining <= 2 && daysRemaining >= 0 && (
        <div
          className="card"
          style={{
            borderRadius: '16px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            background: 'var(--amber-subtle, #fef3c7)',
            border: '1px solid var(--amber, #f59e0b)',
            color: '#92400e',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#b45309' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
            <div>
              <b style={{ display: 'block', fontSize: '14px' }}>
                Your gym membership is expiring {daysRemaining === 2 ? 'in 2 days' : daysRemaining === 1 ? 'tomorrow' : 'today'}!
              </b>
              <span style={{ fontSize: '12px', opacity: 0.9 }}>
                Please renew on time to continue your fitness training ({formatDate(member.end_date)}).
              </span>
            </div>
          </div>

          <button
            type="button"
            className="btn sm btn-whatsapp"
            onClick={() => onWhatsAppContact()}
            style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span>Renew on WhatsApp</span>
          </button>
        </div>
      )}

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
            <div style={{ fontSize: '13px', opacity: 0.85, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="3"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
              <span>{member.phone || 'No phone'}</span>
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
                  PT: {member.trainer_name || 'Coach'}
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

      {/* ⭐ Rate & Review Gym Action Prompt (Compulsory & Prominent) */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.06) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#f59e0b',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              flexShrink: 0,
            }}
          >
            ⭐
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <b style={{ fontSize: '14px' }}>
                {memberReview ? 'Aapka Gym Review & Rating' : `Rate & Review ${gym?.gym_name || 'Your Gym'}`}
              </b>
              {!memberReview && (
                <span
                  style={{
                    background: '#f59e0b',
                    color: '#FFFFFF',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '999px',
                  }}
                >
                  Feedback
                </span>
              )}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginTop: '2px' }}>
              {memberReview
                ? `Aapne ${memberReview.rating}★ rating di hai · "${memberReview.review_text || memberReview.reviewText || 'Verified Review'}"`
                : 'Aapka review gym ki city leaderboard ranking decide karega!'}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="btn sm"
          onClick={() => (onOpenReview ? onOpenReview() : onNavigateTab('profile'))}
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#FFFFFF',
            border: 'none',
            padding: '7px 16px',
            fontWeight: 700,
            fontSize: '12px',
            borderRadius: '10px',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {memberReview ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          )}
          <span>{memberReview ? 'Edit Review' : 'Give Review'}</span>
        </button>
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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span style={{ fontSize: '11px', fontWeight: 600 }}>Attendance</span>
          </button>

          <button
            type="button"
            className="btn secondary"
            onClick={() => onNavigateTab('workout')}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 6px', gap: '6px' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 5v14M18 5v14M2 9v6M22 9v6M6 12h12" />
            </svg>
            <span style={{ fontSize: '11px', fontWeight: 600 }}>Workouts</span>
          </button>

          <button
            type="button"
            className="btn secondary"
            onClick={() => onNavigateTab('payments')}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 6px', gap: '6px' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            <span style={{ fontSize: '11px', fontWeight: 600 }}>Payments</span>
          </button>

          <button
            type="button"
            className="btn secondary"
            onClick={() => onWhatsAppContact()}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 6px', gap: '6px' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
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
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 11 18-5v12L3 14v-3z" />
                <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
              </svg>
              <span>Gym Announcements</span>
            </h3>
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
