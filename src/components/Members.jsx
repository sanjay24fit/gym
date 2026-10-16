import { useState } from 'react'
import Modal from './Modal'
import MemberForm from './MemberForm'
import PaymentForm from './PaymentForm'
import NotebookScanner from './NotebookScanner'
import { supabase } from '../lib/supabase'
import { dueAmount, expiryText, formatDate, formatMoney, membershipStatus } from '../lib/utils'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'expiring', label: 'Expiring soon' },
  { key: 'expired', label: 'Expired' },
  { key: 'due', label: 'Payment due' },
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
  return true
}

export default function Members({ members, filter, setFilter, reload }) {
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState(null) // { type: 'add'|'edit'|'renew'|'pay'|'remove', member }
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const q = search.trim().toLowerCase()
  const list = members
    .filter((m) => matchesFilter(m, filter))
    .filter((m) => !q || m.name.toLowerCase().includes(q) || m.phone.includes(q))
    .sort((a, b) => a.end_date.localeCompare(b.end_date))

  async function save(values) {
    const { type, member } = dialog
    const { error } =
      type === 'add'
        ? await supabase.from('members').insert(values)
        : await supabase.from('members').update(values).eq('id', member.id)
    if (error) return error.message
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
      <div className="toolbar">
        <input className="search" placeholder="Search name or mobile…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" onClick={() => setDialog({ type: 'scan' })}>
            📷 Scan Notebook
          </button>
          <button className="btn primary" onClick={() => setDialog({ type: 'add' })}>
            + Add member
          </button>
        </div>
      </div>
      <div className="chips">
        {FILTERS.map((f) => (
          <button key={f.key} className={`chip ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label} <span>{members.filter((m) => matchesFilter(m, f.key)).length}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="card empty">
          {members.length === 0 ? 'No members yet. Click "Add member" to get started.' : 'No members found.'}
        </div>
      ) : (
        <div className="table-wrap card">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Plan</th>
                <th>Expiry</th>
                <th>Payment</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => {
                const [tone, label] = STATUS_BADGE[membershipStatus(m)]
                const due = dueAmount(m)
                return (
                  <tr key={m.id}>
                    <td data-label="Member">
                      <b>{m.name}</b>
                      <span className="muted small block">{m.phone}</span>
                    </td>
                    <td data-label="Plan">
                      {m.plan || '-'}
                      <span className="muted small block">from {formatDate(m.start_date)}</span>
                    </td>
                    <td data-label="Expiry">
                      <span className={`badge ${tone}`}>{label}</span>
                      <span className="small block">{formatDate(m.end_date)} · {expiryText(m.end_date)}</span>
                    </td>
                    <td data-label="Payment">
                      {due > 0 ? <span className="badge red">{formatMoney(due)} due</span> : <span className="badge green">Paid</span>}
                      <span className="muted small block">{formatMoney(m.paid_amount)} / {formatMoney(m.total_fee)}</span>
                    </td>
                    <td className="actions">
                      {due > 0 && <button className="btn sm" onClick={() => setDialog({ type: 'pay', member: m })}>Payment</button>}
                      <button className="btn sm" onClick={() => setDialog({ type: 'renew', member: m })}>Renew</button>
                      <button className="btn sm" onClick={() => setDialog({ type: 'edit', member: m })}>Edit</button>
                      <button className="btn sm danger" onClick={() => promptRemove(m)}>Remove</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {dialog && dialog.type === 'remove' && (
        <Modal title="Remove member" onClose={() => !deleting && setDialog(null)}>
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
                {deleting ? 'Removing…' : 'Remove client'}
              </button>
            </div>
          </div>
        </Modal>
      )}

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

      {dialog && dialog.type === 'pay' && (
        <PaymentForm member={dialog.member} onSave={save} onClose={() => setDialog(null)} />
      )}
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
