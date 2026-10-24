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

  const { greeting, todayFormatted } = getGreetingAndDate()

  return (
    <div className="dashboard-content">
      {/* 1. Clean Dashboard Header */}
      <div className="dash-welcome">
        <div className="dash-welcome-text">
          <h1 className="greeting-title">
            {greeting}, {gymName || 'Gym Owner'}
          </h1>
          <p className="date-sub">{todayFormatted} · Live Member & Billing Overview</p>
        </div>
        <div className="dash-welcome-badge">
          <span className="badge green">● Active Gym Portal</span>
        </div>
      </div>

      {/* 2. Primary Financial & Member Metrics */}
      <div className="summary-grid">
        {/* Total Collected */}
        <div className="summary-card success">
          <div className="summary-card-head">
            <span className="summary-card-label">Total Collection</span>
            <div className="summary-card-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
          </div>
          <div className="summary-card-value">{formatMoney(totalCollected)}</div>
          <div className="summary-card-sub">
            <span style={{ color: 'var(--success)', fontWeight: 600 }}>Total received</span> from member fees
          </div>
        </div>

        {/* Active Members */}
        <div className="summary-card accent">
          <div className="summary-card-head">
            <span className="summary-card-label">Active Members</span>
            <div className="summary-card-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>
          <div className="summary-card-value">{active.length}</div>
          <div className="summary-card-sub">
            out of <b>{members.length}</b> total registered
          </div>
        </div>

        {/* Pending Dues */}
        <div className="summary-card danger">
          <div className="summary-card-head">
            <span className="summary-card-label">Pending Dues</span>
            <div className="summary-card-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
          </div>
          <div className="summary-card-value" style={{ color: 'var(--danger)' }}>
            {formatMoney(totalDue)}
          </div>
          <div className="summary-card-sub">
            <b>{due.length}</b> member{due.length === 1 ? '' : 's'} with unpaid balance
          </div>
        </div>
      </div>

      {/* 3. Membership Status Breakdown Row */}
      <div className="alerts-strip" role="group" aria-label="Membership Status Alerts">
        <button
          type="button"
          className="alert-pill danger"
          onClick={() => onOpen('expired')}
          title="View expired members"
        >
          <span className="alert-pill-label">Already Expired</span>
          <span className="alert-pill-count">{expired.length}</span>
        </button>

        <button
          type="button"
          className="alert-pill warning"
          onClick={() => onOpen('expiring')}
          title="View members expiring in next 7 days"
        >
          <span className="alert-pill-label">Expiring in 7 Days</span>
          <span className="alert-pill-count">{expiring.length}</span>
        </button>

        <button
          type="button"
          className="alert-pill blue"
          onClick={() => onOpen('due')}
          title="View members with payment due"
        >
          <span className="alert-pill-label">Payment Due</span>
          <span className="alert-pill-count">{due.length}</span>
        </button>

        <button
          type="button"
          className="alert-pill purple"
          onClick={() => onOpen('pt')}
          title="View Personal Trainer (PT) members"
        >
          <span className="alert-pill-label">Personal Trainer</span>
          <span className="alert-pill-count">{ptMembers.length}</span>
        </button>

        {expiringToday.length > 0 && (
          <button
            type="button"
            className="alert-pill warning"
            onClick={() => onOpen('expiring')}
            title="View members expiring today"
          >
            <span className="alert-pill-label">Expiring Today</span>
            <span className="alert-pill-count" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
              {expiringToday.length}
            </span>
          </button>
        )}
      </div>

      {/* 4. Quick Actions (Consolidated & Duplicate Download App Removed) */}
      <section className="quick-actions-bar" aria-labelledby="quick-actions-title">
        <div className="section-head" style={{ marginBottom: '12px' }}>
          <h2 id="quick-actions-title" style={{ fontSize: '16px', margin: 0, fontWeight: 700 }}>
            Quick Actions
          </h2>
          <span className="muted small">Frequent tasks & tools</span>
        </div>

        <div className="quick-actions-grid">
          <button
            type="button"
            className="quick-action-btn"
            onClick={() => (onAction ? onAction('add') : onOpen('all'))}
          >
            <span className="quick-action-icon" aria-hidden="true">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </span>
            <span className="quick-action-label">Add Member</span>
          </button>

          <button
            type="button"
            className="quick-action-btn"
            onClick={() => (onAction ? onAction('scan') : onOpen('all'))}
          >
            <span className="quick-action-icon" aria-hidden="true">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </span>
            <span className="quick-action-label">Scan Register</span>
          </button>

          <button
            type="button"
            className="quick-action-btn"
            onClick={() => (onAction ? onAction('payments') : onOpen('due'))}
          >
            <span className="quick-action-icon" aria-hidden="true">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </span>
            <span className="quick-action-label">Record Payment</span>
          </button>

          <button
            type="button"
            className="quick-action-btn"
            onClick={() => onOpen('all')}
          >
            <span className="quick-action-icon" aria-hidden="true">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
            <span className="quick-action-label">All Members ({members.length})</span>
          </button>
        </div>
      </section>

      {/* 5. Expiry & Dues Breakdown Lists */}
      <div className="grid-2">
        {/* Expiring Members List */}
        <section className="card" aria-labelledby="expiring-soon-title">
          <div className="section-head">
            <div>
              <h3 id="expiring-soon-title" style={{ margin: 0, fontSize: '15px' }}>Expiring Soon</h3>
              <span className="muted small">Next 7 days</span>
            </div>
            <button type="button" className="link" onClick={() => onOpen('expiring')}>
              View all ({expiring.length})
            </button>
          </div>

          {expiring.length === 0 ? (
            <p className="muted small" style={{ padding: '16px 0', margin: 0 }}>
              No memberships expiring in the next 7 days.
            </p>
          ) : (
            <ul className="list">
              {expiring.slice(0, 6).map((m) => {
                const initials = m.name ? m.name.slice(0, 2).toUpperCase() : 'GM'
                return (
                  <li key={m.id}>
                    <div className="list-item-main">
                      <div className="avatar-initials">{initials}</div>
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
                      <span className="muted small block font-mono" style={{ marginTop: '2px', fontSize: '11.5px' }}>
                        {formatDate(m.end_date)}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Payment Due List */}
        <section className="card" aria-labelledby="payment-due-title">
          <div className="section-head">
            <div>
              <h3 id="payment-due-title" style={{ margin: 0, fontSize: '15px' }}>Payment Due</h3>
              <span className="muted small">Outstanding balances</span>
            </div>
            <button type="button" className="link" onClick={() => onOpen('due')}>
              View all ({due.length})
            </button>
          </div>

          {due.length === 0 ? (
            <p className="muted small" style={{ padding: '16px 0', margin: 0 }}>
              All member payments are clear.
            </p>
          ) : (
            <ul className="list">
              {due.slice(0, 6).map((m) => {
                const initials = m.name ? m.name.slice(0, 2).toUpperCase() : 'GM'
                const balance = dueAmount(m)
                return (
                  <li key={m.id}>
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
                        style={{ fontSize: '12px', marginTop: '4px' }}
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
