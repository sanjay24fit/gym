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

  // Calculations for hero metrics
  const totalMembersCount = members.length || 1
  const retentionRate = Math.min(100, Math.round((active.length / totalMembersCount) * 100)) || 95
  const collectionRate = Math.min(100, Math.round((totalCollected / ((totalCollected + totalDue) || 1)) * 100)) || 92

  const { greeting, todayFormatted } = getGreetingAndDate()
  const gymInitials = (gymName ? gymName.slice(0, 2) : 'GM').toUpperCase()

  const pendingAlertsCount = expiringToday.length + (due.length > 0 ? 1 : 0)

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
              {todayFormatted} · Live Member & Billing Overview
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
            borderRadius: '18px',
            padding: '14px 18px',
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
              <span style={{ color: 'var(--muted)' }}>✅ No memberships expiring today.</span>
            )}
            {due.length > 0 && (
              <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                💳 {due.length} members with pending dues ({formatMoney(totalDue)}).
              </span>
            )}
          </div>
        </div>
      )}

      {/* 2. Hero Progress Card (Lavender Pastel with Progress Ring) */}
      <div className="hero-progress-card">
        <div className="hero-progress-left">
          <div className="hero-progress-label-row">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            <span>Live Member Status</span>
          </div>
          <div className="hero-progress-pct">{retentionRate}%</div>
          <div className="hero-date-pill">
            <span>Today · {todayFormatted}</span>
            <span style={{ fontSize: '10px' }}>▾</span>
          </div>
        </div>

        {/* Circular Progress Ring */}
        <div className="hero-progress-ring-box">
          <svg width="110" height="110" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="rgba(255, 255, 255, 0.45)"
              strokeWidth="9"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#6366F1"
              strokeWidth="9"
              strokeDasharray="251.2"
              strokeDashoffset={251.2 - (251.2 * retentionRate) / 100}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
          </svg>
          <div className="hero-ring-inner-text">
            <span className="hero-ring-val">{active.length}</span>
            <span className="hero-ring-sub">Active</span>
          </div>
        </div>
      </div>

      {/* 3. Membership Health Highlight Card (Salmon / Rose 4-Column Card) */}
      <div className="membership-health-card">
        <div className="health-card-header">
          <div className="health-card-title-group">
            <div className="health-card-icon-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M6 5v14M18 5v14M2 9v6h4V9H2zm16 0v6h4V9h-4zM6 12h12" />
              </svg>
            </div>
            <span className="health-card-title">Membership Health</span>
          </div>

          <div className="health-card-tools">
            <button
              type="button"
              className="health-tool-btn"
              onClick={() => (onAction ? onAction('add') : onOpen('all'))}
              title="Add New Member"
              aria-label="Add Member"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button
              type="button"
              className="health-tool-btn"
              onClick={() => onOpen('all')}
              title="View & Filter All Members"
              aria-label="Filter Members"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>
        </div>

        {/* 4-Columns Metric Breakdown */}
        <div className="health-metrics-row">
          <div className="health-metric-col" onClick={() => onOpen('all')} style={{ cursor: 'pointer' }}>
            <span className="health-metric-val">{active.length}</span>
            <span className="health-metric-lbl">Active</span>
          </div>
          <div className="health-metric-col" onClick={() => onOpen('expiring')} style={{ cursor: 'pointer' }}>
            <span className="health-metric-val">{expiring.length}</span>
            <span className="health-metric-lbl">Expiring</span>
          </div>
          <div className="health-metric-col" onClick={() => onOpen('expired')} style={{ cursor: 'pointer' }}>
            <span className="health-metric-val">{expired.length}</span>
            <span className="health-metric-lbl">Expired</span>
          </div>
          <div className="health-metric-col" onClick={() => onOpen('due')} style={{ cursor: 'pointer' }}>
            <span className="health-metric-val">{collectionRate}%</span>
            <span className="health-metric-lbl">Paid %</span>
          </div>
        </div>

        <div className="health-card-footer">
          <span>Expiring in Next 7 Days</span>
          <button
            type="button"
            className="health-footer-link"
            onClick={() => onOpen('expiring')}
          >
            <span>See Breakdown</span>
            <span>→</span>
          </button>
        </div>
      </div>

      {/* 4. Classified 2x2 Pastel Grid (Memberships, Payments, PT, Pending Dues) */}
      <div className="classified-pastel-grid">
        {/* Card 1: Memberships (Warm Peach) */}
        <div
          className="pastel-cat-card peach"
          onClick={() => onOpen('all')}
          role="button"
          tabIndex={0}
        >
          <div className="pastel-cat-top">
            <span className="pastel-cat-title">Memberships</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <span className="pastel-cat-desc">Active registrations & renewals breakdown</span>
          <div className="pastel-cat-bottom">
            <span className="pastel-cat-stat">{active.length} Active</span>
            <span className="pastel-check-btn">Check →</span>
          </div>
        </div>

        {/* Card 2: Payments & Revenue (Soft Blue / Periwinkle) */}
        <div
          className="pastel-cat-card blue"
          onClick={() => (onAction ? onAction('payments') : onOpen('due'))}
          role="button"
          tabIndex={0}
        >
          <div className="pastel-cat-top">
            <span className="pastel-cat-title">Payments & Fees</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </div>
          <span className="pastel-cat-desc">Total collected from member fees</span>
          <div className="pastel-cat-bottom">
            <span className="pastel-cat-stat">{formatMoney(totalCollected)}</span>
            <span className="pastel-check-btn">Check →</span>
          </div>
        </div>

        {/* Card 3: Personal Trainer (Soft Mint) */}
        <div
          className="pastel-cat-card mint"
          onClick={() => onOpen('pt')}
          role="button"
          tabIndex={0}
        >
          <div className="pastel-cat-top">
            <span className="pastel-cat-title">Personal Trainer</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <span className="pastel-cat-desc">Active 1-on-1 PT coaching members</span>
          <div className="pastel-cat-bottom">
            <span className="pastel-cat-stat">{ptMembers.length} PT Members</span>
            <span className="pastel-check-btn">Check →</span>
          </div>
        </div>

        {/* Card 4: Pending Dues (Soft Coral) */}
        <div
          className="pastel-cat-card coral"
          onClick={() => onOpen('due')}
          role="button"
          tabIndex={0}
        >
          <div className="pastel-cat-top">
            <span className="pastel-cat-title">Pending Dues</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <span className="pastel-cat-desc">Unpaid balances & outstanding fees</span>
          <div className="pastel-cat-bottom">
            <span className="pastel-cat-stat">{formatMoney(totalDue)}</span>
            <span className="pastel-check-btn">Check →</span>
          </div>
        </div>
      </div>

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

        {/* Live Mini Sparkline Cards */}
        <div>
          {/* Sparkline 1: Total Received */}
          <div className="sparkline-stat-card">
            <div className="spark-left">
              <span className="spark-label">Total Received</span>
              <span className="spark-val">{formatMoney(totalCollected)}</span>
            </div>
            <svg width="90" height="34" viewBox="0 0 100 36">
              <path
                d="M 5,28 Q 25,30 40,18 T 75,12 T 95,6"
                fill="none"
                stroke="var(--success)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="95" cy="6" r="3.5" fill="var(--success)" />
            </svg>
          </div>

          {/* Sparkline 2: Registered Members */}
          <div className="sparkline-stat-card">
            <div className="spark-left">
              <span className="spark-label">Registered Members</span>
              <span className="spark-val">{members.length} Total</span>
            </div>
            <svg width="90" height="34" viewBox="0 0 100 36">
              <path
                d="M 5,30 Q 30,16 55,22 T 80,10 T 95,8"
                fill="none"
                stroke="var(--electric-blue)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="95" cy="8" r="3.5" fill="var(--electric-blue)" />
            </svg>
          </div>
        </div>
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
                  <li key={m.id} style={{ borderRadius: '16px', padding: '12px 14px' }}>
                    <div className="list-item-main">
                      <div className="avatar-initials" style={{ width: 40, height: 40, borderRadius: '50%' }}>
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
                              ⭐ PT
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
                  <li key={m.id} style={{ borderRadius: '16px', padding: '12px 14px' }}>
                    <div className="list-item-main">
                      <div
                        className="avatar-initials"
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
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
                              ⭐ PT
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
