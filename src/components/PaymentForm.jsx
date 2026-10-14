import { useState } from 'react'
import Modal from './Modal'
import { dueAmount, formatMoney } from '../lib/utils'

export default function PaymentForm({ member, onSave, onClose }) {
  const [amount, setAmount] = useState(dueAmount(member) || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    const value = Number(amount)
    if (!(value > 0)) {
      setError('Amount must be greater than 0')
      return
    }
    setSaving(true)
    const err = await onSave({ paid_amount: Number(member.paid_amount) + value })
    setSaving(false)
    if (err) setError(err)
  }

  return (
    <Modal title={`Add payment – ${member.name}`} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <p className="small">
          Total {formatMoney(member.total_fee)} · Paid {formatMoney(member.paid_amount)} ·{' '}
          <b>Due {formatMoney(dueAmount(member))}</b>
        </p>
        <label>Amount received (₹)<input autoFocus required type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        {error && <div className="alert error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={saving}>{saving ? 'Saving…' : 'Save payment'}</button>
        </div>
      </form>
    </Modal>
  )
}
