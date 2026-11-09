import { useState } from 'react'
import { formatDate, formatMoney, dueAmount } from '../../lib/utils'
import { generateMemberUpiUri, normalizePhone } from '../../lib/memberPortal'

export default function MemberPaymentsTab({ member, gym, paymentHistory = [] }) {
  const [filter, setFilter] = useState('all') // 'all' | 'successful' | 'pending'
  const [selectedReceipt, setSelectedReceipt] = useState(null)

  const due = dueAmount(member)
  const gymPhone = gym?.phone || ''
  const cleanPhone = normalizePhone(gymPhone)
  const upiLink = generateMemberUpiUri(gymPhone, gym?.gym_name, due > 0 ? due : '', member.name)

  const handleWhatsAppPayment = () => {
    const msg = `Hi ${gym?.owner_name || 'Gym Manager'}, I have made a payment of ${formatMoney(due)} for my membership at *${gym?.gym_name || 'Gym'}*. Please verify my transaction receipt.`
    const url = cleanPhone ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  // Filter payment list
  const filteredRecords = paymentHistory.filter((_p) => {
    if (filter === 'successful') return true // all logged payments are confirmed
    if (filter === 'pending') return false
    return true
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* ==============================================================
          A. FINANCIAL SUMMARY OVERVIEW
      ============================================================== */}
      <div
        className="card"
        style={{
          borderLeft: due > 0 ? '4px solid var(--danger, #ef4444)' : '4px solid var(--success, #10b981)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Account & Payment Status</h2>
            <span className="muted xs">Authoritative billing ledger managed by {gym?.gym_name || 'Gym'}</span>
          </div>

          {due > 0 ? (
            <span className="badge red" style={{ fontSize: '12px', padding: '4px 10px' }}>
              Pending Due: {formatMoney(due)}
            </span>
          ) : (
            <span className="badge green" style={{ fontSize: '12px', padding: '4px 10px' }}>
              ✓ Fully Paid
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: '12px', textAlign: 'center' }}>
            <span className="muted xs block">Total Fee</span>
            <b style={{ fontSize: '18px' }}>{formatMoney(member.total_fee)}</b>
          </div>
          <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: '12px', textAlign: 'center' }}>
            <span className="muted xs block">Total Paid</span>
            <b style={{ fontSize: '18px', color: 'var(--success, #10b981)' }}>{formatMoney(member.paid_amount)}</b>
          </div>
          <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: '12px', textAlign: 'center' }}>
            <span className="muted xs block">Balance Due</span>
            <b style={{ fontSize: '18px', color: due > 0 ? 'var(--danger, #ef4444)' : 'var(--muted)' }}>
              {formatMoney(due)}
            </b>
          </div>
        </div>

        {due > 0 && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="alert warning small" style={{ margin: 0 }}>
              ⚠️ You have an outstanding balance of <b>{formatMoney(due)}</b>. You can pay via UPI or settle at the desk.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: cleanPhone ? '1fr 1fr' : '1fr', gap: '10px' }}>
              {cleanPhone && (
                <a
                  href={upiLink}
                  className="btn primary full"
                  style={{ textAlign: 'center', textDecoration: 'none', padding: '10px' }}
                >
                  ⚡ Pay {formatMoney(due)} via UPI
                </a>
              )}
              <button
                type="button"
                className="btn secondary full"
                onClick={handleWhatsAppPayment}
                style={{ padding: '10px' }}
              >
                💬 Send Payment Proof
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==============================================================
          B. TRANSACTION HISTORY
      ============================================================== */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Payment Transactions</h3>
          <div className="chips" style={{ margin: 0 }}>
            <button
              type="button"
              className={`chip ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              All Records
            </button>
            <button
              type="button"
              className={`chip ${filter === 'successful' ? 'active' : ''}`}
              onClick={() => setFilter('successful')}
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              Verified
            </button>
          </div>
        </div>

        {paymentHistory.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Show primary paid amount entry if no explicit ledger row exists */}
            {Number(member.paid_amount) > 0 ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  background: 'var(--bg-subtle, rgba(0,0,0,0.02))',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                }}
              >
                <div>
                  <b style={{ fontSize: '14px' }}>Initial Enrollment Fee</b>
                  <span className="muted xs block">
                    Recorded on {formatDate(member.start_date)} · Cash / Direct
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <b style={{ fontSize: '15px', color: 'var(--success, #10b981)' }}>
                    +{formatMoney(member.paid_amount)}
                  </b>
                  <span className="badge green" style={{ fontSize: '9.5px', marginLeft: '6px' }}>
                    Cleared
                  </span>
                </div>
              </div>
            ) : (
              <div className="empty" style={{ padding: '24px 12px', textAlign: 'center' }}>
                <p className="muted small" style={{ margin: 0 }}>No payment transactions recorded yet.</p>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredRecords.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedReceipt(item)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  background: 'var(--bg-subtle, rgba(0,0,0,0.02))',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <b style={{ fontSize: '14px' }}>{item.payment_method || 'Payment'}</b>
                  <span className="muted xs block">
                    {formatDate(item.payment_date)} {item.reference_no && `· Ref: ${item.reference_no}`}
                  </span>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <b style={{ fontSize: '15px', color: 'var(--success, #10b981)' }}>
                    +{formatMoney(item.amount)}
                  </b>
                  <span className="badge green" style={{ fontSize: '9.5px', marginLeft: '6px' }}>
                    Success
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ==============================================================
          C. DIGITAL RECEIPT MODAL
      ============================================================== */}
      {selectedReceipt && (
        <div className="modal-backdrop" onClick={() => setSelectedReceipt(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-head">
              <h3>Payment Receipt</h3>
              <button type="button" className="btn sm icon-btn" onClick={() => setSelectedReceipt(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px 0' }}>
              <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-subtle)', borderRadius: '12px' }}>
                <span className="muted xs block">Amount Paid</span>
                <span style={{ fontSize: '28px', fontWeight: 900, color: 'var(--success, #10b981)' }}>
                  {formatMoney(selectedReceipt.amount)}
                </span>
                <span className="badge green" style={{ fontSize: '11px', marginTop: '6px' }}>
                  Transaction Verified
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="muted">Gym Name</span>
                  <b>{gym?.gym_name}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="muted">Member</span>
                  <b>{member.name}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="muted">Date</span>
                  <span>{formatDate(selectedReceipt.payment_date)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="muted">Method</span>
                  <span>{selectedReceipt.payment_method}</span>
                </div>
                {selectedReceipt.reference_no && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted">Reference No</span>
                    <span style={{ fontFamily: 'monospace' }}>{selectedReceipt.reference_no}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="btn full primary"
                onClick={() => setSelectedReceipt(null)}
                style={{ marginTop: '8px' }}
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
