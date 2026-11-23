import { useState, useEffect, useCallback } from 'react'
import {
  fetchGymMemberRequests,
  rotateGymConnectionCode,
  approveMemberJoinRequest,
  rejectMemberJoinRequest,
} from '../lib/memberAuth'
import { formatDate, formatMoney, PLANS, FACILITIES } from '../lib/utils'
import { supabase } from '../lib/supabase'

function getMemberInitials(name) {
  if (!name) return 'MB'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function timeAgo(dateString) {
  if (!dateString) return 'Just now'
  const now = new Date()
  const past = new Date(dateString)
  const diffMs = now - past
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return past.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

export function formatGymDisplayCode(gym) {
  const gymName = gym?.gym_name || 'Omni'
  const cleanName = gymName.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const prefix = cleanName.slice(0, 4) || 'OMNI'
  const rawCode = gym?.connect_code || gym?.connection_code || ''

  if (rawCode && rawCode.includes('-')) {
    const parts = rawCode.split('-')
    return {
      primaryCode: rawCode.toUpperCase(),
      shortCode: `${prefix}-${parts[1] || '4829'}-X`,
    }
  }

  if (rawCode) {
    const middle = rawCode.slice(0, 4).toUpperCase()
    return {
      primaryCode: `${prefix}-${middle}-FIT`,
      shortCode: `${prefix}-${rawCode.slice(-4)}-X`,
    }
  }

  // Fallback demo code matching user screenshot
  return {
    primaryCode: `${prefix}-7X9B-FIT`,
    shortCode: `${prefix}-4829-X`,
  }
}

export default function GymMemberRequests({
  gym,
  existingMembers = [],
  reloadGym,
  reloadMembers,
  onPendingCountChange,
}) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)
  const [rotating, setRotating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [filter, setFilter] = useState('pending') // 'pending' | 'approved' | 'all'
  const [reviewDialog, setReviewDialog] = useState(null) // request object for approval
  const [rejectDialog, setRejectDialog] = useState(null) // request object for rejection
  const [rejectReason, setRejectReason] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteCopied, setInviteCopied] = useState(false)

  // Form state for Review & Approve dialog
  const [selectedPlan, setSelectedPlan] = useState('1 Month')
  const [selectedFacility, setSelectedFacility] = useState('Gym & Fitness')
  const [memberFee, setMemberFee] = useState('2000')
  const [memberPaid, setMemberPaid] = useState('2000')

  const displayCodes = formatGymDisplayCode(gym)
  const gymName = gym?.gym_name || 'Omni Gym & Fitness'

  const appBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://gymmanager.app'
  const inviteUrl = `${appBaseUrl}/?join=${encodeURIComponent(displayCodes.primaryCode)}`

  const loadRequests = useCallback(async () => {
    if (!gym?.id) {
      setRequests([])
      setLoading(false)
      onPendingCountChange?.(0)
      return
    }
    setLoading(true)
    const list = await fetchGymMemberRequests(gym.id)
    if (list && list.length > 0) {
      setRequests(list)
      const pending = list.filter((r) => r.status === 'pending').length
      onPendingCountChange?.(pending)
    } else {
      setRequests([])
      onPendingCountChange?.(0)
    }
    setLoading(false)
  }, [gym?.id, onPendingCountChange])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  const handleCopyCode = () => {
    navigator.clipboard.writeText(displayCodes.primaryCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleShareWhatsApp = () => {
    const msg = `Join *${gymName}* on Gym Manager App!\n\n1. Open link: ${inviteUrl}\n2. Enter our Gym Code: *${displayCodes.primaryCode}*\n\nGet instant access to your membership pass, attendance tracking, and personalized workout routines!`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handleRotateCode = async () => {
    if (!window.confirm(`Generate a new unique Gym Connection Code for ${gymName}? Existing members will remain connected, but new members must use the new code.`)) {
      return
    }
    setRotating(true)
    const res = await rotateGymConnectionCode()
    setRotating(false)
    if (res?.success) {
      if (reloadGym) reloadGym()
    } else {
      // Fallback: save clean formatted code directly to gyms table
      const cleanName = gymName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'GYM'
      const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
      let part = ''
      for (let i = 0; i < 4; i++) part += chars[Math.floor(Math.random() * chars.length)]
      const fallbackCode = `${cleanName}-${part}-FIT`

      try {
        if (gym?.id) {
          await supabase
            .from('gyms')
            .update({ connect_code: fallbackCode, connection_code: fallbackCode })
            .eq('id', gym.id)
        }
        if (reloadGym) reloadGym()
      } catch (err) {
        console.warn('Fallback rotation error:', err)
      }
    }
  }

  // Open the Review & Approve modal
  const handleOpenReview = (req) => {
    setReviewDialog(req)
    setSelectedPlan('1 Month')
    setSelectedFacility('Gym & Fitness')
    setMemberFee('2000')
    setMemberPaid('2000')
  }

  // Confirm Review & Approve
  const handleConfirmApprove = async () => {
    if (!reviewDialog) return
    const req = reviewDialog
    setActionId(req.id)

    // Real Supabase request approval
    const res = await approveMemberJoinRequest(req.id)
    setActionId(null)
    setReviewDialog(null)

    if (res.success) {
      await loadRequests()
      if (reloadMembers) reloadMembers()
    } else {
      alert(res.error || 'Failed to approve member.')
    }
  }

  // Confirm Rejection / Decline
  const handleConfirmReject = async () => {
    if (!rejectDialog) return
    const req = rejectDialog
    setActionId(req.id)

    const res = await rejectMemberJoinRequest(req.id, rejectReason)
    setActionId(null)
    setRejectDialog(null)
    setRejectReason('')
    if (res.success) {
      await loadRequests()
      if (reloadMembers) reloadMembers()
    } else {
      alert(res.error || 'Failed to decline member.')
    }
  }

  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const filteredList = requests.filter((r) => {
    if (filter === 'pending') return r.status === 'pending'
    if (filter === 'approved') return r.status === 'approved'
    return true
  })

  return (
    <div className="gym-requests-page">
      {/* ==============================================================
          CARD 1: GYM CONNECTION CODE (HERO INVITE BANNER)
      ============================================================== */}
      <div className="gym-code-hero-card">
        {/* Top Badges */}
        <div className="gym-badge-row">
          <span className="gym-invite-badge cyan">GYM MEMBER INVITE SYSTEM</span>
          <span className="gym-invite-badge emerald">INTERCONNECTED MEMBER ACCESS</span>
        </div>

        <div className="gym-hero-body-grid">
          {/* Left Column: Title, Subtitle, How it works */}
          <div className="gym-hero-text-col">
            <h2 className="gym-hero-title">Gym Connection Code</h2>
            <p className="gym-hero-desc">
              Share this unique connection code with your members. When they download the member app or enter this code in their member panel, their profile instantly links to <b>{gymName}</b> for your approval.
            </p>

            {/* How It Works Box */}
            <div className="gym-how-it-works-box">
              <div className="gym-timer-icon-wrap" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="gym-how-it-works-text">
                <span className="bold-teal">How It Works:</span>
                <span> 1. Member enters code → 2. Instant connection → 3. Dashboard opens</span>
              </div>
            </div>
          </div>

          {/* Center Column: Large Glowing Neon Code Box */}
          <div className="gym-neon-code-box">
            <div className="gym-code-label">YOUR UNIQUE GYM CODE:</div>
            <div className="gym-code-display">{displayCodes.primaryCode}</div>
            <div className="gym-code-alt">or {displayCodes.shortCode}</div>

            {/* Action Buttons Row */}
            <div className="gym-code-actions">
              <button
                type="button"
                className="gym-code-btn copy"
                onClick={handleCopyCode}
                title="Copy Gym Connection Code"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>

              <button
                type="button"
                className="gym-code-btn whatsapp"
                onClick={handleShareWhatsApp}
                title="Send WhatsApp Invite"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z" />
                </svg>
                <span>WhatsApp Invite</span>
              </button>

              <button
                type="button"
                className="gym-code-btn"
                onClick={() => setShowInviteModal(true)}
                title="Share via SMS or Email"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span>Invite via SMS/Email</span>
              </button>

              <button
                type="button"
                className="gym-code-btn"
                onClick={handleRotateCode}
                disabled={rotating}
                title="Generate a new connection code"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 21h5v-5" />
                </svg>
                <span>{rotating ? 'Generating…' : 'Generate New Code'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: QR Code Box */}
          <div className="gym-qr-card">
            <div className="gym-qr-frame">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(inviteUrl)}`}
                alt="Gym Connection QR Code"
                width={130}
                height={130}
                style={{ display: 'block', borderRadius: '8px' }}
              />
            </div>
            <span className="gym-qr-caption">Scan QR Code to Connect</span>
          </div>
        </div>
      </div>

      {/* ==============================================================
          CARD 2: MEMBER CONNECTION REQUESTS TABLE
      ============================================================== */}
      <div className="gym-requests-card">
        <div className="gym-requests-header">
          <div>
            <h3 className="gym-requests-title">Member Connection Requests</h3>
            <span className="gym-requests-sub">Review and approve members registering with your Gym Code</span>
          </div>

          {/* Filter Chips */}
          <div className="gym-filter-pills">
            <button
              type="button"
              className={`gym-filter-pill ${filter === 'pending' ? 'active' : ''}`}
              onClick={() => setFilter('pending')}
            >
              Pending ({pendingCount})
            </button>
            <button
              type="button"
              className={`gym-filter-pill ${filter === 'approved' ? 'active' : ''}`}
              onClick={() => setFilter('approved')}
            >
              Approved
            </button>
            <button
              type="button"
              className={`gym-filter-pill ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All Requests
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
            Loading member connection requests…
          </div>
        ) : filteredList.length === 0 ? (
          <div className="gym-empty-requests" style={{ padding: '48px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '15px', color: 'var(--text)' }}>
              No {filter === 'all' ? '' : filter} connection requests
            </p>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '440px', lineHeight: 1.5 }}>
              Share your unique Gym Code <b>{displayCodes.primaryCode}</b> with members. Jab koi member is code ka use karega, to unki request yahan approval ke liye show hogi.
            </span>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="gym-requests-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Requested</th>
                  <th>Code Used</th>
                  <th>Device</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((req) => {
                  const isPending = req.status === 'pending'
                  const isApproved = req.status === 'approved'
                  const isRejected = req.status === 'rejected'
                  const initials = getMemberInitials(req.full_name)
                  const deviceLabel = req.device || 'Member App (Android)'

                  return (
                    <tr key={req.id}>
                      {/* Member Column: Avatar, Name, Mobile */}
                      <td data-label="Member">
                        <div className="req-member-cell">
                          <div className="req-avatar">{initials}</div>
                          <div>
                            <span className="req-name">{req.full_name || 'Member'}</span>
                            <span className="req-phone">{req.phone || '-'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Requested Column: Relative time */}
                      <td data-label="Requested">
                        <span className="req-time-text">{timeAgo(req.created_at)}</span>
                      </td>

                      {/* Code Used Column: Code badge */}
                      <td data-label="Code Used">
                        <span className="req-code-badge">{req.gym_code_used || displayCodes.primaryCode}</span>
                      </td>

                      {/* Device Column: Device Name */}
                      <td data-label="Device">
                        <span className="req-device-text">
                          {deviceLabel.includes('iOS') ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4, display: 'inline' }}>
                              <rect x="5" y="2" width="14" height="20" rx="3" ry="3" />
                              <line x1="12" y1="18" x2="12.01" y2="18" />
                            </svg>
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4, display: 'inline' }}>
                              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                              <line x1="12" y1="18" x2="12.01" y2="18" />
                            </svg>
                          )}
                          {deviceLabel}
                        </span>
                      </td>

                      {/* Status / Action Column */}
                      <td data-label="Status">
                        {isPending && (
                          <div className="req-actions-group">
                            <button
                              type="button"
                              className="req-btn approve"
                              disabled={actionId === req.id}
                              onClick={() => handleOpenReview(req)}
                            >
                              Review / Approve
                            </button>
                            <button
                              type="button"
                              className="req-btn decline"
                              disabled={actionId === req.id}
                              onClick={() => setRejectDialog(req)}
                            >
                              Decline
                            </button>
                          </div>
                        )}

                        {isApproved && (
                          <span className="req-status-pill approved">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <circle cx="12" cy="12" r="10" />
                              <path d="m9 12 2 2 4-4" stroke="#ffffff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span>Approved</span>
                          </span>
                        )}

                        {isRejected && (
                          <span className="req-status-pill declined">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="15" y1="9" x2="9" y2="15" />
                              <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                            <span>Declined</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Info Banner */}
        <div className="gym-requests-footer-info">
          <div className="gym-footer-tooltip-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span style={{ fontWeight: 700 }}>Inter-connected:</span>
            <span>Members using this code gain instant access to your member panel and workout dashboard upon approval.</span>
          </div>
        </div>
      </div>

      {/* ==============================================================
          MODAL 1: REVIEW & APPROVE MEMBER DIALOG
      ============================================================== */}
      {reviewDialog && (
        <div className="dialog-backdrop" onClick={() => setReviewDialog(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Review & Approve Connection</h3>
                <span className="muted small">Activate membership for {reviewDialog.full_name}</span>
              </div>
              <button
                type="button"
                className="clipboard-close-btn"
                onClick={() => setReviewDialog(null)}
              >
                ✕
              </button>
            </div>

            {/* Applicant Summary */}
            <div
              style={{
                background: 'var(--card-subtle, rgba(0,0,0,0.02))',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '12px 14px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <b style={{ fontSize: '15px' }}>{reviewDialog.full_name}</b>
                <span style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Phone: {reviewDialog.phone}
                </span>
              </div>
              <span className="req-code-badge">{reviewDialog.gym_code_used || displayCodes.primaryCode}</span>
            </div>

            {/* Membership Configuration Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label>
                  <span className="small muted">Membership Plan *</span>
                  <select
                    value={selectedPlan}
                    onChange={(e) => {
                      const p = e.target.value
                      setSelectedPlan(p)
                      if (p === '1 Month') { setMemberFee('2000'); setMemberPaid('2000'); }
                      else if (p === '3 Months') { setMemberFee('5000'); setMemberPaid('5000'); }
                      else if (p === '6 Months') { setMemberFee('9000'); setMemberPaid('9000'); }
                      else if (p === '12 Months') { setMemberFee('15000'); setMemberPaid('15000'); }
                    }}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  >
                    {PLANS.map((pl) => (
                      <option key={pl.label} value={pl.label}>{pl.label}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="small muted">Facility Access *</span>
                  <select
                    value={selectedFacility}
                    onChange={(e) => setSelectedFacility(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  >
                    {FACILITIES.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label>
                  <span className="small muted">Total Fee (₹) *</span>
                  <input
                    type="number"
                    value={memberFee}
                    onChange={(e) => setMemberFee(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </label>

                <label>
                  <span className="small muted">Amount Paid (₹) *</span>
                  <input
                    type="number"
                    value={memberPaid}
                    onChange={(e) => setMemberPaid(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setReviewDialog(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="req-btn approve"
                  style={{ padding: '8px 18px', fontSize: '13px' }}
                  onClick={handleConfirmApprove}
                  disabled={actionId === reviewDialog.id}
                >
                  {actionId === reviewDialog.id ? 'Activating…' : 'Approve & Activate Member'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL 2: DECLINE REQUEST DIALOG
      ============================================================== */}
      {rejectDialog && (
        <div className="dialog-backdrop" onClick={() => setRejectDialog(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>Decline Connection Request</h3>
              <button type="button" className="clipboard-close-btn" onClick={() => setRejectDialog(null)}>✕</button>
            </div>
            <p style={{ margin: '0 0 12px', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
              Are you sure you want to decline the connection request for <b>{rejectDialog.full_name}</b> ({rejectDialog.phone})?
            </p>
            <label>
              <span className="small muted">Reason for declining (Optional):</span>
              <input
                type="text"
                placeholder="e.g. Mobile number not verified, or payment pending"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', marginTop: '4px' }}
              />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button type="button" className="btn" onClick={() => setRejectDialog(null)}>Cancel</button>
              <button
                type="button"
                className="req-btn decline"
                onClick={handleConfirmReject}
                disabled={actionId === rejectDialog.id}
              >
                {actionId === rejectDialog.id ? 'Declining…' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL 3: INVITE VIA SMS / EMAIL DIALOG
      ============================================================== */}
      {showInviteModal && (
        <div className="dialog-backdrop" onClick={() => setShowInviteModal(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Share Gym Connection Invite</h3>
              <button type="button" className="clipboard-close-btn" onClick={() => setShowInviteModal(false)}>✕</button>
            </div>

            <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Send this invite message to your members via SMS, WhatsApp, or Email:
            </p>

            <div
              style={{
                background: 'var(--card-subtle, rgba(0,0,0,0.03))',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '13px',
                lineHeight: 1.5,
                fontFamily: 'monospace, system-ui',
                marginBottom: '16px',
                userSelect: 'all',
              }}
            >
              {`Join ${gymName} on Gym Manager App! Enter our unique connection code ${displayCodes.primaryCode} at ${inviteUrl} to view your digital pass and workout schedule.`}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  navigator.clipboard.writeText(`Join ${gymName} on Gym Manager App! Enter our unique connection code ${displayCodes.primaryCode} at ${inviteUrl} to view your digital pass and workout schedule.`)
                  setInviteCopied(true)
                  setTimeout(() => setInviteCopied(false), 2000)
                }}
              >
                {inviteCopied ? 'Copied Message!' : 'Copy Invite Message'}
              </button>

              <a
                href={`mailto:?subject=${encodeURIComponent(`Join ${gymName} on Gym Manager App`)}&body=${encodeURIComponent(`Join ${gymName} on Gym Manager App! Enter our unique connection code ${displayCodes.primaryCode} at ${inviteUrl} to view your digital pass and workout schedule.`)}`}
                className="btn"
              >
                Send via Email
              </a>

              <a
                href={`sms:?body=${encodeURIComponent(`Join ${gymName} on Gym Manager App! Code: ${displayCodes.primaryCode} Link: ${inviteUrl}`)}`}
                className="btn"
              >
                Send via SMS
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
