import React, { useState } from 'react'
import GymConnectCode from './GymConnectCode'
import ExpiryWhatsAppModal from './ExpiryWhatsAppModal'
import CityLeaderboardModal from './CityLeaderboardModal'
import MemberSearchClipboard from './MemberSearchClipboard'
import { WhatsAppIcon } from './WhatsAppSupport'
import {
  dueAmount,
  expiryText,
  formatDate,
  formatMoney,
  membershipStatus,
  daysLeft,
  getMemberFacility,
  hasPersonalTrainer,
  getTrainerName,
  collectionRate,
} from '../lib/utils'
import { buildWhatsAppReminderUrl, markReminderSent } from '../lib/whatsappReminder'

function getGreetingAndDate() {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return { greeting, todayFormatted }
}

export default function Dashboard({
  members,
  onOpen,
  onAction,
  gymName,
  gym,
  onGymUpdated,
  onPreviewMemberPass,
}) {
  const [showNotificationPopup, setShowNotificationPopup] = useState(false)
  const [showExpiryWhatsAppModal, setShowExpiryWhatsAppModal] = useState(false)
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)

  const active = members.filter((m) => membershipStatus(m) !== 'expired')
  const expiring = members
    .filter((m) => membershipStatus(m) === 'expiring')
    .sort((a, b) => a.end_date.localeCompare(b.end_date))
  const expired = members.filter((m) => membershipStatus(m) === 'expired')
  const expiringToday = members.filter((m) => daysLeft(m.end_date) === 0)
  const expiringIn2Days = members.filter((m) => daysLeft(m.end_date) === 2)
  const ptMembers = members.filter((m) => hasPersonalTrainer(m))

  const due = members.filter((m) => dueAmount(m) > 0).sort((a, b) => dueAmount(b) - dueAmount(a))
  const totalDue = due.reduce((s, m) => s + dueAmount(m), 0)
  const totalCollected = members.reduce((s, m) => s + Number(m.paid_amount || 0), 0)

  // Calculations for hero metrics (truthful zeros — no fabricated fallbacks)
  const retentionRate =
    members.length > 0 ? Math.min(100, Math.round((active.length / members.length) * 100)) : 0
  const collectionRatePct = collectionRate(members)

  const { greeting, todayFormatted } = getGreetingAndDate()
  const gymInitials = (gymName ? gymName.slice(0, 2) : 'GM').toUpperCase()
  const ownerPhoto =
    gym?.owner_photo ||
    gym?.avatar_url ||
    gym?.logo_url ||
    (typeof window !== 'undefined'
      ? localStorage.getItem(`gym_owner_photo_${gym?.id}`) || localStorage.getItem('gym_owner_photo_current')
      : null)

  // Alert-dot weight: includes expiring today, expiring in 2 days (urgent WhatsApp reminder), and dues
  const pendingAlertsCount = expiringToday.length + expiringIn2Days.length + due.length

  return (
    <div className="dashboard-content" style={{ paddingBottom: '32px' }}>
      {/* 1. Header with Profile, Greeting, Search & Notification Bell */}
      <div className="dash-pastel-header">
        <div className="dash-pastel-user">
          <div className="dash-avatar-circle" aria-label="Gym Profile">
            {ownerPhoto ? (
              <img src={ownerPhoto} alt={gymName || 'Gym Owner'} className="dash-avatar-img" />
            ) : (
              gymInitials
            )}
          </div>
          <div className="dash-user-titles">
            <h1 className="dash-greeting-text">
              {greeting}, {gymName || 'Gym Owner'}!
            </h1>
            <span className="dash-subtitle-text">
              {todayFormatted}
            </span>
          </div>
        </div>

        <div className="dash-header-actions">
          {/* Search Trigger - Opens Quick Member Search Clipboard */}
          <button
            type="button"
            className="dash-circle-btn"
            onClick={() => setShowSearchModal(true)}
            title="Search registered members (Clipboard)"
            aria-label="Search members"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          {/* Notification Bell with Badge */}
          <button
            type="button"
            className="dash-circle-btn"
            onClick={() => setShowNotificationPopup(!showNotificationPopup)}
            title="View alerts & reminders"
            aria-label="Notifications"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {pendingAlertsCount > 0 && <span className="dash-circle-badge" />}
          </button>
        </div>
      </div>

      {/* Popover for Notification Bell */}
      {showNotificationPopup && (
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: '16px 20px',
            marginBottom: '16px',
            boxShadow: 'var(--shadow-md)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800 }}>Gym Alerts & Quick Reminders</span>
            <button
              type="button"
              className="link"
              style={{ fontSize: '12px' }}
              onClick={() => setShowNotificationPopup(false)}
            >
              Close
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
            {expiringIn2Days.length > 0 && (
              <div
                style={{
                  background: 'var(--amber-subtle, #fef3c7)',
                  border: '1px solid var(--amber, #f59e0b)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#b45309', fontWeight: 700 }}>
                    ⏰ {expiringIn2Days.length} membership{expiringIn2Days.length === 1 ? '' : 's'} expiring in 2 days!
                  </span>
                  <button
                    type="button"
                    className="btn sm btn-whatsapp"
                    style={{ padding: '3px 8px', fontSize: '11px' }}
                    onClick={() => {
                      setShowNotificationPopup(false)
                      setShowExpiryWhatsAppModal(true)
                    }}
                  >
                    <WhatsAppIcon size={11} />
                    <span>Send Reminders</span>
                  </button>
                </div>
                <span style={{ fontSize: '11.5px', color: '#92400e', display: 'block', marginTop: '3px' }}>
                  Member ke register number par 2-day WhatsApp expiry reminder bhejein.
                </span>
              </div>
            )}
            {expiringToday.length > 0 ? (
              <span style={{ color: 'var(--warning)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>{expiringToday.length} membership{expiringToday.length === 1 ? '' : 's'} expiring today!</span>
              </span>
            ) : (
              <span style={{ color: 'var(--muted)' }}>No memberships expiring today.</span>
            )}
            {due.length > 0 && (
              <span style={{ color: 'var(--danger)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
                <span>{due.length} members with pending dues ({formatMoney(totalDue)}).</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* 2-Day Expiry Urgent WhatsApp Action Banner */}
      {expiringIn2Days.length > 0 && (
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(37, 211, 102, 0.12) 100%)',
            border: '1px solid var(--amber, #f59e0b)',
            borderRadius: 'var(--radius-xl)',
            padding: '14px 18px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
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
              ⏰
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <b style={{ fontSize: '14.5px' }}>
                  {expiringIn2Days.length} Member{expiringIn2Days.length > 1 ? 's' : ''} Expiring in 2 Days!
                </b>
                <span className="badge amber" style={{ fontSize: '11px', padding: '1px 7px' }}>
                  WhatsApp Alert
                </span>
              </div>
              <span style={{ fontSize: '12.5px', color: 'var(--muted)', display: 'block', marginTop: '2px' }}>
                Member ke register number par WhatsApp notification bhejein: <i>"Aapki membership khatam hone wali hai"</i>
              </span>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-whatsapp"
            onClick={() => setShowExpiryWhatsAppModal(true)}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            <WhatsAppIcon size={14} />
            <span>Send 2-Day WhatsApp Reminders ({expiringIn2Days.length})</span>
          </button>
        </div>
      )}

      {/* 2. Compact KPI Strip — single card replacing the hero ring, health
          card, pastel grid and sparklines (D4). Same formulas and data
          sources; every tile navigates to an existing screen. */}
      <div className="membership-health-card">
        <div className="health-card-header">
          <div className="health-card-title-group">
            <div className="health-card-icon-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M6 5v14M18 5v14M2 9v6h4V9H2zm16 0v6h4V9h-4zM6 12h12" />
              </svg>
            </div>
            <span className="health-card-title">Overview</span>
          </div>
        </div>

        <div className="health-metrics-row">
          <div className="health-metric-col" onClick={() => onOpen('all')} style={{ cursor: 'pointer' }}>
            <span className="health-metric-val">{members.length}</span>
            <span className="health-metric-lbl">Registered</span>
          </div>
          <div className="health-metric-col" onClick={() => onOpen('active')} style={{ cursor: 'pointer' }}>
            <span className="health-metric-val">{active.length}</span>
            <span className="health-metric-lbl">Active</span>
          </div>
          <div
            className="health-metric-col"
            onClick={() => onOpen('active')}
            style={{ cursor: 'pointer' }}
            title="Active members as a share of registered members"
          >
            <span className="health-metric-val">{retentionRate}%</span>
            <span className="health-metric-lbl">Member Status</span>
          </div>
          <div className="health-metric-col" onClick={() => onOpen('expiring')} style={{ cursor: 'pointer' }}>
            <span className="health-metric-val">{expiring.length}</span>
            <span className="health-metric-lbl">Expiring</span>
          </div>
          <div className="health-metric-col" onClick={() => onOpen('expired')} style={{ cursor: 'pointer' }}>
            <span className="health-metric-val">{expired.length}</span>
            <span className="health-metric-lbl">Expired</span>
          </div>
          <div className="health-metric-col" onClick={() => onOpen('pt')} style={{ cursor: 'pointer' }}>
            <span className="health-metric-val">{ptMembers.length}</span>
            <span className="health-metric-lbl">PT</span>
          </div>
          <div
            className="health-metric-col"
            onClick={() => (onAction ? onAction('payments') : onOpen('due'))}
            style={{ cursor: 'pointer' }}
            title="Total collected — opens Payments"
          >
            <span className="health-metric-val" style={{ fontSize: '16px' }}>{formatMoney(totalCollected)}</span>
            <span className="health-metric-lbl">Collected</span>
          </div>
          <div
            className="health-metric-col"
            onClick={() => onOpen('due')}
            style={{ cursor: 'pointer' }}
            title="Outstanding balances — opens Payment due list"
          >
            <span className="health-metric-val" style={{ fontSize: '16px' }}>{formatMoney(totalDue)}</span>
            <span className="health-metric-lbl">Pending Dues</span>
          </div>
          <div
            className="health-metric-col"
            onClick={() => (onAction ? onAction('payments') : onOpen('due'))}
            style={{ cursor: 'pointer' }}
            title="Collection rate — opens Payments"
          >
            <span className="health-metric-val">{collectionRatePct}%</span>
            <span className="health-metric-lbl">Paid %</span>
          </div>
        </div>

        {members.length === 0 && (
          <div className="small muted" style={{ textAlign: 'center', marginTop: '8px', fontSize: '11.5px' }}>
            No members registered yet
          </div>
        )}
      </div>

      {/* City Gym Ranking Widget -> Direct Link to Rankings Tab */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #FF6200 0%, #E63900 100%)',
          color: '#FFFFFF',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          borderRadius: 'var(--radius-xl)',
          padding: '18px 22px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          boxShadow: '0 8px 24px rgba(255, 98, 0, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #FFF0E6 0%, #FFD6BF 100%)',
              color: '#FF6200',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              fontWeight: 800,
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF6200" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <b style={{ fontSize: '16px', color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                {gym?.city || 'Udaipur'} City Rankings
              </b>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.22)',
                  border: '1px solid rgba(255, 255, 255, 0.35)',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                }}
              >
                {(gym?.total_reviews || 0) > 0
                  ? `★ ${Number(gym.rating).toFixed(1)} (${gym.total_reviews} Reviews)`
                  : 'No reviews yet'}
              </span>
            </div>

            <span style={{ fontSize: '12.5px', opacity: 0.9, display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '3px', color: '#FFF5F0' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>{gym?.area || 'City Center'}, {gym?.city || 'Udaipur'} {gym?.pincode ? `· PIN ${gym.pincode}` : ''} · Live Leaderboard Decided by Member Reviews</span>
            </span>
          </div>
        </div>

        <button
          type="button"
          className="btn"
          onClick={() => (onAction ? onAction('rankings') : setShowLeaderboardModal(true))}
          style={{
            background: '#FFFFFF',
            color: '#FF6200',
            border: 'none',
            fontSize: '12.5px',
            fontWeight: 700,
            padding: '9px 18px',
            borderRadius: 'var(--radius-full)',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          }}
        >
          <span>View City Rankings & Leaderboard →</span>
        </button>
      </div>

      {/* Gym Connect Code Section */}
      <GymConnectCode gym={gym} onGymUpdated={onGymUpdated} />

      {/* 5. Quick Recaps & Operations Row */}
      <div className="quick-recaps-grid">
        {/* Register Actions Card */}
        <div className="recap-action-card">
          <div>
            <div className="recap-action-title">Register Operations</div>
            <div className="recap-action-sub">
              Quickly enroll new members or scan attendance registers with camera OCR.
            </div>
          </div>
          <div className="recap-action-btns">
            <button
              type="button"
              className="recap-pill-btn"
              onClick={() => (onAction ? onAction('add') : onOpen('all'))}
            >
              <span>+ Add Member</span>
            </button>
            <button
              type="button"
              className="recap-pill-btn secondary"
              onClick={() => (onAction ? onAction('scan') : onOpen('all'))}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span>Scan Register</span>
            </button>
          </div>
        </div>

        {/* Sparkline cards removed (D4) — metrics live in the Overview strip. */}
      </div>

      {/* 6. Classified Lists (Expiring Soon & Pending Dues) */}
      <div className="grid-2">
        {/* Expiring Soon Members Section */}
        <section className="classified-section-card" aria-labelledby="expiring-soon-heading">
          <div className="classified-section-head">
            <div>
              <h2 id="expiring-soon-heading" className="classified-section-title" style={{ margin: 0 }}>
                Expiring Soon
              </h2>
              <span className="muted small">Next 7 days renewals</span>
            </div>
            <button
              type="button"
              className="classified-view-all"
              onClick={() => onOpen('expiring')}
            >
              View all ({expiring.length}) →
            </button>
          </div>

          {expiring.length === 0 ? (
            <p className="muted small" style={{ padding: '20px 0', margin: 0, textAlign: 'center' }}>
              No memberships expiring in the next 7 days.
            </p>
          ) : (
            <ul className="list">
              {expiring.slice(0, 5).map((m) => {
                const initials = m.name ? m.name.slice(0, 2).toUpperCase() : 'GM'
                return (
                  <li key={m.id} style={{ borderRadius: 'var(--radius-lg)', padding: '12px 16px' }}>
                    <div className="list-item-main">
                      <div className="avatar-initials">
                        {initials}
                      </div>
                      <div className="list-item-text">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <b>{m.name}</b>
                          {hasPersonalTrainer(m) && (
                            <span
                              className="badge purple"
                              style={{ fontSize: '10px', padding: '1px 5px' }}
                              title={getTrainerName(m) ? `Trainer: ${getTrainerName(m)}` : 'Personal Trainer'}
                            >
                              PT
                            </span>
                          )}
                        </div>
                        <span className="muted small">
                          {m.plan || 'Standard'} · {getMemberFacility(m)} · {m.phone || 'No phone'}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span className="badge amber">{expiryText(m.end_date)}</span>
                      <span className="muted small block font-mono" style={{ marginTop: '2px', fontSize: '11px' }}>
                        {formatDate(m.end_date)}
                      </span>
                      {daysLeft(m.end_date) <= 2 && daysLeft(m.end_date) >= 0 && (
                        <button
                          type="button"
                          className="btn sm btn-whatsapp"
                          style={{ padding: '2px 8px', fontSize: '11px', marginTop: '4px' }}
                          onClick={(e) => {
                            e.stopPropagation()
                            const url = buildWhatsAppReminderUrl({
                              phone: m.phone,
                              memberName: m.name,
                              gymName: gymName || gym?.gym_name,
                              endDate: m.end_date,
                              daysLeftCount: daysLeft(m.end_date),
                              ownerPhone: gym?.phone,
                            })
                            markReminderSent(m.id, m.end_date)
                            window.open(url, '_blank')
                          }}
                          title="Send WhatsApp Expiry Reminder"
                        >
                          <WhatsAppIcon size={10} />
                          <span>WhatsApp</span>
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Payment Due Members Section */}
        <section className="classified-section-card" aria-labelledby="payment-due-heading">
          <div className="classified-section-head">
            <div>
              <h2 id="payment-due-heading" className="classified-section-title" style={{ margin: 0 }}>
                Pending Dues
              </h2>
              <span className="muted small">Outstanding balances</span>
            </div>
            <button
              type="button"
              className="classified-view-all"
              onClick={() => onOpen('due')}
            >
              View all ({due.length}) →
            </button>
          </div>

          {due.length === 0 ? (
            <p className="muted small" style={{ padding: '20px 0', margin: 0, textAlign: 'center' }}>
              All member fees are clear.
            </p>
          ) : (
            <ul className="list">
              {due.slice(0, 5).map((m) => {
                const initials = m.name ? m.name.slice(0, 2).toUpperCase() : 'GM'
                const balance = dueAmount(m)
                return (
                  <li key={m.id} style={{ borderRadius: 'var(--radius-lg)', padding: '12px 16px' }}>
                    <div className="list-item-main">
                      <div
                        className="avatar-initials"
                        style={{
                          background: 'var(--danger-bg)',
                          color: 'var(--danger)',
                          borderColor: 'var(--danger-border)',
                        }}
                      >
                        {initials}
                      </div>
                      <div className="list-item-text">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <b>{m.name}</b>
                          {hasPersonalTrainer(m) && (
                            <span
                              className="badge purple"
                              style={{ fontSize: '10px', padding: '1px 5px' }}
                              title={getTrainerName(m) ? `Trainer: ${getTrainerName(m)}` : 'Personal Trainer'}
                            >
                              PT
                            </span>
                          )}
                        </div>
                        <span className="muted small">
                          {getMemberFacility(m)} · Paid {formatMoney(m.paid_amount)} / {formatMoney(m.total_fee)}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span className="badge red font-mono">{formatMoney(balance)} due</span>
                      <button
                        type="button"
                        className="link block"
                        style={{ fontSize: '12px', marginTop: '4px', fontWeight: 700 }}
                        onClick={() => (onAction ? onAction('pay', m) : onOpen('due'))}
                      >
                        Collect Payment
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      {/* 2-Day Expiry WhatsApp Notification Modal */}
      <ExpiryWhatsAppModal
        isOpen={showExpiryWhatsAppModal}
        onClose={() => setShowExpiryWhatsAppModal(false)}
        members={members}
        gym={gym || { gym_name: gymName }}
      />

      {/* City Gym Rankings & Leaderboard Modal */}
      <CityLeaderboardModal
        isOpen={showLeaderboardModal}
        onClose={() => setShowLeaderboardModal(false)}
        gym={gym || { gym_name: gymName }}
        members={members}
        onOpenSettings={() => (onAction ? onAction('profile') : onOpen('profile'))}
      />

      {/* Quick Member Search Clipboard Modal */}
      {showSearchModal && (
        <MemberSearchClipboard
          members={members}
          gym={gym}
          onClose={() => setShowSearchModal(false)}
          onPreviewPass={(m) => {
            setShowSearchModal(false)
            onPreviewMemberPass?.(m)
          }}
          onRenew={(m) => {
            setShowSearchModal(false)
            onAction?.('renew', m)
          }}
          onEdit={(m) => {
            setShowSearchModal(false)
            onAction?.('edit', m)
          }}
          onPay={(m) => {
            setShowSearchModal(false)
            onAction?.('pay', m)
          }}
          onOpenMemberInList={(m) => {
            setShowSearchModal(false)
            onOpen?.('all')
          }}
        />
      )}
    </div>
  )
}
