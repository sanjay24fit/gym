import { useState } from 'react'
import Modal from './Modal'
import MemberForm from './MemberForm'
import PaymentForm from './PaymentForm'
import NotebookScanner from './NotebookScanner'
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

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'expiring', label: 'Expiring soon' },
  { key: 'expiring_2d', label: '⏰ Expiring (2 Days)' },
  { key: 'expired', label: 'Expired' },
  { key: 'due', label: 'Payment due' },
  { key: 'pt', label: 'Personal Trainer' },
]

const STATUS_BADGE = {
  active: ['green', 'Active'],
  expiring: ['amber', 'Expiring'],
  expired: ['gray', 'Expired'],
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

  // N6: keep the dialog in sync with the App-level shortcut prop, so
  // Dashboard → Add/Scan also works if this component stays mounted.
  // Render-time adjustment (React docs pattern) — no effect, no extra render.
  // A null prop never closes or reopens a dialog (closing is user-controlled).
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
        m.phone.includes(q) ||
        getMemberFacility(m).toLowerCase().includes(q) ||
        getTrainerName(m).toLowerCase().includes(q) ||
        (m.plan && m.plan.toLowerCase().includes(q))
    )
    .sort((a, b) => a.end_date.localeCompare(b.end_date))

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

    // Payment flow: same single-column paid_amount update as the App-level
    // PaymentForm (Payments tab / Dashboard dues) — shared helper (T01 S1).
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

    // Fallback if Postgres columns 'facility', 'personal_trainer', or 'trainer_name' are not yet created in Supabase
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
    <div>
      {/* Page Header */}
      <div className="section-head" style={{ marginBottom: '16px' }}>
        <div>
          <h2>Members</h2>
          <span className="muted small">Manage members, memberships, and renewal status</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn" onClick={() => setDialog({ type: 'scan' })}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span>Scan Register</span>
          </button>
          <button type="button" className="btn primary" onClick={() => setDialog({ type: 'add' })}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Toolbar: Search & Action */}
      <div className="toolbar">
        <div className="search-box">
          <span className="search-icon" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            placeholder="Search member, mobile, facility, or trainer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Chips */}
        <div className="chips" style={{ margin: 0 }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`chip ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label} <span>{members.filter((m) => matchesFilter(m, f.key)).length}</span>
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="card empty">
          {members.length === 0 ? 'No members found yet. Click "+ Add Member" or "Scan Register" to start.' : 'No matching members found.'}
        </div>
      ) : (
        <div className="members-card-table-wrap">
          <table className="members-card-table">
            <thead>
              <tr>
                <th>
                  <div className="th-content">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span>MEMBER</span>
                  </div>
                </th>
                <th>
                  <div className="th-content">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    </svg>
                    <span>PLAN & FACILITY</span>
                  </div>
                </th>
                <th>
                  <div className="th-content">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 22h14" />
                      <path d="M5 2h14" />
                      <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
                      <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
                    </svg>
                    <span>EXPIRY</span>
                  </div>
                </th>
                <th>
                  <div className="th-content">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                      <line x1="1" y1="10" x2="23" y2="10" />
                    </svg>
                    <span>PAYMENT</span>
                  </div>
                </th>
                <th aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => {
                const status = membershipStatus(m) // 'active' | 'expiring' | 'expired'
                const [tone, label] = STATUS_BADGE[status] || ['gray', 'Active']
                const due = dueAmount(m)
                const initials = m.name ? m.name.slice(0, 2).toUpperCase() : 'GM'
                const days = daysLeft(m.end_date)

                return (
                  <tr key={m.id} className={`status-${status}`}>
                    {/* Column 1: MEMBER */}
                    <td data-label="Member">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '999px',
                            background: 'var(--accent-light, #E6F7EF)',
                            color: 'var(--primary, #0B4D32)',
                            fontSize: '13.5px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text)', lineHeight: 1.25 }}>
                            {m.name}
                          </div>
                          <span style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '2px', display: 'block' }}>
                            {m.phone || 'No phone'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Column 2: PLAN & FACILITY */}
                    <td data-label="Plan & Facility">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>
                            {m.plan || 'Standard'}
                          </span>

                          <span className="member-pill-badge facility">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M6 5v14M18 5v14M2 9v6M22 9v6M6 12h12" />
                            </svg>
                            <span>{getMemberFacility(m)}</span>
                          </span>

                          {hasPersonalTrainer(m) && (
                            <span
                              className="member-pill-badge pt"
                              title={getTrainerName(m) ? `Personal Trainer: ${getTrainerName(m)}` : 'Personal Trainer Included'}
                            >
                              PT{getTrainerName(m) ? `: ${getTrainerName(m)}` : ''}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--muted)' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          <span>Joined {formatDate(m.start_date)}</span>
                        </div>
                      </div>
                    </td>

                    {/* Column 3: EXPIRY */}
                    <td data-label="Expiry">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <div>
                          <span className={`member-pill-badge ${status}`}>
                            {status === 'active' ? (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="12" r="10" />
                                <path d="m9 12 2 2 4-4" stroke="#ffffff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            ) : status === 'expiring' ? (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                              </svg>
                            ) : (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                              </svg>
                            )}
                            <span>{label}</span>
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--muted)' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <span>{formatDate(m.end_date)} · {expiryText(m.end_date)}</span>
                        </div>
                      </div>
                    </td>

                    {/* Column 4: PAYMENT */}
                    <td data-label="Payment">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <div>
                          {due > 0 ? (
                            <span className="member-pill-badge due">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                              </svg>
                              <span>{formatMoney(due)} due</span>
                            </span>
                          ) : (
                            <span className="member-pill-badge paid">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="12" r="10" />
                                <path d="m9 12 2 2 4-4" stroke="#ffffff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <span>Paid</span>
                            </span>
                          )}
                        </div>

                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'monospace, system-ui' }}>
                          {formatMoney(m.paid_amount)} / {formatMoney(m.total_fee)}
                        </span>
                      </div>
                    </td>

                    {/* Column 5: ACTIONS */}
                    <td data-label="Actions" className="actions">
                      <div className="member-actions-row">
                        {onPreviewMemberPass && (
                          <button
                            type="button"
                            className="member-action-pill pass"
                            title="View & Share Member Pass"
                            onClick={() => onPreviewMemberPass(m)}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                              <line x1="1" y1="10" x2="23" y2="10" />
                            </svg>
                            <span>Pass</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="member-action-pill renew"
                          onClick={() => setDialog({ type: 'renew', member: m })}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                          </svg>
                          <span>Renew</span>
                        </button>

                        <button
                          type="button"
                          className="member-action-pill edit"
                          onClick={() => setDialog({ type: 'edit', member: m })}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                          </svg>
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          className="member-action-pill remove"
                          onClick={() => promptRemove(m)}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          <span>Remove</span>
                        </button>

                        {due > 0 && (
                          <button
                            type="button"
                            className="member-action-pill pay"
                            onClick={() => setDialog({ type: 'pay', member: m })}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="2" y="5" width="20" height="14" rx="2" />
                              <line x1="2" y1="10" x2="22" y2="10" />
                            </svg>
                            <span>Pay</span>
                          </button>
                        )}

                        {days <= 2 && days >= 0 && (
                          <button
                            type="button"
                            className="member-action-pill whatsapp"
                            title="Send 2-Day Expiry WhatsApp Notification"
                            onClick={() => handleSendExpiryWhatsApp(m)}
                          >
                            <WhatsAppIcon size={12} />
                            <span>Remind</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
        <NotebookScanner
          existingMembers={members}
          onImportSuccess={async () => {
            setDialog(null)
            await reload()
          }}
          onClose={() => setDialog(null)}
        />
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
