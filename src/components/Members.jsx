import { useState, lazy, Suspense } from 'react'
import Modal from './Modal'
import MemberForm from './MemberForm'
import PaymentForm from './PaymentForm'
const NotebookScanner = lazy(() => import('./NotebookScanner'))
import { supabase } from '../lib/supabase'
import { updateMemberPayment } from '../lib/payments'
import { WhatsAppIcon } from './WhatsAppSupport'
import {
  dueAmount,
  daysLeft,
  expiryText,
  formatDate,
  formatMoney,
  membershipStatus,
  getMemberFacility,
  hasPersonalTrainer,
  getTrainerName,
  isSchemaDriftError,
  buildFallbackMemberValues,
} from '../lib/utils'
import { buildWhatsAppReminderUrl, markReminderSent } from '../lib/whatsappReminder'

function getInitials(name) {
  if (!name) return 'GM'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function formatPhoneDisplay(phone) {
  if (!phone) return 'No phone'
  let p = phone.trim()
  if (p.startsWith('+91')) {
    p = p.slice(3).trim()
  }
  if (p.length === 10) {
    return `+91 ${p.slice(0, 5)} ${p.slice(5)}`
  }
  return p.startsWith('+') ? p : `+91 ${p}`
}

function matchesFilter(m, filter) {
  const s = membershipStatus(m)
  if (filter === 'active') return s !== 'expired'
  if (filter === 'expiring') return s === 'expiring'
  if (filter === 'expiring_2d') return daysLeft(m.end_date) === 2 || (daysLeft(m.end_date) <= 2 && daysLeft(m.end_date) >= 0)
  if (filter === 'expired') return s === 'expired'
  if (filter === 'due') return dueAmount(m) > 0
  if (filter === 'pt') return hasPersonalTrainer(m)
  return true
}

export default function Members({
  members,
  filter,
  setFilter,
  reload,
  initialDialog = null,
  onPreviewMemberPass = null,
  gym = null,
}) {
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState(initialDialog) // { type: 'add'|'edit'|'renew'|'pay'|'remove'|'scan', member }
  const [prevInitialDialog, setPrevInitialDialog] = useState(initialDialog)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  if (initialDialog !== prevInitialDialog) {
    setPrevInitialDialog(initialDialog)
    if (initialDialog) setDialog(initialDialog)
  }

  const q = search.trim().toLowerCase()
  const list = members
    .filter((m) => matchesFilter(m, filter))
    .filter(
      (m) =>
        !q ||
        m.name.toLowerCase().includes(q) ||
        (m.phone && m.phone.includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        getMemberFacility(m).toLowerCase().includes(q) ||
        getTrainerName(m).toLowerCase().includes(q) ||
        (m.plan && m.plan.toLowerCase().includes(q))
    )
    .sort((a, b) => (a.end_date || '').localeCompare(b.end_date || ''))

  const allCount = members.length
  const activeCount = members.filter((m) => membershipStatus(m) !== 'expired').length
  const expiringCount = members.filter((m) => membershipStatus(m) === 'expiring').length
  const expiredCount = members.filter((m) => membershipStatus(m) === 'expired').length
  const dueCount = members.filter((m) => dueAmount(m) > 0).length

  const handleSendExpiryWhatsApp = (m) => {
    const left = daysLeft(m.end_date)
    const url = buildWhatsAppReminderUrl({
      phone: m.phone,
      memberName: m.name,
      gymName: gym?.gym_name,
      endDate: m.end_date,
      daysLeftCount: left,
      ownerPhone: gym?.phone,
    })
    markReminderSent(m.id, m.end_date)
    window.open(url, '_blank')
  }

  async function save(values) {
    const { type, member } = dialog

    if (type === 'pay') {
      const errMsg = await updateMemberPayment(member.id, values.paid_amount)
      if (errMsg) return errMsg
      setDialog(null)
      await reload()
      return
    }

    let res =
      type === 'add'
        ? await supabase.from('members').insert(values)
        : await supabase.from('members').update(values).eq('id', member.id)

    if (res.error && isSchemaDriftError(res.error)) {
      res =
        type === 'add'
          ? await supabase.from('members').insert(buildFallbackMemberValues(values))
          : await supabase.from('members').update(buildFallbackMemberValues(values)).eq('id', member.id)
    }

    if (res.error) return res.error.message
    setDialog(null)
    await reload()
  }

  function promptRemove(m) {
    setDeleteError('')
    setDialog({ type: 'remove', member: m })
  }

  async function confirmRemove(m) {
    setDeleting(true)
    setDeleteError('')
    const { error } = await supabase.from('members').delete().eq('id', m.id)
    setDeleting(false)
    if (error) {
      setDeleteError(error.message)
      return
    }
    setDialog(null)
    await reload()
  }

  return (
    <div className="members-directory-container">
      {/* 1. Header with Title & Add Member Pill Button */}
      <div className="member-directory-header">
        <div>
          <h2 className="member-directory-title">{gym?.gym_name || 'Gym Dashboard'}</h2>
          <span className="member-directory-subtitle">Member Directory</span>
        </div>
        <div className="member-header-actions">
          <button
            type="button"
            className="btn-scan-action"
            title="Scan Register Notebook"
            onClick={() => setDialog({ type: 'scan' })}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span className="btn-scan-label">Scan</span>
          </button>
          <button
            type="button"
            className="btn-add-member-pill"
            onClick={() => setDialog({ type: 'add' })}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* 2. Search Input & Filter Button */}
      <div className="member-search-container">
        <div className="member-search-input-wrap">
          <svg className="member-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="member-search-input"
            placeholder="Search members by name, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="member-search-clear"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        <button
          type="button"
          className="member-filter-icon-btn"
          title="Filter members"
          onClick={() => {
            const order = ['all', 'active', 'expiring', 'expired', 'due']
            const next = order[(order.indexOf(filter) + 1) % order.length]
            setFilter(next)
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="7" y1="12" x2="17" y2="12" />
            <line x1="10" y1="18" x2="14" y2="18" />
          </svg>
        </button>
      </div>

      {/* 3. Filter Chips Row */}
      <div className="member-chips-scroll">
        <button
          type="button"
          className={`member-chip ${filter === 'all' ? 'active' : 'chip-all'}`}
          onClick={() => setFilter('all')}
        >
          All ({allCount})
        </button>
        <button
          type="button"
          className={`member-chip ${filter === 'active' ? 'active' : 'chip-active'}`}
          onClick={() => setFilter('active')}
        >
          Active ({activeCount})
        </button>
        <button
          type="button"
          className={`member-chip ${filter === 'expiring' ? 'active' : 'chip-expiring'}`}
          onClick={() => setFilter('expiring')}
        >
          Expiring Soon ({expiringCount})
        </button>
        <button
          type="button"
          className={`member-chip ${filter === 'expired' ? 'active' : 'chip-expired'}`}
          onClick={() => setFilter('expired')}
        >
          Expired ({expiredCount})
        </button>
        {dueCount > 0 && (
          <button
            type="button"
            className={`member-chip ${filter === 'due' ? 'active' : 'chip-due'}`}
            onClick={() => setFilter('due')}
          >
            Payment Due ({dueCount})
          </button>
        )}
      </div>

      {/* 4. Systematic Member Cards Grid */}
      {list.length === 0 ? (
        <div className="card empty member-empty-state">
          {members.length === 0
            ? 'No members registered yet. Click "+ Add Member" or "Scan" to get started.'
            : 'No matching members found.'}
        </div>
      ) : (
        <div className="member-cards-grid">
          {list.map((m) => {
            const status = membershipStatus(m) // 'active' | 'expiring' | 'expired'
            const due = dueAmount(m)
            const days = daysLeft(m.end_date)
            const initials = getInitials(m.name)
            const displayPhone = formatPhoneDisplay(m.phone)
            const facility = getMemberFacility(m)
            const isExpiringSoon = status === 'expiring'
            const isExpired = status === 'expired'

            return (
              <div key={m.id} className="member-directory-card">
                {/* Row 1: Avatar + Name & Phone */}
                <div className="member-card-header">
                  <div className="member-card-avatar">
                    {initials}
                  </div>
                  <div className="member-card-info">
                    <h3 className="member-card-name">{m.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span className="member-card-phone">{displayPhone}</span>
                      {m.email ? (
                        <span className="muted small font-mono" style={{ fontSize: '11px' }}>{m.email}</span>
                      ) : (
                        <span
                          className="badge amber"
                          style={{ fontSize: '10px', padding: '1px 5px', cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation()
                            setDialog({ type: 'edit', member: m })
                          }}
                          title="Click to add email address for member login"
                        >
                          ⚠️ Needs Email
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Row 2: Plan & Facility Badge */}
                <div className="member-card-plan-row">
                  <span className="member-card-plan-name">{m.plan || '1 Month'}</span>
                  <span className="member-card-bullet">·</span>
                  <span className="member-card-facility-badge">{facility}</span>
                  {hasPersonalTrainer(m) && (
                    <span
                      className="member-card-pt-badge"
                      title={getTrainerName(m) ? `Trainer: ${getTrainerName(m)}` : 'Personal Trainer'}
                    >
                      PT{getTrainerName(m) ? `: ${getTrainerName(m)}` : ''}
                    </span>
                  )}
                </div>

                {/* Row 3: Joined Date */}
                <div className="member-card-joined-row">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>Joined: {formatDate(m.start_date)}</span>
                </div>

                {/* Row 4: Expiry Status Pill */}
                <div className={`member-card-status-pill ${isExpired ? 'expired' : isExpiringSoon ? 'expiring' : 'active'}`}>
                  {isExpired ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <span>Expired ({Math.abs(days)} day{Math.abs(days) === 1 ? '' : 's'} ago · {formatDate(m.end_date)})</span>
                    </>
                  ) : isExpiringSoon ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <span>Expiring soon · {days === 0 ? 'Expires today' : `${days} days left`} ({formatDate(m.end_date)})</span>
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m9 12 2 2 4-4" stroke="#ffffff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>Active · {days} days left ({formatDate(m.end_date)})</span>
                    </>
                  )}
                </div>

                {/* Row 5: Payment Status Pill */}
                <div
                  className={`member-card-payment-pill ${due > 0 ? 'due' : 'paid'}`}
                  onClick={due > 0 ? () => setDialog({ type: 'pay', member: m }) : undefined}
                  style={{ cursor: due > 0 ? 'pointer' : 'default' }}
                  title={due > 0 ? 'Click to record payment' : 'Payment Completed'}
                >
                  {due > 0 ? (
                    <>
                      <div className="member-card-payment-text">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>{formatMoney(due)} Due · Paid {formatMoney(m.paid_amount)} / {formatMoney(m.total_fee)}</span>
                      </div>
                      <span className="member-card-pay-hint">Pay &rarr;</span>
                    </>
                  ) : (
                    <div className="member-card-payment-text">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m9 12 2 2 4-4" stroke="#ffffff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>Paid · {formatMoney(m.paid_amount)} / {formatMoney(m.total_fee)}</span>
                    </div>
                  )}
                </div>

                {/* Row 6: 2x2 Action Buttons Grid */}
                <div className="member-card-actions-grid">
                  <button
                    type="button"
                    className="member-card-btn view-pass"
                    onClick={() => {
                      if (onPreviewMemberPass) {
                        onPreviewMemberPass(m)
                      } else {
                        setDialog({ type: 'edit', member: m })
                      }
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="5" width="20" height="14" rx="2" />
                      <line x1="2" y1="10" x2="22" y2="10" />
                    </svg>
                    <span>View Pass</span>
                  </button>

                  <button
                    type="button"
                    className="member-card-btn renew"
                    onClick={() => setDialog({ type: 'renew', member: m })}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                    <span>Renew</span>
                  </button>

                  <button
                    type="button"
                    className="member-card-btn edit-profile"
                    onClick={() => setDialog({ type: 'edit', member: m })}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                    <span>Edit Profile</span>
                  </button>

                  <button
                    type="button"
                    className="member-card-btn remove"
                    onClick={() => promptRemove(m)}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    <span>Remove</span>
                  </button>
                </div>

                {/* Optional WhatsApp Reminder for expiry <= 2 days */}
                {days <= 2 && days >= 0 && (
                  <div className="member-card-whatsapp-wrap">
                    <button
                      type="button"
                      className="member-card-btn-whatsapp"
                      title="Send WhatsApp Expiry Reminder"
                      onClick={() => handleSendExpiryWhatsApp(m)}
                    >
                      <WhatsAppIcon size={14} />
                      <span>Send WhatsApp Expiry Reminder</span>
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Remove Confirmation Modal */}
      {dialog && dialog.type === 'remove' && (
        <Modal title="Remove Member" onClose={() => !deleting && setDialog(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.5 }}>
              Are you sure you want to remove <b>{dialog.member.name}</b> from gym records?
            </p>
            {dueAmount(dialog.member) > 0 && (
              <div className="alert error">
                Pending balance: <b>{formatMoney(dueAmount(dialog.member))}</b> due.
              </div>
            )}
            <p className="muted small" style={{ margin: 0 }}>
              This will permanently delete this member's details and records.
            </p>
            {deleteError && <div className="alert error">{deleteError}</div>}
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setDialog(null)} disabled={deleting}>
                Cancel
              </button>
              <button
                type="button"
                className="btn danger-solid"
                disabled={deleting}
                onClick={() => confirmRemove(dialog.member)}
              >
                {deleting ? 'Removing…' : 'Remove Member'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Notebook Scanner Modal */}
      {dialog && dialog.type === 'scan' && (
        <Suspense fallback={<div className="modal-backdrop"><div className="card loading-card" style={{ padding: '24px', textAlign: 'center' }}>Loading Scanner…</div></div>}>
          <NotebookScanner
            existingMembers={members}
            onImportSuccess={async () => {
              setDialog(null)
              await reload()
            }}
            onClose={() => setDialog(null)}
          />
        </Suspense>
      )}

      {/* Payment Form Modal */}
      {dialog && dialog.type === 'pay' && (
        <PaymentForm member={dialog.member} onSave={save} onClose={() => setDialog(null)} />
      )}

      {/* Member Form Modal */}
      {dialog && ['add', 'edit', 'renew'].includes(dialog.type) && (
        <MemberForm
          member={dialog.member}
          renew={dialog.type === 'renew'}
          onSave={save}
          onDelete={promptRemove}
          onPreviewPass={onPreviewMemberPass ? () => { const m = dialog.member; setDialog(null); onPreviewMemberPass(m); } : null}
          onScanNotebook={() => setDialog({ type: 'scan' })}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}
