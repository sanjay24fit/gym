import { useState } from 'react'
import Modal from './Modal'
import { PLANS, addDays, dueAmount, formatMoney, planEndDate, today } from '../lib/utils'

function initialForm(member, renew) {
  if (member && renew) {
    const start = member.end_date >= today() ? addDays(member.end_date, 1) : today()
    const plan = PLANS.find((p) => p.label === member.plan)
    const previousDue = dueAmount(member)
    return {
      previousDue,
      name: member.name,
      phone: member.phone,
      plan: plan ? plan.label : 'Custom',
      start_date: start,
      end_date: plan ? planEndDate(start, plan.months) : start,
      total_fee: Number(member.total_fee) + previousDue,
      paid_amount: 0,
      notes: member.notes,
    }
  }
  if (member) {
    return {
      name: member.name,
      phone: member.phone,
      plan: member.plan || 'Custom',
      start_date: member.start_date,
      end_date: member.end_date,
      total_fee: member.total_fee,
      paid_amount: member.paid_amount,
      notes: member.notes,
    }
  }
  const start = today()
  return {
    name: '',
    phone: '',
    plan: '1 Month',
    start_date: start,
    end_date: planEndDate(start, 1),
    total_fee: '',
    paid_amount: '',
    notes: '',
  }
}

export default function MemberForm({ member, renew, onSave, onDelete, onScanNotebook, onClose }) {
  const [form, setForm] = useState(() => initialForm(member, renew))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => {
    const value = e.target.value
    const next = { ...form, [k]: value }
    const plan = PLANS.find((p) => p.label === (k === 'plan' ? value : form.plan))
    if ((k === 'plan' || k === 'start_date') && plan && next.start_date) {
      next.end_date = planEndDate(next.start_date, plan.months)
    }
    setForm(next)
  }

  async function submit(e) {
    e.preventDefault()
    if (form.end_date < form.start_date) {
      setError('Expiry date cannot be before start date')
      return
    }
    if ((Number(form.paid_amount) || 0) > (Number(form.total_fee) || 0)) {
      setError('Paid amount cannot be more than total fee')
      return
    }
    setSaving(true)
    setError('')
    const err = await onSave({
      name: form.name.trim(),
      phone: form.phone.trim(),
      plan: form.plan,
      start_date: form.start_date,
      end_date: form.end_date,
      total_fee: Number(form.total_fee) || 0,
      paid_amount: Number(form.paid_amount) || 0,
      notes: form.notes.trim(),
    })
    setSaving(false)
    if (err) setError(err)
  }

  const title = renew ? `Renew – ${member.name}` : member ? 'Edit member' : 'Add member'

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="form">
        {!member && !renew && onScanNotebook && (
          <div className="alert info small" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <span>Have a paper register / notebook?</span>
            <button
              type="button"
              className="btn sm"
              style={{ background: 'var(--card)', color: '#38bdf8', border: '1px solid #38bdf8', flexShrink: 0 }}
              onClick={onScanNotebook}
            >
              📷 Scan Notebook
            </button>
          </div>
        )}
        <label>Name<input required value={form.name} onChange={set('name')} disabled={renew} /></label>
        <label>Mobile number<input type="tel" value={form.phone} onChange={set('phone')} /></label>
        <label>
          Plan
          <select value={form.plan} onChange={set('plan')}>
            {PLANS.map((p) => <option key={p.label}>{p.label}</option>)}
            <option>Custom</option>
          </select>
        </label>
        <div className="row">
          <label>Start date<input required type="date" value={form.start_date} onChange={set('start_date')} /></label>
          <label>Expiry date<input required type="date" value={form.end_date} onChange={set('end_date')} /></label>
        </div>
        <div className="row">
          <label>Total fee (₹)<input type="number" min="0" step="any" value={form.total_fee} onChange={set('total_fee')} /></label>
          <label>Paid (₹)<input type="number" min="0" step="any" value={form.paid_amount} onChange={set('paid_amount')} /></label>
        </div>
        {form.previousDue > 0 && (
          <p className="alert info small">Total fee includes previous due of {formatMoney(form.previousDue)}.</p>
        )}
        <p className="muted small">
          Due: ₹{Math.max(0, (Number(form.total_fee) || 0) - (Number(form.paid_amount) || 0)).toLocaleString('en-IN')}
        </p>
        <label>Notes<textarea rows={2} value={form.notes} onChange={set('notes')} /></label>
        {error && <div className="alert error">{error}</div>}
        <div className="modal-actions">
          {member && !renew && onDelete && (
            <button
              type="button"
              className="btn danger"
              style={{ marginRight: 'auto' }}
              onClick={() => onDelete(member)}
            >
              Remove member
            </button>
          )}
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={saving}>{saving ? 'Saving…' : renew ? 'Renew' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  )
}
