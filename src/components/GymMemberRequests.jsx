import { useState, useEffect, useCallback } from 'react'
import {
  fetchGymMemberRequests,
  rotateGymConnectionCode,
  approveMemberJoinRequest,
  rejectMemberJoinRequest,
} from '../lib/memberAuth'
import { formatDate, formatMoney } from '../lib/utils'

export default function GymMemberRequests({ gym, existingMembers = [], reloadGym, reloadMembers }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)
  const [rotating, setRotating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [filter, setFilter] = useState('pending') // 'pending' | 'approved' | 'all'
  const [rejectDialog, setRejectDialog] = useState(null) // request object
  const [rejectReason, setRejectReason] = useState('')

  const loadRequests = useCallback(async () => {
    if (!gym?.id) return
    setLoading(true)
    const list = await fetchGymMemberRequests(gym.id)
    setRequests(list)
    setLoading(false)
  }, [gym])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  const gymCode = gym?.connection_code || 'Generating…'

  const handleCopyCode = () => {
    if (!gym?.connection_code) return
    navigator.clipboard.writeText(gym.connection_code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleShareWhatsApp = () => {
    if (!gym?.connection_code) return
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://gymmanager.app'
    const msg = `🏋️ Join *${gym?.gym_name || 'Our Gym'}* on Gym Manager App!\n\n1. Open: ${appUrl}\n2. Select: Gym Member → Join Gym\n3. Enter Gym Code: *${gym.connection_code}*\n\nAccess your digital membership pass, dues & workout plan!`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handleRotateCode = async () => {
    if (!window.confirm('Are you sure you want to generate a new Gym Connection Code? The old code will expire, but existing members will remain connected.')) {
      return
    }
    setRotating(true)
    const res = await rotateGymConnectionCode()
    setRotating(false)
    if (res.success) {
      if (reloadGym) reloadGym()
    } else {
      alert(res.error || 'Failed to rotate gym code.')
    }
  }

  const handleApprove = async (req, targetMemberId = null) => {
    setActionId(req.id)
    const res = await approveMemberJoinRequest(req.id, targetMemberId)
    setActionId(null)
    if (res.success) {
      await loadRequests()
      if (reloadMembers) reloadMembers()
    } else {
      alert(res.error || 'Failed to approve member.')
    }
  }

  const handleConfirmReject = async () => {
    if (!rejectDialog) return
    setActionId(rejectDialog.id)
    const res = await rejectMemberJoinRequest(rejectDialog.id, rejectReason)
    setActionId(null)
    setRejectDialog(null)
    setRejectReason('')
    if (res.success) {
      await loadRequests()
      if (reloadMembers) reloadMembers()
    } else {
      alert(res.error || 'Failed to reject member.')
    }
  }

  // Find existing member record in the gym by phone match
  const findExistingMatch = (req) => {
    if (req.member_id && req.members) {
      return req.members
    }
    const reqDigits = (req.phone || '').replace(/\D/g, '')
    if (!reqDigits) return null
    return existingMembers.find((m) => {
      const mDigits = (m.phone || '').replace(/\D/g, '')
      return mDigits && (mDigits === reqDigits || mDigits.endsWith(reqDigits) || reqDigits.endsWith(mDigits))
    })
  }

  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const filteredList = requests.filter((r) => {
    if (filter === 'pending') return r.status === 'pending'
    if (filter === 'approved') return r.status === 'approved'
    return true
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ==============================================================
          HERO: GYM CONNECTION & INVITE CODE
      ============================================================== */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(147, 51, 234, 0.04) 100%)',
          border: '1px solid rgba(79, 70, 229, 0.25)',
          padding: '22px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span className="badge blue" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Gym Member Invite System
            </span>
            <h2 style={{ margin: '6px 0 2px', fontSize: '20px', fontWeight: 800 }}>
              Gym Connection Code
            </h2>
            <p className="muted small" style={{ margin: 0, maxWidth: '480px' }}>
              Share this unique code with your gym members. When they download the app and enter this code, their account connects to <b>{gym?.gym_name}</b> for your approval.
            </p>
          </div>

          {/* Large Code Badge with Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '28px',
                fontWeight: 900,
                letterSpacing: '2px',
                background: 'var(--card)',
                padding: '8px 20px',
                borderRadius: '12px',
                border: '2px dashed var(--accent, #4f46e5)',
                color: 'var(--text)',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.12)',
              }}
            >
              {gymCode}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn sm"
                onClick={handleCopyCode}
                style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <span>{copied ? '✓ Copied' : '📋 Copy Code'}</span>
              </button>

              <button
                type="button"
                className="btn sm btn-whatsapp"
                onClick={handleShareWhatsApp}
                style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <span>💬 WhatsApp Invite</span>
              </button>

              <button
                type="button"
                className="btn sm secondary"
                onClick={handleRotateCode}
                disabled={rotating}
                title="Generate a new connection code"
                style={{ fontSize: '12px' }}
              >
                {rotating ? 'Regenerating…' : '🔄 New Code'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==============================================================
          MEMBER REQUESTS & APPROVAL SECTION
      ============================================================== */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Member Connection Requests</h3>
            <span className="muted small">Review and approve members registering with your Gym Code</span>
          </div>

          {/* Filter Chips */}
          <div className="chips" style={{ margin: 0 }}>
            <button
              type="button"
              className={`chip ${filter === 'pending' ? 'active' : ''}`}
              onClick={() => setFilter('pending')}
            >
              Pending {pendingCount > 0 && <span className="badge amber" style={{ marginLeft: 4 }}>{pendingCount}</span>}
            </button>
            <button
              type="button"
              className={`chip ${filter === 'approved' ? 'active' : ''}`}
              onClick={() => setFilter('approved')}
            >
              Approved
            </button>
            <button
              type="button"
              className={`chip ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All Requests
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
            Loading member connection requests…
          </div>
        ) : filteredList.length === 0 ? (
          <div className="empty" style={{ padding: '32px 16px' }}>
            <p style={{ margin: 0, fontWeight: 600 }}>No {filter} member requests found.</p>
            <span className="muted small">
              {filter === 'pending'
                ? 'When a member signs up using your Gym Code, their request will appear here for approval.'
                : 'Share your Gym Connection Code to invite members to the mobile app.'}
            </span>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Mobile Number</th>
                  <th>Status</th>
                  <th>Existing Record Match</th>
                  <th>Requested Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((req) => {
                  const match = findExistingMatch(req)
                  const isPending = req.status === 'pending'
                  const isApproved = req.status === 'approved'
                  const isRejected = req.status === 'rejected'

                  return (
                    <tr key={req.id}>
                      <td data-label="Member">
                        <b>{req.full_name || 'Member'}</b>
                        <span className="muted small block">{req.email}</span>
                      </td>

                      <td data-label="Mobile">
                        <span style={{ fontFamily: 'monospace' }}>{req.phone || '-'}</span>
                      </td>

                      <td data-label="Status">
                        {isPending && <span className="badge amber">⏳ Pending Approval</span>}
                        {isApproved && <span className="badge green">✓ Approved & Linked</span>}
                        {isRejected && <span className="badge red">✕ Rejected</span>}
                      </td>

                      <td data-label="Record Match">
                        {match ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span className="badge green" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              ✓ Matches: {match.name}
                            </span>
                            <span className="muted small">
                              {match.plan || 'Plan'} · {formatMoney(match.paid_amount)} paid
                            </span>
                          </div>
                        ) : (
                          <span className="muted small">New Member Record</span>
                        )}
                      </td>

                      <td data-label="Date">
                        <span className="small">{formatDate(req.created_at?.slice(0, 10))}</span>
                      </td>

                      <td data-label="Actions" className="actions">
                        {isPending && (
                          <>
                            <button
                              type="button"
                              className="btn sm primary"
                              disabled={actionId === req.id}
                              onClick={() => handleApprove(req, match?.id)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <span>✓</span>
                              <span>{match ? 'Link & Approve' : 'Approve'}</span>
                            </button>

                            <button
                              type="button"
                              className="btn sm danger"
                              disabled={actionId === req.id}
                              onClick={() => setRejectDialog(req)}
                            >
                              ✕ Reject
                            </button>
                          </>
                        )}

                        {isApproved && (
                          <span className="muted small font-mono">
                            Linked to #{req.member_id ? req.member_id.slice(0, 8) : 'RECORD'}
                          </span>
                        )}

                        {isRejected && (
                          <button
                            type="button"
                            className="btn sm"
                            onClick={() => handleApprove(req, match?.id)}
                            title="Re-approve this member"
                          >
                            Re-Approve
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
      </div>

      {/* Reject Modal */}
      {rejectDialog && (
        <div className="modal-backdrop" onClick={() => setRejectDialog(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-head">
              <h3>Reject Connection Request</h3>
              <button type="button" className="btn sm icon-btn" onClick={() => setRejectDialog(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ margin: 0, fontSize: '14px' }}>
                Are you sure you want to reject the connection request for <b>{rejectDialog.full_name}</b> ({rejectDialog.phone})?
              </p>
              <label>
                <span className="small muted">Reason for Rejection (Optional)</span>
                <input
                  type="text"
                  placeholder="e.g. Mobile number not registered with gym"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </label>
              <div className="modal-actions" style={{ marginTop: '8px' }}>
                <button type="button" className="btn" onClick={() => setRejectDialog(null)}>Cancel</button>
                <button
                  type="button"
                  className="btn danger-solid"
                  onClick={handleConfirmReject}
                  disabled={actionId === rejectDialog.id}
                >
                  {actionId === rejectDialog.id ? 'Rejecting…' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
