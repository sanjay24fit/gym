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

  const load = useCallback(async () => {
    const [{ data, error }, countRes] = await Promise.all([
      supabase.from('gyms').select('*').neq('id', adminId).order('created_at', { ascending: false }),
      supabase.rpc('admin_gym_member_counts'),
    ])
    if (error) setError(error.message)
    setGyms(data || [])
    setCounts(Object.fromEntries((countRes.data || []).map((r) => [r.gym_id, r.member_count])))
    setLoading(false)
  }, [adminId])

  useEffect(() => {
    load()
  }, [load])

  async function update(id, values) {
    const { error } = await supabase.from('gyms').update(values).eq('id', id)
    if (error) alert(error.message)
    await load()
  }

  const pending = gyms.filter((g) => g.status === 'pending').length
  const active = gyms.filter((g) => g.status === 'active').length

  return (
    <div>
      <div className="stats">
        <div className="stat blue"><span className="stat-label">Total gyms</span><span className="stat-value">{gyms.length}</span></div>
        <div className="stat green"><span className="stat-label">Active</span><span className="stat-value">{active}</span></div>
        <div className="stat amber"><span className="stat-label">Pending approval</span><span className="stat-value">{pending}</span></div>
      </div>

      <div className="toolbar">
        <h3 style={{ margin: 0 }}>Gym owners</h3>
        <button className="btn primary" onClick={() => setCreating(true)}>+ Create owner account</button>
      </div>

      {error && <div className="alert error">{error}</div>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : gyms.length === 0 ? (
        <div className="card empty">No gym owners yet.</div>
      ) : (
        <div className="table-wrap card">
          <table className="table">
            <thead>
              <tr>
                <th>Gym</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Valid until</th>
                <th>Members</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {gyms.map((g) => {
                const expired = g.valid_until && g.valid_until < today()
                return (
                  <tr key={g.id}>
                    <td data-label="Gym">
                      <b>{g.gym_name || '-'}</b>
                      <span className="muted small block">{g.owner_name}</span>
                    </td>
                    <td data-label="Contact">
                      {g.email}
                      <span className="muted small block">{g.phone}</span>
                    </td>
                    <td data-label="Status">
                      <span className={`badge ${STATUS_TONE[g.status]}`}>{g.status}</span>
                      {g.status === 'active' && expired && <span className="badge red">plan expired</span>}
                    </td>
                    <td data-label="Valid until">
                      <input
                        type="date"
                        className="date-inline"
                        key={g.valid_until || 'none'}
                        defaultValue={g.valid_until || ''}
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
                      <span className="muted small block">{g.valid_until ? formatDate(g.valid_until) : 'No limit'}</span>
                    </td>
                    <td data-label="Members">{counts[g.id] || 0}</td>
                    <td className="actions">
                      {g.status !== 'active' && (
                        <button className="btn sm primary" onClick={() => update(g.id, { status: 'active', valid_until: g.valid_until || plusOneYear() })}>
                          {g.status === 'pending' ? 'Approve' : 'Activate'}
                        </button>
                      )}
                      {g.status === 'active' && expired && (
                        <button className="btn sm primary" onClick={() => update(g.id, { valid_until: plusOneYear() })}>Reactivate (1 year)</button>
                      )}
                      {g.status === 'active' && !expired && (
                        <button className="btn sm" onClick={() => update(g.id, { valid_until: plusOneYear(g.valid_until) })}>+1 year</button>
                      )}
                      {g.status === 'active' && !expired && (
                        <button
                          className="btn sm danger"
                          onClick={() => confirm(`Expire membership of ${g.gym_name || g.email} now?`) && update(g.id, { valid_until: addDays(today(), -1) })}
                        >
                          Expire now
                        </button>
                      )}
                      {g.status !== 'blocked' && (
                        <button className="btn sm danger" onClick={() => confirm(`Block ${g.gym_name}?`) && update(g.id, { status: 'blocked' })}>
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
    const { data, error } = await client.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { data: { gym_name: form.gym_name, owner_name: form.owner_name, phone: form.phone } },
    })
    if (error || !data.user || data.user.identities?.length === 0) {
      setSaving(false)
      setError(error?.message || 'An account with this email already exists')
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
    <Modal title="Create owner account" onClose={onClose}>
      {done ? (
        <div className="form">
          <div className="alert info">Account created and active. Share these login details with the owner:</div>
          <p>Email: <b>{done.email}</b><br />Password: <b>{done.password}</b></p>
          {done.needsConfirm && (
            <div className="alert error">
              "Confirm email" is ON in Supabase, so this owner must confirm their email before logging in. Turn it off in Supabase → Authentication → Sign In / Providers → Email.
            </div>
          )}
          <div className="modal-actions"><button className="btn primary" onClick={onClose}>Done</button></div>
        </div>
      ) : (
        <form className="form" onSubmit={submit}>
          <label>Gym name<input required value={form.gym_name} onChange={set('gym_name')} /></label>
          <label>Owner name<input required value={form.owner_name} onChange={set('owner_name')} /></label>
          <label>Mobile number<input type="tel" value={form.phone} onChange={set('phone')} /></label>
          <label>Login email<input required type="email" value={form.email} onChange={set('email')} /></label>
          <label>Password<input required minLength={6} value={form.password} onChange={set('password')} /></label>
          <label>Valid until<input type="date" value={form.valid_until} onChange={set('valid_until')} /></label>
          {error && <div className="alert error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button className="btn primary" disabled={saving}>{saving ? 'Creating…' : 'Create'}</button>
          </div>
        </form>
      )}
    </Modal>
  )
}
