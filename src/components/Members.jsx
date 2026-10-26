import { useState, useMemo } from 'react'
import Modal from './Modal'
import MemberForm from './MemberForm'
import PaymentForm from './PaymentForm'
import NotebookScanner from './NotebookScanner'
import { supabase } from '../lib/supabase'
import {
  dueAmount,
  formatDate,
  formatMoney,
  membershipStatus,
  hasPersonalTrainer,
  daysLeft,
  isMemberBlocked,
  isBirthdayToday,
  generateIdempotencyKey,
} from '../lib/utils'
import { markMemberAttendance } from '../lib/attendance'

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

function matchesFilter(m, filter) {
  const left = daysLeft(m.end_date)
  const isPT = hasPersonalTrainer(m)
  const isBlocked = isMemberBlocked(m)
  const due = dueAmount(m)

  if (filter === 'active') return left >= 0 && !isBlocked
  if (filter === 'expired') return left < 0
  if (filter === 'expiring') return left >= 0 && left <= 7
  if (filter === 'expiring-today') return left === 0
  if (filter === 'expiring-1-3') return left >= 1 && left <= 3
  if (filter === 'expiring-4-7') return left >= 4 && left <= 7
  if (filter === 'expiring-8-15') return left >= 8 && left <= 15
  if (filter === 'expired-1-3') return left < 0 && Math.abs(left) >= 1 && Math.abs(left) <= 3
  if (filter === 'expired-4-7') return left < 0 && Math.abs(left) >= 4 && Math.abs(left) <= 7
  if (filter === 'pt') return isPT
  if (filter === 'pt-expiring-today') return isPT && left === 0
  if (filter === 'pt-expiring-1-3') return isPT && left >= 1 && left <= 3
  if (filter === 'pt-expiring-4-7') return isPT && left >= 4 && left <= 7
  if (filter === 'pt-expiring-8-15') return isPT && left >= 8 && left <= 15
  if (filter === 'pt-active') return isPT && left >= 0
  if (filter === 'pt-expired') return isPT && left < 0
  if (filter === 'due') return due > 0
  if (filter === 'blocked') return isBlocked
  if (filter === 'birthday') return isBirthdayToday(m)
  return true
}

