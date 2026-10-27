import { useState } from 'react'
import {
  dueAmount,
  formatMoney,
  formatDate,
  getMemberFacility,
  hasPersonalTrainer,
  getTrainerName,
  collectionRate,
} from '../lib/utils'

export default function Payments({ members, onCollectPayment, onEditMember }) {
  const [filter, setFilter] = useState('due') // 'all' | 'due' | 'paid'
  const [search, setSearch] = useState('')

  const dueMembers = members.filter((m) => dueAmount(m) > 0)
  const paidMembers = members.filter((m) => dueAmount(m) === 0)

  const totalCollected = members.reduce((s, m) => s + Number(m.paid_amount || 0), 0)
  const totalDue = dueMembers.reduce((s, m) => s + dueAmount(m), 0)
  const clearPercent = collectionRate(members)

  const q = search.trim().toLowerCase()
  const filteredList = members
    .filter((m) => {
      if (filter === 'due') return dueAmount(m) > 0
      if (filter === 'paid') return dueAmount(m) === 0
      return true
    })
    .filter(
      (m) =>
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        getMemberFacility(m).toLowerCase().includes(q) ||
        getTrainerName(m).toLowerCase().includes(q) ||
        (m.plan && m.plan.toLowerCase().includes(q))
    )
    .sort((a, b) => dueAmount(b) - dueAmount(a))

  return (
    <div>
      <div className="section-head" style={{ marginBottom: '16px' }}>
        <div>
          <h2>Payments & Billing</h2>
        </div>
      </div>

      {/* Payment Metrics */}
      <div className="summary-grid" style={{ marginBottom: '20px' }}>
        <div className="summary-card success">
          <div className="summary-card-head">
            <span className="summary-card-label">Total Collected</span>
            <div className="summary-card-icon">₹</div>
          </div>
          <div className="summary-card-value">{formatMoney(totalCollected)}</div>
          <div className="summary-card-sub">
            <span style={{ color: 'var(--success)', fontWeight: 600 }}>{clearPercent}%</span> collected of total expected
          </div>
        </div>

        <div className="summary-card danger">
          <div className="summary-card-head">
            <span className="summary-card-label">Outstanding Due</span>
            <div className="summary-card-icon" style={{ color: 'var(--danger)' }} aria-hidden="true">
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
            Across <b>{dueMembers.length}</b> member{dueMembers.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="summary-card accent">
          <div className="summary-card-head">
            <span className="summary-card-label">Collection Rate</span>
            <div className="summary-card-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
          <div className="summary-card-value">{clearPercent}%</div>
          <div className="summary-card-sub">
            <b>{paidMembers.length}</b> fully cleared memberships
          </div>
        </div>
      </div>

      {/* Toolbar & Filter Chips */}
      <div className="toolbar">
        <div className="search-box">
          <span className="search-icon" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            placeholder="Search member name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="chips" style={{ margin: 0 }}>
          <button
            type="button"
            className={`chip ${filter === 'due' ? 'active' : ''}`}
            onClick={() => setFilter('due')}
          >
            Payment Due <span>{dueMembers.length}</span>
          </button>
          <button
            type="button"
            className={`chip ${filter === 'paid' ? 'active' : ''}`}
            onClick={() => setFilter('paid')}
          >
            Fully Paid <span>{paidMembers.length}</span>
          </button>
          <button
            type="button"
            className={`chip ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Members <span>{members.length}</span>
          </button>
        </div>
      </div>

      {/* Payments Table / List */}
      {filteredList.length === 0 ? (
        <div className="card empty">
          {filter === 'due' ? 'No pending dues! All members are clear.' : 'No payment records found.'}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Plan & Facility</th>
                <th>Total Fee</th>
                <th>Paid Amount</th>
                <th>Due Balance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((m) => {
                const due = dueAmount(m)
                const initials = m.name ? m.name.slice(0, 2).toUpperCase() : 'GM'
                return (
                  <tr key={m.id}>
                    <td data-label="Member">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="avatar-initials" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                          {initials}
                        </div>
                        <div>
                          <b>{m.name}</b>
                          <span className="muted small block">{m.phone || 'No phone'}</span>
                        </div>
                      </div>
                    </td>

                    <td data-label="Plan & Facility">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600 }}>{m.plan || 'Standard'}</span>
                          <span className="badge blue" style={{ fontSize: '10px', padding: '1px 6px' }}>
                            {getMemberFacility(m)}
                          </span>
                          {hasPersonalTrainer(m) && (
                            <span
                              className="badge purple"
                              style={{ fontSize: '10px', padding: '1px 6px' }}
                              title={getTrainerName(m) ? `Trainer: ${getTrainerName(m)}` : 'Personal Trainer'}
                            >
                              PT
                            </span>
                          )}
                        </div>
                        <span className="muted small block">Joined {formatDate(m.start_date)}</span>
                      </div>
                    </td>

                    <td data-label="Total Fee">
                      <b>{formatMoney(m.total_fee)}</b>
                    </td>

                    <td data-label="Paid Amount">
                      <span style={{ color: 'var(--success)', fontWeight: 600 }}>{formatMoney(m.paid_amount)}</span>
                    </td>

                    <td data-label="Due Balance">
                      {due > 0 ? (
                        <span className="badge red">{formatMoney(due)} due</span>
                      ) : (
                        <span className="badge green">Cleared</span>
                      )}
                    </td>

                    <td className="actions">
                      {due > 0 ? (
                        <button
                          type="button"
                          className="btn sm primary"
                          onClick={() => onCollectPayment(m)}
                        >
                          Collect Payment
                        </button>
                      ) : (
                        // D2: fully-paid members have nothing to collect and the
                        // payment form cannot accept an amount (due is 0), so the
                        // old "Edit Payment" action was a dead end. Route to the
                        // existing Member Edit dialog instead.
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() => onEditMember && onEditMember(m)}
                        >
                          Edit Member
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
