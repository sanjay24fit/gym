import { dueAmount, expiryText, formatDate, formatMoney, membershipStatus } from '../lib/utils'

export default function Dashboard({ members, onOpen }) {
  const active = members.filter((m) => membershipStatus(m) !== 'expired')
  const expiring = members
    .filter((m) => membershipStatus(m) === 'expiring')
    .sort((a, b) => a.end_date.localeCompare(b.end_date))
  const expired = members.filter((m) => membershipStatus(m) === 'expired')
  const due = members.filter((m) => dueAmount(m) > 0).sort((a, b) => dueAmount(b) - dueAmount(a))
  const totalDue = due.reduce((s, m) => s + dueAmount(m), 0)

  const cards = [
    { key: 'all', label: 'Total members', value: members.length, tone: 'blue' },
    { key: 'active', label: 'Active memberships', value: active.length, tone: 'green' },
    { key: 'due', label: 'Payment due', value: due.length, sub: formatMoney(totalDue), tone: 'red' },
    { key: 'expiring', label: 'Expiring in 7 days', value: expiring.length, tone: 'amber' },
    { key: 'expired', label: 'Expired', value: expired.length, tone: 'gray' },
  ]

  return (
    <div>
      <div className="stats">
        {cards.map((c) => (
          <button key={c.key} className={`stat ${c.tone}`} onClick={() => onOpen(c.key)}>
            <span className="stat-label">{c.label}</span>
            <span className="stat-value">{c.value}</span>
            {c.sub && <span className="stat-sub">{c.sub}</span>}
          </button>
        ))}
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="section-head">
            <h3>Membership expiring soon</h3>
            <button className="link" onClick={() => onOpen('expiring')}>View all</button>
          </div>
          {expiring.length === 0 ? (
            <p className="muted">No memberships expiring in the next 7 days.</p>
          ) : (
            <ul className="list">
              {expiring.slice(0, 8).map((m) => (
                <li key={m.id}>
                  <div>
                    <b>{m.name}</b>
                    <span className="muted small">{m.phone}</span>
                  </div>
                  <div className="right">
                    <span className="badge amber">{expiryText(m.end_date)}</span>
                    <span className="muted small">{formatDate(m.end_date)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="section-head">
            <h3>Payment due</h3>
            <button className="link" onClick={() => onOpen('due')}>View all</button>
          </div>
          {due.length === 0 ? (
            <p className="muted">All payments are clear.</p>
          ) : (
            <ul className="list">
              {due.slice(0, 8).map((m) => (
                <li key={m.id}>
                  <div>
                    <b>{m.name}</b>
                    <span className="muted small">{m.phone}</span>
                  </div>
                  <div className="right">
                    <span className="badge red">{formatMoney(dueAmount(m))} due</span>
                    <span className="muted small">Paid {formatMoney(m.paid_amount)} / {formatMoney(m.total_fee)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
