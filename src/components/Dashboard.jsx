import { dueAmount, expiryText, formatDate, formatMoney, membershipStatus, daysLeft } from '../lib/utils'

function getGreetingAndDate() {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
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

  const due = members.filter((m) => dueAmount(m) > 0).sort((a, b) => dueAmount(b) - dueAmount(a))
  const totalDue = due.reduce((s, m) => s + dueAmount(m), 0)
  const totalCollected = members.reduce((s, m) => s + Number(m.paid_amount || 0), 0)

  const { greeting, todayFormatted } = getGreetingAndDate()

  return (
    <div>
      {/* Welcome & Overview Header */}
      <div className="dash-welcome">
        <div>
          <h2 className="greeting-title">{greeting}, {gymName || 'Gym Owner'} 👋</h2>
          <div className="date-sub">{todayFormatted}</div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="badge green" style={{ padding: '6px 12px', fontSize: '13px' }}>
            ● Active Gym Portal
          </span>
        </div>
      </div>

      {/* Main Key Metrics Summary */}
      <div className="summary-grid">
        <div className="summary-card success">
          <div className="summary-card-head">
            <span className="summary-card-label">Total Collection</span>
            <div className="summary-card-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
          </div>
          <div className="summary-card-value">{formatMoney(totalCollected)}</div>
          <div className="summary-card-sub">
            <span style={{ color: 'var(--success)', fontWeight: 600 }}>Received</span> from member fees
          </div>
        </div>

        <div className="summary-card accent">
          <div className="summary-card-head">
            <span className="summary-card-label">Active Members</span>
            <div className="summary-card-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

        <div className="summary-card danger">
          <div className="summary-card-head">
            <span className="summary-card-label">Pending Dues</span>
            <div className="summary-card-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

      {/* Membership Alert Pills Row */}
      <div className="alerts-strip">
        <button type="button" className="alert-pill danger" onClick={() => onOpen('expired')}>
          <div className="alert-pill-label">Already Expired</div>
          <div className="alert-pill-count">{expired.length}</div>
        </button>

        <button type="button" className="alert-pill warning" onClick={() => onOpen('expiring')}>
          <div className="alert-pill-label">Expiring in 7 Days</div>
          <div className="alert-pill-count">{expiring.length}</div>
        </button>

        <button type="button" className="alert-pill blue" onClick={() => onOpen('due')}>
          <div className="alert-pill-label">Payment Due</div>
          <div className="alert-pill-count">{due.length}</div>
        </button>

        {expiringToday.length > 0 && (
          <button type="button" className="alert-pill warning" onClick={() => onOpen('expiring')}>
            <div className="alert-pill-label">Expiring Today</div>
            <div className="alert-pill-count" style={{ background: '#fef3c7', color: '#b45309' }}>
              {expiringToday.length}
            </div>
          </button>
        )}
      </div>

      {/* Quick Actions Grid */}
      <div className="quick-actions-bar">
        <h3>Quick Actions</h3>
        <div className="quick-actions-grid">
          <button
            type="button"
            className="quick-action-btn"
            onClick={() => (onAction ? onAction('add') : onOpen('all'))}
          >
            <span className="quick-action-icon" style={{ color: 'var(--accent)' }}>➕</span>
            <span>Add Member</span>
          </button>

          <button
            type="button"
            className="quick-action-btn"
            onClick={() => (onAction ? onAction('scan') : onOpen('all'))}
          >
            <span className="quick-action-icon" style={{ color: 'var(--success)' }}>📷</span>
            <span>Scan Register</span>
          </button>

          <button
            type="button"
            className="quick-action-btn"
            onClick={() => (onAction ? onAction('payments') : onOpen('due'))}
          >
            <span className="quick-action-icon" style={{ color: '#8b5cf6' }}>💳</span>
            <span>Record Payment</span>
          </button>

          <button
            type="button"
            className="quick-action-btn"
            onClick={() => onOpen('all')}
          >
            <span className="quick-action-icon" style={{ color: 'var(--primary)' }}>👥</span>
            <span>All Members ({members.length})</span>
          </button>

          <button
            type="button"
            className="quick-action-btn"
            onClick={() => (onAction ? onAction('download') : null)}
          >
            <span className="quick-action-icon" style={{ color: '#0284c7' }}>📲</span>
            <span>Download App</span>
          </button>
        </div>
      </div>

      {/* Expiry and Dues Breakdown Grid */}
      <div className="grid-2">
        {/* Expiring Members List */}
        <section className="card">
          <div className="section-head">
            <div>
              <h3>Expiring Soon</h3>
              <span className="muted small">Next 7 days</span>
            </div>
            <button className="link" onClick={() => onOpen('expiring')}>
              View all ({expiring.length})
            </button>
          </div>

          {expiring.length === 0 ? (
            <p className="muted small" style={{ padding: '16px 0' }}>
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
                        <b>{m.name}</b>
                        <span className="muted small">{m.plan || 'Standard'} · {m.phone || 'No phone'}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge amber">{expiryText(m.end_date)}</span>
                      <span className="muted small block">{formatDate(m.end_date)}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Payment Due List */}
        <section className="card">
          <div className="section-head">
            <div>
              <h3>Payment Due</h3>
              <span className="muted small">Outstanding balances</span>
            </div>
            <button className="link" onClick={() => onOpen('due')}>
              View all ({due.length})
            </button>
          </div>

          {due.length === 0 ? (
            <p className="muted small" style={{ padding: '16px 0' }}>
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
                      <div className="avatar-initials" style={{ background: '#fef2f2', color: 'var(--danger)' }}>
                        {initials}
                      </div>
                      <div className="list-item-text">
                        <b>{m.name}</b>
                        <span className="muted small">Paid {formatMoney(m.paid_amount)} / {formatMoney(m.total_fee)}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge red">{formatMoney(balance)} due</span>
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
