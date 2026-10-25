import { useState } from 'react'
import Modal from './Modal'
import MemberForm from './MemberForm'
import PaymentForm from './PaymentForm'
import NotebookScanner from './NotebookScanner'
import { supabase } from '../lib/supabase'
import {
  dueAmount,
  expiryText,
  formatDate,
  formatMoney,
  membershipStatus,
  getMemberFacility,
  hasPersonalTrainer,
  getTrainerName,
  generateIdempotencyKey,
} from '../lib/utils'

import { WhatsAppIcon } from './WhatsAppSupport'

function getMemberWhatsAppUrl(m) {
  if (!m || !m.phone) return null
  const cleanPhone = m.phone.replace(/[^0-9]/g, '')
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone
  const due = dueAmount(m)
  let text = `Hello ${m.name}! Greetings from the gym.`
  if (due > 0) {
    text = `Hello ${m.name}! This is a friendly reminder that a balance of ${formatMoney(due)} is pending for your gym membership (${m.plan || 'Standard'}). Please let us know if you need any assistance clearing it. Thank you!`
  } else {
    text = `Hello ${m.name}! Your gym membership (${m.plan || 'Standard'}) is active and valid until ${formatDate(m.end_date)}. Thank you for training with us!`
  }
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'expiring', label: 'Expiring soon' },
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
  if (filter === 'expired') return s === 'expired'
  if (filter === 'due') return dueAmount(m) > 0
  if (filter === 'pt') return hasPersonalTrainer(m)
  return true
}

