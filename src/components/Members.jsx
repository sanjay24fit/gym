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
} from '../lib/utils'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'expiring', label: 'Expiring soon' },
  { key: 'expired', label: 'Expired' },
  { key: 'due', label: 'Payment due' },
  { key: 'pt', label: '⭐ Personal Trainer' },
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
    let res =
      type === 'add'
        ? await supabase.from('members').insert(values)
        : await supabase.from('members').update(values).eq('id', member.id)

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

      const fallbackValues = {
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
          <h2>Members Directory</h2>
          <span className="muted small">Manage clients, memberships, and renewal status</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" onClick={() => setDialog({ type: 'scan' })}>
            📷 Scan Register
          </button>
          <button className="btn primary" onClick={() => setDialog({ type: 'add' })}>
            + Add Member
          </button>
        </div>
      </div>

      {/* Toolbar: Search & Action */}
      <div className="toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
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
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Plan & Facility</th>
                <th>Expiry</th>
                <th>Payment</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => {
                const [tone, label] = STATUS_BADGE[membershipStatus(m)]
                const due = dueAmount(m)
                const initials = m.name ? m.name.slice(0, 2).toUpperCase() : 'GM'

                return (
                  <tr key={m.id}>
                    <td data-label="Member">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="avatar-initials" style={{ width: '34px', height: '34px', fontSize: '13px' }}>
                          {initials}
                        </div>
                        <div>
                          <b>{m.name}</b>
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
                      <span className="small block" style={{ marginTop: '2px' }}>
                        {formatDate(m.end_date)} · {expiryText(m.end_date)}
                      </span>
                    </td>

                    <td data-label="Payment">
                      {due > 0 ? (
                        <span className="badge red">{formatMoney(due)} due</span>
                      ) : (
                        <span className="badge green">Paid</span>
                      )}
                      <span className="muted small block font-mono" style={{ marginTop: '2px', fontSize: '12px' }}>
                        {formatMoney(m.paid_amount)} / {formatMoney(m.total_fee)}
                      </span>
                    </td>

                    <td className="actions">
                      {due > 0 && (
                        <button
                          type="button"
                          className="btn sm accent"
                          onClick={() => setDialog({ type: 'pay', member: m })}
                        >
                          Payment
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
                      >
                        Remove
                      </button>
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
