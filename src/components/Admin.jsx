import { useCallback, useEffect, useState } from 'react'
import Modal from './Modal'
import { createIsolatedClient, supabase } from '../lib/supabase'
import { addDays, formatDate, parseISO, toISO, today } from '../lib/utils'

const STATUS_TONE = { pending: 'amber', active: 'green', blocked: 'red' }

function plusOneYear(fromIso) {
  const base = fromIso && fromIso >= today() ? fromIso : today()
  const d = parseISO(base)
  d.setFullYear(d.getFullYear() + 1)
  return toISO(d)
}

export default function Admin({ adminId }) {
  const [gyms, setGyms] = useState([])
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [confirmDialog, setConfirmDialog] = useState(null) // { type: 'block' | 'expire', gym }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const [{ data, error: gymErr }, countRes] = await Promise.all([
      supabase.from('gyms').select('*').neq('id', adminId).order('created_at', { ascending: false }),
      supabase.rpc('admin_gym_member_counts'),
    ])
    if (gymErr) setError(gymErr.message)
    setGyms(data || [])
    setCounts(Object.fromEntries((countRes.data || []).map((r) => [r.gym_id, r.member_count])))
    setLoading(false)
  }, [adminId])

  useEffect(() => {
    let mounted = true
    load().catch((err) => {
      if (mounted) setError(err.message)
    })
    return () => {
      mounted = false
    }
  }, [load])

  async function update(id, values) {
    const { error: upErr } = await supabase.from('gyms').update(values).eq('id', id)
    if (upErr) setError(upErr.message)
    setConfirmDialog(null)
    await load()
  }

  const q = search.trim().toLowerCase()
  const filteredGyms = gyms.filter(
    (g) =>
      !q ||
      (g.gym_name && g.gym_name.toLowerCase().includes(q)) ||
      (g.owner_name && g.owner_name.toLowerCase().includes(q)) ||
      (g.email && g.email.toLowerCase().includes(q)) ||
      (g.phone && g.phone.includes(q))
  )

  const pending = gyms.filter((g) => g.status === 'pending').length
  const active = gyms.filter((g) => g.status === 'active').length
  const blocked = gyms.filter((g) => g.status === 'blocked').length

  return (
    <div>
      <div className="section-head" style={{ marginBottom: '16px' }}>
        <div>
          <h2>Master Admin Control Panel</h2>
          <span className="muted small">Approve, monitor, and manage all registered gym owner accounts</span>
        </div>
        <button className="btn primary" onClick={() => setCreating(true)}>
          + Create Owner Account
        </button>
      </div>

      {/* Admin KPI Summary */}
      <div className="summary-grid" style={{ marginBottom: '20px' }}>
        <div className="summary-card accent">
          <div className="summary-card-head">
            <span className="summary-card-label">Total Gyms</span>
            <div className="summary-card-icon">🏢</div>
          </div>
          <div className="summary-card-value">{gyms.length}</div>
          <div className="summary-card-sub">Registered platform accounts</div>
        </div>

        <div className="summary-card success">
          <div className="summary-card-head">
            <span className="summary-card-label">Active Portals</span>
            <div className="summary-card-icon">✓</div>
          </div>
          <div className="summary-card-value">{active}</div>
          <div className="summary-card-sub">Live and operating</div>
        </div>

        <div className="summary-card warning">
          <div className="summary-card-head">
            <span className="summary-card-label">Pending Approval</span>
            <div className="summary-card-icon">⏳</div>
          </div>
          <div className="summary-card-value">{pending}</div>
          <div className="summary-card-sub">Awaiting admin review</div>
        </div>

        <div className="summary-card danger">
          <div className="summary-card-head">
            <span className="summary-card-label">Blocked Accounts</span>
            <div className="summary-card-icon" style={{ color: 'var(--danger)' }}>🚫</div>
          </div>
          <div className="summary-card-value" style={{ color: 'var(--danger)' }}>{blocked}</div>
          <div className="summary-card-sub">Access revoked</div>
        </div>
      </div>

      {/* Toolbar with Search */}
      <div className="toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            placeholder="Search gym, owner name, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="alert error" style={{ marginBottom: '14px' }}>{error}</div>}

      {loading ? (
        <div className="card empty">Loading gym records…</div>
      ) : filteredGyms.length === 0 ? (
        <div className="card empty">
          {gyms.length === 0 ? 'No gym owners registered yet.' : 'No gym accounts match your search.'}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Gym & Owner</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Subscription Expiry</th>
                <th>Total Members</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredGyms.map((g) => {
                const expired = g.valid_until && g.valid_until < today()
                const initials = g.gym_name ? g.gym_name.slice(0, 2).toUpperCase() : 'GM'

                return (
                  <tr key={g.id}>
                    <td data-label="Gym & Owner">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="avatar-initials" style={{ width: '36px', height: '36px' }}>
                          {initials}
                        </div>
                        <div>
                          <b>{g.gym_name || 'Unnamed Gym'}</b>
                          <span className="muted small block">{g.owner_name || 'No owner specified'}</span>
                        </div>
                      </div>
                    </td>

                    <td data-label="Contact">
                      <span className="block">{g.email}</span>
                      <span className="muted small block">{g.phone || 'No phone'}</span>
                    </td>

                    <td data-label="Status">
                      <span className={`badge ${STATUS_TONE[g.status]}`}>{g.status}</span>
                      {g.status === 'active' && expired && (
                        <span className="badge red block" style={{ marginTop: '4px' }}>plan expired</span>
                      )}
                    </td>

                    <td data-label="Subscription Expiry">
                      <input
                        type="date"
                        className="date-inline"
                        key={g.valid_until || 'none'}
                        defaultValue={g.valid_until || ''}
                        style={{ padding: '4px 8px', fontSize: '13px', borderRadius: '6px' }}
                        onBlur={(e) => {
                          const v = e.target.value || null
                          if (v === (g.valid_until || null)) return
                          if (v && !/^20\d\d-/.test(v)) {
                            e.target.value = g.valid_until || ''
                            return
                          }
                          update(g.id, { valid_until: v })
                        }}
                      />
                      <span className="muted small block" style={{ marginTop: '2px' }}>
                        {g.valid_until ? formatDate(g.valid_until) : 'No limit set'}
                      </span>
                    </td>

                    <td data-label="Total Members">
                      <b>{counts[g.id] || 0}</b> members
                    </td>

                    <td className="actions">
                      {g.status !== 'active' && (
                        <button
                          type="button"
                          className="btn sm primary"
                          onClick={() =>
                            update(g.id, {
                              status: 'active',
                              valid_until: g.valid_until || plusOneYear(),
                            })
                          }
                        >
                          {g.status === 'pending' ? 'Approve' : 'Activate'}
                        </button>
                      )}

                      {g.status === 'active' && expired && (
                        <button
                          type="button"
                          className="btn sm accent"
                          onClick={() => update(g.id, { valid_until: plusOneYear() })}
                        >
                          Reactivate (1 year)
                        </button>
                      )}

                      {g.status === 'active' && !expired && (
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() => update(g.id, { valid_until: plusOneYear(g.valid_until) })}
                        >
                          +1 Year
                        </button>
                      )}

                      {g.status === 'active' && !expired && (
                        <button
                          type="button"
                          className="btn sm danger"
                          onClick={() => setConfirmDialog({ type: 'expire', gym: g })}
                        >
                          Expire
                        </button>
                      )}

                      {g.status !== 'blocked' && (
                        <button
                          type="button"
                          className="btn sm danger"
                          onClick={() => setConfirmDialog({ type: 'block', gym: g })}
                        >
                          Block
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

      {/* Confirmation Modal for Admin Actions */}
      {confirmDialog && (
        <Modal
          title={confirmDialog.type === 'block' ? 'Block Gym Account' : 'Expire Subscription'}
          onClose={() => setConfirmDialog(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0 }}>
              {confirmDialog.type === 'block'
                ? `Are you sure you want to block "${confirmDialog.gym.gym_name || confirmDialog.gym.email}"? The owner will no longer be able to log in or manage members.`
                : `Expire subscription for "${confirmDialog.gym.gym_name || confirmDialog.gym.email}" immediately?`}
            </p>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setConfirmDialog(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn danger-solid"
                onClick={() => {
                  if (confirmDialog.type === 'block') {
                    update(confirmDialog.gym.id, { status: 'blocked' })
                  } else {
                    update(confirmDialog.gym.id, { valid_until: addDays(today(), -1) })
                  }
                }}
              >
                {confirmDialog.type === 'block' ? 'Block Gym' : 'Expire Now'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {creating && <CreateOwner onClose={() => setCreating(false)} onCreated={load} />}
    </div>
  )
}

function CreateOwner({ onClose, onCreated }) {
  const [form, setForm] = useState({
    gym_name: '',
    owner_name: '',
    phone: '',
    email: '',
    password: '',
    valid_until: addDays(plusOneYear(), 0),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const client = createIsolatedClient()
    const { data, error: signupErr } = await client.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { data: { gym_name: form.gym_name, owner_name: form.owner_name, phone: form.phone } },
    })
    if (signupErr || !data.user || data.user.identities?.length === 0) {
      setSaving(false)
      setError(signupErr?.message || 'An account with this email already exists')
      return
    }
    const { error: upErr } = await supabase
      .from('gyms')
      .update({ status: 'active', valid_until: form.valid_until || null })
      .eq('id', data.user.id)
    setSaving(false)
    if (upErr) {
      setError(upErr.message)
      return
    }
    setDone({ email: form.email.trim(), password: form.password, needsConfirm: !data.session })
    onCreated()
  }

  return (
    <Modal title="Create Gym Owner Account" onClose={onClose}>
      {done ? (
        <div className="form">
          <div className="alert success">
            Account created and activated successfully! Share these login credentials with the gym owner:
          </div>
          <div style={{ background: 'var(--card-subtle)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <p style={{ margin: 0 }}>
              Email: <b>{done.email}</b><br />
              Password: <b>{done.password}</b>
            </p>
          </div>
          {done.needsConfirm && (
            <div className="alert warning small">
              "Confirm email" is currently ON in Supabase. The owner may need to confirm their email, or disable it in Supabase Auth settings.
            </div>
          )}
          <div className="modal-actions">
            <button className="btn primary" onClick={onClose}>Done</button>
          </div>
        </div>
      ) : (
        <form className="form" onSubmit={submit}>
          <label>Gym Name *<input required value={form.gym_name} placeholder="e.g. Iron Fitness" onChange={set('gym_name')} /></label>
          <label>Owner Name *<input required value={form.owner_name} placeholder="e.g. Rajesh Kumar" onChange={set('owner_name')} /></label>
          <label>Mobile Number<input type="tel" value={form.phone} placeholder="e.g. 9876543210" onChange={set('phone')} /></label>
          <label>Login Email *<input required type="email" value={form.email} placeholder="owner@gym.com" onChange={set('email')} /></label>
          <label>Password *<input required minLength={6} value={form.password} placeholder="Minimum 6 characters" onChange={set('password')} /></label>
          <label>Subscription Valid Until<input type="date" value={form.valid_until} onChange={set('valid_until')} /></label>
          {error && <div className="alert error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button className="btn primary" disabled={saving}>{saving ? 'Creating…' : 'Create & Activate Account'}</button>
          </div>
        </form>
      )}
    </Modal>
  )
}