export default function Members({
  members,
  filter,
  setFilter,
  reload,
  initialDialog = null,
  gymName = 'Gym Manager',
  gymId = 'default',
  onAction,
}) {
  const [search, setSearch] = useState('')
  const [searchByMid, setSearchByMid] = useState(false)
  const [planFilter, setPlanFilter] = useState('all')
  const [dialog, setDialog] = useState(initialDialog) // { type: 'add'|'edit'|'renew'|'pay'|'remove'|'scan'|'idcard'|'currency', member }
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [actionNotice, setActionNotice] = useState('')
  const [currencySelected, setCurrencySelected] = useState(() => {
    return localStorage.getItem('gym_currency_selected') === 'true'
  })

  // List of unique plans for filter dropdown
  const uniquePlans = useMemo(() => {
    const set = new Set()
    members.forEach((m) => {
      if (m.plan) set.add(m.plan)
    })
    return Array.from(set)
  }, [members])

  // Filtered members list
  const q = search.trim().toLowerCase()
  const list = members
    .filter((m) => matchesFilter(m, filter))
    .filter((m) => {
      if (planFilter !== 'all' && m.plan !== planFilter) return false
      if (!q) return true
      if (searchByMid) {
        // Search by numeric ID or hash index
        const memberIdx = String(members.indexOf(m) + 1)
        return memberIdx === q || m.id.toLowerCase().includes(q)
      }
      return (
        m.name.toLowerCase().includes(q) ||
        (m.phone && m.phone.includes(q)) ||
        (m.plan && m.plan.toLowerCase().includes(q))
      )
    })
    .sort((a, b) => a.end_date.localeCompare(b.end_date))

  // Toggle Block Member
  async function handleToggleBlock(member) {
    const currentlyBlocked = isMemberBlocked(member)
    let updatedNotes = member.notes || ''
    if (currentlyBlocked) {
      updatedNotes = updatedNotes.replace(/\[Blocked:\s*true\]/gi, '').trim()
    } else {
      updatedNotes = `${updatedNotes} [Blocked: true]`.trim()
    }

    const { error } = await supabase
      .from('members')
      .update({ notes: updatedNotes })
      .eq('id', member.id)

    if (error) {
      alert('Could not update status: ' + error.message)
    } else {
      setActionNotice(
        currentlyBlocked
          ? `${member.name} has been unblocked.`
          : `${member.name} has been blocked.`
      )
      setTimeout(() => setActionNotice(''), 3000)
      await reload()
    }
  }

  // Quick mark attendance from member card
  function handleCardAttendance(member) {
    const res = markMemberAttendance(gymId, member)
    if (res.alreadyMarked) {
      setActionNotice(`${member.name} is already marked present today!`)
    } else {
      setActionNotice(`✓ Attendance recorded for ${member.name}`)
    }
    setTimeout(() => setActionNotice(''), 3000)
  }

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

    // Add or Edit member
    let res
    if (type === 'add') {
      res = await supabase.from('members').insert(values)
    } else {
      res = await supabase.from('members').update(values).eq('id', member.id)
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
        setDeleteError('This member has recorded payment records and cannot be deleted directly.')
      } else {
        setDeleteError(error.message)
      }
      return
    }
    setDialog(null)
    await reload()
  }

  return (
    <div className="gymbook-members-wrap">
      {/* 1. Members App Header (Teal Background with Icons) */}
      <header className="gymbook-header">
        <div className="gymbook-header-left">
          <button
            type="button"
            className="gymbook-icon-btn"
            title="Menu"
            aria-label="Menu"
            onClick={() => onAction && onAction('menu')}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <h1 className="gymbook-header-title">Members</h1>
        </div>

        <div className="gymbook-header-right">
          {/* Chat with badge 3 */}
          <button
            type="button"
            className="gymbook-icon-btn relative"
            title="Messages"
            aria-label="Messages"
            onClick={() => alert('WhatsApp broadcast / chat reminders ready.')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="gymbook-badge-num">3</span>
          </button>

          {/* Trash icon */}
          <button
            type="button"
            className="gymbook-icon-btn"
            title="Deleted & Inactive Members"
            aria-label="Trash"
            onClick={() => setFilter('expired')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>

          {/* Help icon */}
          <button
            type="button"
            className="gymbook-icon-btn"
            title="Help & Support"
            aria-label="Help"
            onClick={() => alert('Gym Manager Help: Use "+ Add Member" to register, or tap any member card to perform quick actions like ID Card, Call, WhatsApp, Attendance, Renew, or Block.')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3" />
            </svg>
          </button>
        </div>
      </header>

      {/* 2. Search Bar with M ID toggle */}
      <div className="gymbook-search-container">
        <div className="gymbook-search-bar">
          <input
            type="text"
            className="gymbook-search-input"
            placeholder='Search for "MembershipId"'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="button"
            className="gymbook-search-btn"
            title="Search"
            aria-label="Search"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          {/* M ID toggle switch */}
          <label className="gymbook-mid-toggle" title="Search by Membership ID">
            <span className="gymbook-mid-label">M ID</span>
            <input
              type="checkbox"
              checked={searchByMid}
              onChange={(e) => setSearchByMid(e.target.checked)}
            />
            <span className="gymbook-toggle-slider" />
          </label>
        </div>
      </div>

      {/* 3. Filter Tags Dropdown Pills (Horizontal Scroll) */}
      <div className="gymbook-filter-scroll-row">
        {/* Filter: All / Active / Expiring */}
        <select
          className="gb-select-pill"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All ▾</option>
          <option value="active">Active Members</option>
          <option value="expiring">Expiring Soon</option>
          <option value="expired">Expired Members</option>
          <option value="due">Pending Dues</option>
          <option value="blocked">Blocked Members</option>
        </select>

        {/* Filter: Needs Attention First */}
        <button
          type="button"
          className={`gb-filter-pill-btn ${filter === 'due' ? 'active' : ''}`}
          onClick={() => setFilter(filter === 'due' ? 'all' : 'due')}
        >
          Needs Attention First ▾
        </button>

        {/* Filter: All Plans */}
        <select
          className="gb-select-pill"
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
        >
          <option value="all">All Plans ▾</option>
          {uniquePlans.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        {/* Filter: PT / Status */}
        <button
          type="button"
          className={`gb-filter-pill-btn ${filter === 'pt' ? 'active' : ''}`}
          onClick={() => setFilter(filter === 'pt' ? 'all' : 'pt')}
        >
          Personal Trainer ▾
        </button>
      </div>

      {/* Action Notification Message */}
      {actionNotice && (
        <div style={{ margin: '8px 16px', background: '#e6fffa', color: '#00796b', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600 }}>
          {actionNotice}
        </div>
      )}

      {/* 4. Members List Cards (Styled EXACTLY like Image 1) */}
      <div className="gymbook-cards-stream">
        {list.length === 0 ? (
          <div className="card empty" style={{ margin: '20px 16px', textAlign: 'center', padding: '36px 16px' }}>
            {members.length === 0
              ? 'No members registered yet. Tap "+ Add Member" below to start!'
              : 'No members match the current filter or search criteria.'}
          </div>
        ) : (
          list.map((m, idx) => {
            const due = dueAmount(m)
            const initials = m.name ? m.name.slice(0, 1).toUpperCase() : 'M'
            const memberIdNum = idx + 1
            const isBlocked = isMemberBlocked(m)
            const waUrl = getMemberWhatsAppUrl(m)

            return (
              <div key={m.id} className="gymbook-member-card">
                {/* Decorative Top-Right Corner Arc */}
                <div className="gb-card-corner-arc" />

                {/* Card Top Content: Avatar, Details, Trash */}
                <div className="gb-card-main-content">
                  {/* Left Teal Avatar Circle */}
                  <div className="gb-member-avatar-circle" aria-hidden="true">
                    {initials}
                  </div>

                  {/* Member Info 2-Column Grid */}
                  <div className="gb-member-info-grid">
                    {/* Top Row: Name and Trash Icon */}
                    <div className="gb-member-name-row">
                      <div className="gb-member-field">
                        <span className="gb-field-label">Name:</span>
                        <span className="gb-field-name">
                          {m.name}
                          {isBlocked && (
                            <span style={{ color: 'var(--danger)', fontSize: '11px', marginLeft: '6px', fontWeight: 700 }}>
                              (Blocked)
                            </span>
                          )}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="gb-card-trash-btn"
                        onClick={() => promptRemove(m)}
                        title="Delete member"
                        aria-label="Delete member"
                      >
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>

                    {/* 2-Columns: Left (M ID, Plan Expiry) | Right (Mobile, Due Amount) */}
                    <div className="gb-member-details-cols">
                      {/* Left Column */}
                      <div className="gb-col-left">
                        <div className="gb-field-pair">
                          <span className="gb-field-label">M ID</span>
                          <span className="gb-field-val font-mono">{memberIdNum}</span>
                        </div>
                        <div className="gb-field-pair" style={{ marginTop: '10px' }}>
                          <span className="gb-field-label">Plan Expiry:</span>
                          <span className="gb-field-val green-text">{formatDate(m.end_date)}</span>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="gb-col-right">
                        <div className="gb-field-pair">
                          <span className="gb-field-label">Mobile:</span>
                          <span className="gb-field-val font-mono">
                            {m.phone ? `+91 - ${m.phone.replace(/[^0-9]/g, '')}` : '+91 - Not provided'}
                          </span>
                        </div>
                        <div className="gb-field-pair" style={{ marginTop: '10px' }}>
                          <span className="gb-field-label">Due Amount:</span>
                          <span className="gb-field-val red-text font-mono">
                            {due > 0 ? formatMoney(due) : '₹0'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: 6 Quick Action Icons (Image 1) */}
                <div className="gb-card-actions-ribbon">
                  {/* 1. ID Card */}
                  <button
                    type="button"
                    className="gb-action-icon-item"
                    onClick={() => setDialog({ type: 'idcard', member: m, memberIdNum })}
                    title="View Member ID Card"
                  >
                    <span className="gb-action-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                        <circle cx="7" cy="15" r="1.5" />
                        <line x1="12" y1="15" x2="18" y2="15" />
                      </svg>
                    </span>
                    <span className="gb-action-text">ID Card</span>
                  </button>

                  {/* 2. Call */}
                  <a
                    href={m.phone ? `tel:${m.phone}` : '#'}
                    className={`gb-action-icon-item ${!m.phone ? 'disabled' : ''}`}
                    title={m.phone ? `Call ${m.phone}` : 'No phone number'}
                  >
                    <span className="gb-action-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </span>
                    <span className="gb-action-text">Call</span>
                  </a>

                  {/* 3. Whatsapp */}
                  <a
                    href={waUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`gb-action-icon-item ${!waUrl ? 'disabled' : ''}`}
                    title="Send WhatsApp Message"
                  >
                    <span className="gb-action-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      </svg>
                    </span>
                    <span className="gb-action-text">Whatsapp</span>
                  </a>

                  {/* 4. Attendance */}
                  <button
                    type="button"
                    className="gb-action-icon-item"
                    onClick={() => handleCardAttendance(m)}
                    title="Mark Member Attendance"
                  >
                    <span className="gb-action-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
                        <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
                        <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
                        <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
                      </svg>
                    </span>
                    <span className="gb-action-text">Attendance</span>
                  </button>

                  {/* 5. Renew Plan */}
                  <button
                    type="button"
                    className="gb-action-icon-item"
                    onClick={() => setDialog({ type: 'renew', member: m })}
                    title="Renew Membership Plan"
                  >
                    <span className="gb-action-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                      </svg>
                    </span>
                    <span className="gb-action-text">Renew Plan</span>
                  </button>

                  {/* 6. Block Member */}
                  <button
                    type="button"
                    className="gb-action-icon-item"
                    onClick={() => handleToggleBlock(m)}
                    title={isBlocked ? 'Unblock Member' : 'Block Member'}
                  >
                    <span className="gb-action-icon" style={{ color: isBlocked ? 'var(--danger)' : undefined }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                      </svg>
                    </span>
                    <span className="gb-action-text">{isBlocked ? 'Unblock' : 'Block Member'}</span>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 5. Yellow Currency Alert Banner */}
      {!currencySelected && (
        <div className="gymbook-currency-banner">
          <span>💰 You haven't selected a currency yet.</span>
          <button
            type="button"
            className="gymbook-currency-link"
            onClick={() => setDialog({ type: 'currency' })}
          >
            Choose Currency
          </button>
        </div>
      )}

      {/* 6. Floating Action Button: + Add Member */}
      <button
        type="button"
        className="gb-fab-add-member"
        onClick={() => setDialog({ type: 'add' })}
        title="Add New Member"
      >
        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>+</span>
        <span>Add Member</span>
      </button>

      {/* Dialog Modals */}
      {dialog?.type === 'add' && (
        <Modal title="Add Member" onClose={() => setDialog(null)}>
          <MemberForm onSave={save} onCancel={() => setDialog(null)} />
        </Modal>
      )}

      {dialog?.type === 'edit' && (
        <Modal title="Edit Member" onClose={() => setDialog(null)}>
          <MemberForm member={dialog.member} onSave={save} onCancel={() => setDialog(null)} />
        </Modal>
      )}

      {dialog?.type === 'renew' && (
        <Modal title={`Renew: ${dialog.member.name}`} onClose={() => setDialog(null)}>
          <MemberForm member={dialog.member} isRenewal onSave={save} onCancel={() => setDialog(null)} />
        </Modal>
      )}

      {dialog?.type === 'pay' && (
        <Modal title={`Record payment: ${dialog.member.name}`} onClose={() => setDialog(null)}>
          <PaymentForm member={dialog.member} onSave={save} onClose={() => setDialog(null)} />
        </Modal>
      )}

      {dialog?.type === 'scan' && (
        <Modal title="Scan Paper Register" onClose={() => setDialog(null)}>
          <NotebookScanner
            onImportComplete={() => {
              setDialog(null)
              reload()
            }}
            onCancel={() => setDialog(null)}
          />
        </Modal>
      )}

      {/* ID Card Modal */}
      {dialog?.type === 'idcard' && (
        <Modal title="Member ID Card" onClose={() => setDialog(null)}>
          <div style={{ textAlign: 'center', padding: '10px' }}>
            <div
              style={{
                width: '100%',
                maxWidth: '340px',
                margin: '0 auto',
                background: 'linear-gradient(135deg, #0b665c 0%, #0d7b70 100%)',
                borderRadius: '16px',
                color: '#ffffff',
                padding: '24px 20px',
                boxShadow: '0 10px 25px rgba(11, 102, 92, 0.3)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '0.5px', marginBottom: '4px' }}>
                {gymName}
              </div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.8, letterSpacing: '1px', marginBottom: '16px' }}>
                Official Member Pass
              </div>

              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  color: '#0b665c',
                  fontSize: '24px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                  border: '3px solid rgba(255,255,255,0.4)',
                }}
              >
                {dialog.member.name.slice(0, 1).toUpperCase()}
              </div>

              <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '2px' }}>
                {dialog.member.name}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '14px' }}>
                M ID: #{dialog.memberIdNum} · {dialog.member.plan || 'Standard'}
              </div>

              <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px', fontSize: '12px', textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ opacity: 0.7, display: 'block', fontSize: '10px' }}>Joined</span>
                  <b>{formatDate(dialog.member.start_date)}</b>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ opacity: 0.7, display: 'block', fontSize: '10px' }}>Valid Until</span>
                  <b style={{ color: '#86efac' }}>{formatDate(dialog.member.end_date)}</b>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
              <button
                type="button"
                className="btn primary"
                onClick={() => window.print()}
              >
                Print ID Card
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setDialog(null)}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Currency Chooser Modal */}
      {dialog?.type === 'currency' && (
        <Modal title="Choose Currency" onClose={() => setDialog(null)}>
          <div style={{ padding: '8px 0' }}>
            <p className="muted small" style={{ marginBottom: '14px' }}>
              Select default currency format for fees and collections:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {['₹ INR (Indian Rupee)', '$ USD (US Dollar)', 'AED (UAE Dirham)', '€ EUR (Euro)'].map((curr) => (
                <button
                  key={curr}
                  type="button"
                  className="btn"
                  style={{ textAlign: 'left', padding: '12px 14px', borderRadius: '10px', fontWeight: 600 }}
                  onClick={() => {
                    localStorage.setItem('gym_currency_selected', 'true')
                    setCurrencySelected(true)
                    setDialog(null)
                  }}
                >
                  {curr}
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Remove Confirmation Modal */}
      {dialog?.type === 'remove' && (
        <Modal title="Confirm Delete" onClose={() => setDialog(null)}>
          <div>
            <p>
              Are you sure you want to remove <b>{dialog.member.name}</b>?
            </p>
            {deleteError && (
              <div style={{ color: 'var(--danger)', fontSize: '12.5px', marginBottom: '12px' }}>
                {deleteError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" className="btn" onClick={() => setDialog(null)} disabled={deleting}>
                Cancel
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={() => confirmRemove(dialog.member)}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete Member'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