export default function Members({ members, filter, setFilter, reload, initialDialog = null }) {
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState(initialDialog) // { type: 'add'|'edit'|'renew'|'pay'|'remove'|'scan', member }
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

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

  async function save(values) {
    const { type, member } = dialog

    if (type === 'pay') {
      const paymentAmount = Number(values.amount ?? (values.paid_amount - (member?.paid_amount || 0)))
      const { error } = await supabase.rpc('rpc_record_payment', {
        p_member_id: member.id,
        p_amount: paymentAmount,
        p_payment_method: values.payment_method || 'cash',
        p_notes: values.notes || 'Counter payment',
        p_idempotency_key: generateIdempotencyKey(),
      })
      if (error) {
        if (error.message?.includes('function') || error.code === '42883') {
          const res = await supabase.from('members').update({ paid_amount: values.paid_amount }).eq('id', member.id)
          if (res.error) return res.error.message
        } else {
          return error.message
        }
      }
      setDialog(null)
      await reload()
      return
    }

    if (type === 'renew') {
      const planFee = Number(values.plan_fee ?? values.total_fee) || 0
      const downPayment = Number(values.down_payment ?? values.paid_amount ?? 0)
      const { error } = await supabase.rpc('rpc_renew_membership', {
        p_member_id: member.id,
        p_plan_name: values.plan,
        p_start_date: values.start_date,
        p_end_date: values.end_date,
        p_plan_fee: planFee,
        p_down_payment: downPayment,
        p_payment_method: values.payment_method || 'cash',
        p_idempotency_key: generateIdempotencyKey(),
      })
      if (error) {
        if (error.message?.includes('function') || error.code === '42883') {
          const res = await supabase.from('members').update(values).eq('id', member.id)
          if (res.error) return res.error.message
        } else {
          return error.message
        }
      } else {
        // Also update any changed non-financial attributes (notes, facility, trainer)
        await supabase
          .from('members')
          .update({
            facility: values.facility,
            personal_trainer: values.personal_trainer,
            trainer_name: values.trainer_name,
            notes: values.notes,
          })
          .eq('id', member.id)
      }
      setDialog(null)
      await reload()
      return
    }

    // For Edit: omit total_fee and paid_amount so column-level lockdown is never violated
    const updatePayload =
      type === 'edit'
        ? {
            name: values.name,
            phone: values.phone,
            plan: values.plan,
            facility: values.facility,
            personal_trainer: values.personal_trainer,
            trainer_name: values.trainer_name,
            start_date: values.start_date,
            end_date: values.end_date,
            notes: values.notes,
          }
        : values

    let res =
      type === 'add'
        ? await supabase.from('members').insert(values)
        : await supabase.from('members').update(updatePayload).eq('id', member.id)

    // Fallback if Postgres columns 'facility', 'personal_trainer', or 'trainer_name' are not yet created in Supabase
    if (
      res.error &&
      (res.error.message?.includes('schema cache') ||
        res.error.message?.includes('facility') ||
        res.error.message?.includes('personal_trainer') ||
        res.error.message?.includes('trainer_name') ||
        res.error.code === 'PGRST204')
    ) {
      const ptTag = values.personal_trainer
        ? `[PT: Yes${values.trainer_name ? ` | Trainer: ${values.trainer_name}` : ''}]`
        : ''
      const facilityTag = `[Facility: ${values.facility || 'Gym & Fitness'}]`

      const cleanNotes = (values.notes || '')
        .replace(/\[Facility:[^\]]*\]/gi, '')
        .replace(/\[PT:[^\]]*\]/gi, '')
        .trim()
      const fallbackNotes = `${cleanNotes} ${facilityTag} ${ptTag}`.trim()

      const fallbackValues =
        type === 'edit'
          ? {
              name: values.name,
              phone: values.phone,
              plan: values.plan,
              start_date: values.start_date,
              end_date: values.end_date,
              notes: fallbackNotes,
            }
          : {
              name: values.name,
              phone: values.phone,
              plan: values.plan,
              start_date: values.start_date,
              end_date: values.end_date,
              total_fee: values.total_fee,
              paid_amount: values.paid_amount,
              notes: fallbackNotes,
            }

      res =
        type === 'add'
          ? await supabase.from('members').insert(fallbackValues)
          : await supabase.from('members').update(fallbackValues).eq('id', member.id)
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
      if (error.message?.includes('foreign key') || error.code === '23503') {
        setDeleteError('This member has recorded payment or renewal history and cannot be deleted. Historical financial records must be preserved.')
      } else {
        setDeleteError(error.message)
      }
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
          <h2>Members Directory</h2>
          <span className="muted small">Manage clients, memberships, and renewal status</span>
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
          {members.length === 0 ? 'No members registered yet. Click "+ Add member" or "Scan Register" to start.' : 'No members match the current filter/search.'}
        </div>
      ) : (
        <div className="members-listing-container">
          {/* 1. Desktop Tabular View (Displayed on screens >= 769px) */}
          <div className="table-wrap members-desktop-table">
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Plan & Facility</th>
                  <th>Expiry</th>
                  <th>Payment</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((m, idx) => {
                  const [tone, label] = STATUS_BADGE[membershipStatus(m)]
                  const due = dueAmount(m)
                  const initials = m.name ? m.name.slice(0, 2).toUpperCase() : 'GM'
                  const waUrl = getMemberWhatsAppUrl(m)

                  return (
                    <tr key={m.id}>
                      <td data-label="Member">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="avatar-initials" style={{ width: '36px', height: '36px', fontSize: '13px' }}>
                            {initials}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <b>{m.name}</b>
                              <span className="muted xs font-mono">#{idx + 1}</span>
                            </div>
                            <span className="muted small block">{m.phone || 'No phone'}</span>
                          </div>
                        </div>
                      </td>

                      <td data-label="Plan & Facility">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600 }}>{m.plan || 'Standard'}</span>
                            <span className="badge blue" style={{ fontSize: '10.5px', padding: '1px 7px' }}>
                              🏢 {getMemberFacility(m)}
                            </span>
                            {hasPersonalTrainer(m) && (
                              <span
                                className="badge purple"
                                style={{ fontSize: '10.5px', padding: '1px 7px' }}
                                title={getTrainerName(m) ? `Personal Trainer: ${getTrainerName(m)}` : 'Personal Trainer Included'}
                              >
                                ⭐ PT{getTrainerName(m) ? `: ${getTrainerName(m)}` : ''}
                              </span>
                            )}
                          </div>
                          <span className="muted small block">Joined {formatDate(m.start_date)}</span>
                        </div>
                      </td>

                      <td data-label="Expiry">
                        <span className={`badge ${tone}`}>{label}</span>
                        <span className="small block" style={{ marginTop: '3px' }}>
                          {formatDate(m.end_date)} · {expiryText(m.end_date)}
                        </span>
                      </td>

                      <td data-label="Payment">
                        {due > 0 ? (
                          <span className="badge red">{formatMoney(due)} due</span>
                        ) : (
                          <span className="badge green">Paid</span>
                        )}
                        <span className="muted small block font-mono" style={{ marginTop: '3px', fontSize: '12px' }}>
                          {formatMoney(m.paid_amount)} / {formatMoney(m.total_fee)}
                        </span>
                      </td>

                      <td className="actions">
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn sm"
                              style={{ padding: '6px 8px', color: '#16a34a', borderColor: '#bbf7d0', background: '#f0fdf4' }}
                              title="Chat or send reminder on WhatsApp"
                            >
                              <WhatsAppIcon size={13} />
                            </a>
                          )}
                          {due > 0 && (
                            <button
                              type="button"
                              className="btn sm primary"
                              onClick={() => setDialog({ type: 'pay', member: m })}
                            >
                              Pay Due
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn sm"
                            onClick={() => setDialog({ type: 'renew', member: m })}
                          >
                            Renew
                          </button>
                          <button
                            type="button"
                            className="btn sm"
                            onClick={() => setDialog({ type: 'edit', member: m })}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn sm danger"
                            onClick={() => promptRemove(m)}
                            title="Remove member"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* 2. Mobile Card-Based Member Directory (Inspired by GymBook) */}
          <div className="members-mobile-cards">
            {list.map((m, idx) => {
              const [tone, label] = STATUS_BADGE[membershipStatus(m)]
              const due = dueAmount(m)
              const initials = m.name ? m.name.slice(0, 2).toUpperCase() : 'GM'
              const waUrl = getMemberWhatsAppUrl(m)

              return (
                <div key={m.id} className="member-gymbook-card">
                  {/* Card Header: Avatar, Name, M-ID, Status */}
                  <div className="member-gb-header">
                    <div className="member-gb-avatar" aria-hidden="true">
                      {initials}
                    </div>
                    <div className="member-gb-info">
                      <div className="member-gb-name-row">
                        <b className="member-gb-name">{m.name}</b>
                        <span className="member-gb-id">M ID: #{idx + 1}</span>
                      </div>
                      <div className="member-gb-sub-row">
                        {m.phone ? (
                          <a href={`tel:${m.phone}`} className="member-gb-phone">
                            📞 {m.phone}
                          </a>
                        ) : (
                          <span className="member-gb-phone muted">No phone</span>
                        )}
                        <span className={`badge ${tone} member-gb-status`}>{label}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Body: Plan, Facility, Expiry & Dues in a clean 2-column grid */}
                  <div className="member-gb-body">
                    <div className="member-gb-data-col">
                      <span className="member-gb-label">Plan & Facility</span>
                      <div className="member-gb-plan-val">
                        <span>{m.plan || 'Standard'}</span>
                        <span className="badge blue xs">🏢 {getMemberFacility(m)}</span>
                        {hasPersonalTrainer(m) && (
                          <span className="badge purple xs">⭐ PT</span>
                        )}
                      </div>
                    </div>

                    <div className="member-gb-data-col" style={{ textAlign: 'right' }}>
                      <span className="member-gb-label">Plan Expiry</span>
                      <span className="member-gb-val font-mono">{formatDate(m.end_date)}</span>
                      <span className="muted xs block">{expiryText(m.end_date)}</span>
                    </div>

                    <div className="member-gb-data-col">
                      <span className="member-gb-label">Joined On</span>
                      <span className="member-gb-val muted">{formatDate(m.start_date)}</span>
                    </div>

                    <div className="member-gb-data-col" style={{ textAlign: 'right' }}>
                      <span className="member-gb-label">Payment Status</span>
                      {due > 0 ? (
                        <div>
                          <span className="badge red font-mono" style={{ fontSize: '11px' }}>
                            {formatMoney(due)} due
                          </span>
                          <span className="muted xs block font-mono" style={{ marginTop: '2px' }}>
                            Paid {formatMoney(m.paid_amount)} / {formatMoney(m.total_fee)}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="badge green" style={{ fontSize: '11px' }}>Fully Paid</span>
                          <span className="muted xs block font-mono" style={{ marginTop: '2px' }}>
                            {formatMoney(m.paid_amount)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Action Ribbon: Touch-Friendly GymBook Actions */}
                  <div className="member-gb-actions">
                    {due > 0 && (
                      <button
                        type="button"
                        className="member-gb-btn primary"
                        onClick={() => setDialog({ type: 'pay', member: m })}
                      >
                        💳 Pay Due
                      </button>
                    )}
                    <button
                      type="button"
                      className="member-gb-btn"
                      onClick={() => setDialog({ type: 'renew', member: m })}
                    >
                      🔄 Renew
                    </button>
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="member-gb-btn whatsapp"
                        title="Chat on WhatsApp"
                      >
                        <WhatsAppIcon size={14} />
                        <span>WhatsApp</span>
                      </a>
                    )}
                    {m.phone && (
                      <a href={`tel:${m.phone}`} className="member-gb-btn" title="Call member">
                        📞 Call
                      </a>
                    )}
                    <button
                      type="button"
                      className="member-gb-btn"
                      onClick={() => setDialog({ type: 'edit', member: m })}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      type="button"
                      className="member-gb-btn danger"
                      onClick={() => promptRemove(m)}
                      title="Remove member"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
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
              This will permanently delete this client's details and records.
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
                {deleting ? 'Removing…' : 'Remove Client'}
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
          onScanNotebook={() => setDialog({ type: 'scan' })}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}
