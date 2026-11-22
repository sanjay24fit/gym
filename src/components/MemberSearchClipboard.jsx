import React, { useState, useEffect, useRef } from 'react'
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
import { formatPhoneForWhatsApp } from '../lib/whatsappReminder'

function getMemberInitials(name) {
  if (!name) return 'GM'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export default function MemberSearchClipboard({
  members = [],
  gym = null,
  onClose,
  onPreviewPass,
  onRenew,
  onEdit,
  onPay,
  onOpenMemberInList,
}) {
  const [query, setQuery] = useState('')
  const [copiedPhone, setCopiedPhone] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    // Focus search input automatically on open
    inputRef.current?.focus()

    // Handle ESC key to close modal
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const cleanQuery = query.trim().toLowerCase()
  const digitsQuery = query.replace(/\D/g, '')

  // Filter members strictly based on query
  const matchedMembers = cleanQuery
    ? members.filter((m) => {
        const nameMatch = (m.name || '').toLowerCase().includes(cleanQuery)
        const phoneDigits = String(m.phone || '').replace(/\D/g, '')
        const phoneMatch = digitsQuery.length > 0 && phoneDigits.includes(digitsQuery)
        return nameMatch || phoneMatch
      })
    : []

  const handleCopyPhone = (phone) => {
    if (!phone) return
    navigator.clipboard?.writeText(phone)
    setCopiedPhone(phone)
    setTimeout(() => setCopiedPhone(null), 2000)
  }

  const getWhatsAppUrl = (member) => {
    const waPhone = formatPhoneForWhatsApp(member.phone)
    const gymName = gym?.gym_name || 'Gym Manager'
    const status = membershipStatus(member)
    let message = `Namaste ${member.name} ji!\nThis is from *${gymName}*.`
    if (status === 'expired') {
      message = `Namaste ${member.name} ji!\nAapki *${gymName}* ki gym membership expire ho chuki hai. Kripya samay par renew karwayein.\nDhanyawad, *${gymName}*`
    } else if (status === 'expiring') {
      message = `Namaste ${member.name} ji!\nAapki *${gymName}* ki membership jald hi khatam hone wali hai (${formatDate(member.end_date)}). Please renew at the gym counter.\nDhanyawad, *${gymName}*`
    }
    return waPhone
      ? `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`
  }

  return (
    <div className="clipboard-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="clipboard-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="clipboard-header">
          <div className="clipboard-title-wrap">
            <div className="clipboard-icon-badge" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <circle cx="12" cy="13" r="3" />
                <line x1="14.5" y1="15.5" x2="18" y2="19" />
              </svg>
            </div>
            <div>
              <h3 className="clipboard-title">Member Quick Search Clipboard</h3>
              <p className="clipboard-subtitle">
                Type member name or mobile number to check their status & details
              </p>
            </div>
          </div>
          <button
            type="button"
            className="clipboard-close-btn"
            onClick={onClose}
            aria-label="Close search"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        <div className="clipboard-search-bar">
          <div className="clipboard-input-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              className="clipboard-search-input"
              placeholder="Search member by name or mobile number…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                className="clipboard-clear-btn"
                onClick={() => {
                  setQuery('')
                  inputRef.current?.focus()
                }}
                aria-label="Clear search"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Body Content */}
        <div className="clipboard-body">
          {/* State 1: No query entered yet */}
          {!cleanQuery && (
            <div className="clipboard-state-box">
              <div className="clipboard-state-icon accent">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <circle cx="19" cy="11" r="2" />
                  <line x1="22" y1="14" x2="20" y2="12" />
                </svg>
              </div>
              <div className="clipboard-state-title">Search Member by Name or Mobile</div>
              <p className="clipboard-state-desc">
                Member ka naam ya 10-digit mobile number type karein. List me person milte hi unki puri profile, validity, expiry aur payment details yahan show hogi.
              </p>
            </div>
          )}

          {/* State 2: Query entered, but no member matches */}
          {cleanQuery && matchedMembers.length === 0 && (
            <div className="clipboard-state-box">
              <div className="clipboard-state-icon warning">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div className="clipboard-state-title">No Member Found</div>
              <p className="clipboard-state-desc">
                "{query}" se koi registered member nahi mila. Kripya naam ki spelling ya mobile number dobara check karein.
              </p>
            </div>
          )}

          {/* State 3: Member(s) matched - Show ONLY their detail */}
          {cleanQuery && matchedMembers.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {matchedMembers.length === 1 ? '1 Matching Member Found' : `${matchedMembers.length} Matching Members Found`}
                </span>
                {matchedMembers.length > 1 && (
                  <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                    Type full phone/name to narrow down
                  </span>
                )}
              </div>

              {matchedMembers.map((m) => {
                const status = membershipStatus(m)
                const due = dueAmount(m)
                const facility = getMemberFacility(m)
                const hasPT = hasPersonalTrainer(m)
                const trainerName = getTrainerName(m)
                const initials = getMemberInitials(m.name)
                const waUrl = getWhatsAppUrl(m)

                return (
                  <div key={m.id} className="clipboard-member-card">
                    {/* Head: Initials, Name, Phone & Status Badge */}
                    <div className="clipboard-card-head">
                      <div className="clipboard-avatar-group">
                        <div className="clipboard-avatar">{initials}</div>
                        <div>
                          <h4 className="clipboard-member-name">{m.name}</h4>
                          <div className="clipboard-member-phone-wrap">
                            <a href={`tel:${m.phone}`} className="clipboard-phone-link" title="Call member">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                              </svg>
                              <span>{m.phone}</span>
                            </a>
                            <button
                              type="button"
                              className="clipboard-copy-btn"
                              onClick={() => handleCopyPhone(m.phone)}
                              title="Copy mobile number"
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                              <span>{copiedPhone === m.phone ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span className={`member-pill-badge ${status}`}>
                        {status === 'active' ? (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="12" r="10" />
                            <path d="m9 12 2 2 4-4" stroke="#ffffff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : status === 'expiring' ? (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                        ) : (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                        )}
                        <span>{status === 'active' ? 'Active' : status === 'expiring' ? 'Expiring Soon' : 'Expired'}</span>
                      </span>
                    </div>

                    {/* Details Grid: Plan & Facility, Expiry, Payment */}
                    <div className="clipboard-details-grid">
                      {/* Box 1: Plan & Facility */}
                      <div className="clipboard-detail-item">
                        <span className="clipboard-detail-label">Plan & Facility</span>
                        <span className="clipboard-detail-val">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <line x1="6" y1="5" x2="6" y2="19" />
                            <line x1="18" y1="5" x2="18" y2="19" />
                            <line x1="2" y1="12" x2="22" y2="12" />
                          </svg>
                          <span>{m.plan}</span>
                        </span>
                        <span className="clipboard-detail-sub">{facility}</span>
                      </div>

                      {/* Box 2: Joined & Expiry */}
                      <div className="clipboard-detail-item">
                        <span className="clipboard-detail-label">Expiry & Validity</span>
                        <span className="clipboard-detail-val">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <span>{formatDate(m.end_date)}</span>
                        </span>
                        <span className="clipboard-detail-sub">{expiryText(m.end_date)}</span>
                      </div>

                      {/* Box 3: Payment Status */}
                      <div className="clipboard-detail-item">
                        <span className="clipboard-detail-label">Payment</span>
                        <span className="clipboard-detail-val" style={{ color: due > 0 ? '#DC2626' : 'var(--accent, #10B981)' }}>
                          {due > 0 ? `${formatMoney(due)} Due` : 'Paid'}
                        </span>
                        <span className="clipboard-detail-sub">
                          {formatMoney(m.paid_amount)} / {formatMoney(m.total_fee)}
                        </span>
                      </div>

                      {/* Box 4: Coach or Joining Date */}
                      <div className="clipboard-detail-item">
                        <span className="clipboard-detail-label">{hasPT ? 'Personal Trainer' : 'Joined Date'}</span>
                        <span className="clipboard-detail-val">
                          {hasPT ? (
                            <span>Coach: {trainerName || 'Assigned'}</span>
                          ) : (
                            <span>{formatDate(m.start_date)}</span>
                          )}
                        </span>
                        <span className="clipboard-detail-sub">
                          {hasPT ? `Since ${formatDate(m.start_date)}` : 'Active Member'}
                        </span>
                      </div>
                    </div>

                    {/* Actions Toolbar */}
                    <div className="clipboard-actions-bar">
                      {/* Pass Button */}
                      {onPreviewPass && (
                        <button
                          type="button"
                          className="clipboard-btn primary"
                          onClick={() => onPreviewPass(m)}
                          title="View Digital Member Pass"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                            <line x1="1" y1="10" x2="23" y2="10" />
                          </svg>
                          <span>Pass</span>
                        </button>
                      )}

                      {/* WhatsApp Button */}
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="clipboard-btn whatsapp"
                        title="Send WhatsApp message"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z" />
                        </svg>
                        <span>WhatsApp</span>
                      </a>

                      {/* Renew Button */}
                      {onRenew && (
                        <button
                          type="button"
                          className="clipboard-btn"
                          onClick={() => onRenew(m)}
                          title="Renew membership"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                          </svg>
                          <span>Renew</span>
                        </button>
                      )}

                      {/* Pay Due Button (if due exists) */}
                      {due > 0 && onPay && (
                        <button
                          type="button"
                          className="clipboard-btn"
                          onClick={() => onPay(m)}
                          title="Record payment"
                          style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#DC2626' }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="1" x2="12" y2="23" />
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                          </svg>
                          <span>Pay Due</span>
                        </button>
                      )}

                      {/* Edit Button */}
                      {onEdit && (
                        <button
                          type="button"
                          className="clipboard-btn"
                          onClick={() => onEdit(m)}
                          title="Edit member details"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                          </svg>
                          <span>Edit</span>
                        </button>
                      )}

                      {/* View in Members Tab */}
                      {onOpenMemberInList && (
                        <button
                          type="button"
                          className="clipboard-btn"
                          onClick={() => onOpenMemberInList(m)}
                          title="Open in Full Member Directory"
                          style={{ marginLeft: 'auto' }}
                        >
                          <span>View in List</span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
