import React, { useState } from 'react'
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

export default function Dashboard({ members, onOpen, onAction, gymName }) {
  const [showNotificationPopup, setShowNotificationPopup] = useState(false)

  const active = members.filter((m) => membershipStatus(m) !== 'expired')
  const expiring = members
    .filter((m) => membershipStatus(m) === 'expiring')
    .sort((a, b) => a.end_date.localeCompare(b.end_date))
  const expired = members.filter((m) => membershipStatus(m) === 'expired')
  const expiringToday = members.filter((m) => daysLeft(m.end_date) === 0)
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

  // Alert-dot weight: each pending item counts once (expiring members + dues
  // members) — the dot only gates on > 0, so visible behavior is unchanged.
  const pendingAlertsCount = expiringToday.length + due.length

  return (
    <div className="dashboard-content" style={{ paddingBottom: '32px' }}>
      {/* 1. Header with Profile, Greeting, Search & Notification Bell */}
      <div className="dash-pastel-header">
        <div className="dash-pastel-user">
          <div className="dash-avatar-circle" aria-label="Gym Profile">
            {gymInitials}
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
          {/* Search Trigger */}
          <button
            type="button"
            className="dash-circle-btn"
            onClick={() => onOpen('all')}
            title="Search registered members"
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px' }}>
            {expiringToday.length > 0 ? (
              <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
                ⚠️ {expiringToday.length} membership{expiringToday.length === 1 ? '' : 's'} expiring today!
              </span>
            ) : (
              <span style={{ color: 'var(--muted)' }}>No memberships expiring today.</span>
            )}
            {due.length > 0 && (
              <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                💳 {due.length} members with pending dues ({formatMoney(totalDue)}).
              </span>
            )}
          </div>
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

      {/* Pastel grid & Membership Health card consolidated above (D4). */}

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
    </div>
  )
}
