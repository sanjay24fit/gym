import { useState } from 'react'
import Modal from './Modal'
import { WhatsAppIcon } from './WhatsAppSupport'
import { daysLeft, formatDate } from '../lib/utils'
import {
  buildWhatsAppReminderUrl,
  buildExpiryReminderText,
  isReminderSent,
  markReminderSent,
  formatPhoneForWhatsApp,
} from '../lib/whatsappReminder'

export default function ExpiryWhatsAppModal({
  isOpen,
  onClose,
  members = [],
  gym,
}) {
  const [filterMode, setFilterMode] = useState('2days') // '2days' | 'urgent'
  const [, setRefreshState] = useState(0)
  const [previewMember, setPreviewMember] = useState(null)

  if (!isOpen) return null

  // Filter members based on selected mode
  const candidates = members.filter((m) => {
    const left = daysLeft(m.end_date)
    if (filterMode === '2days') return left === 2
    return left >= 0 && left <= 2
  })

  // Sort by days left ascending (most urgent first)
  const sorted = [...candidates].sort((a, b) => daysLeft(a.end_date) - daysLeft(b.end_date))

  const handleSendReminder = (m) => {
    const left = daysLeft(m.end_date)
    const url = buildWhatsAppReminderUrl({
      phone: m.phone,
      memberName: m.name,
      gymName: gym?.gym_name,
      endDate: m.end_date,
      daysLeftCount: left,
      ownerPhone: gym?.phone,
    })

    markReminderSent(m.id, m.end_date)
    setRefreshState((prev) => prev + 1)
    window.open(url, '_blank')
  }

  // Find next pending member to send
  const nextPending = sorted.find((m) => !isReminderSent(m.id, m.end_date) && m.phone)

  return (
    <Modal title="⏰ WhatsApp Expiry Reminders" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '580px' }}>
        {/* Filter / Mode Selector */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div className="tabs" style={{ margin: 0 }}>
            <button
              type="button"
              className={filterMode === '2days' ? 'active' : ''}
              onClick={() => setFilterMode('2days')}
              style={{ fontSize: '12px', padding: '5px 12px' }}
            >
              Exact 2 Days Left ({members.filter((m) => daysLeft(m.end_date) === 2).length})
            </button>
            <button
              type="button"
              className={filterMode === 'urgent' ? 'active' : ''}
              onClick={() => setFilterMode('urgent')}
              style={{ fontSize: '12px', padding: '5px 12px' }}
            >
              0 - 2 Days Left ({members.filter((m) => daysLeft(m.end_date) >= 0 && daysLeft(m.end_date) <= 2).length})
            </button>
          </div>

          {nextPending && (
            <button
              type="button"
              className="btn sm btn-whatsapp"
              onClick={() => handleSendReminder(nextPending)}
              title={`Send to ${nextPending.name}`}
            >
              <WhatsAppIcon size={13} />
              <span>Send Next ({nextPending.name.split(' ')[0]})</span>
            </button>
          )}
        </div>

        {/* Informative Alert Banner */}
        <div
          style={{
            background: 'var(--amber-subtle, #fef3c7)',
            border: '1px solid var(--amber, #f59e0b)',
            borderRadius: '12px',
            padding: '10px 14px',
            fontSize: '12.5px',
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#b45309' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 11 18-5v12L3 14v-3z" />
              <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
            </svg>
          </span>
          <div>
            <b>Membership Expiry Notification:</b>
            <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
              Send 1-click WhatsApp expiry reminder alerts to members.
            </div>
          </div>
        </div>

        {/* Member Candidates List */}
        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 15px', color: 'var(--muted)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '50%', background: 'var(--hover)', color: 'var(--primary)', margin: '0 auto 8px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </span>
            <b>No memberships expiring in the next 2 days.</b>
          </div>
        ) : (
          <div style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '2px' }}>
            {sorted.map((m) => {
              const left = daysLeft(m.end_date)
              const sent = isReminderSent(m.id, m.end_date)
              const hasPhone = Boolean(formatPhoneForWhatsApp(m.phone))

              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    background: sent ? 'var(--card-hover)' : 'var(--card)',
                    gap: '10px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: sent ? '#10b981' : '#f59e0b',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '13px',
                        flexShrink: 0,
                      }}
                    >
                      {m.name ? m.name.slice(0, 2).toUpperCase() : 'GM'}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <b style={{ fontSize: '13.5px' }}>{m.name}</b>
                        <span
                          className={`badge ${left === 2 ? 'amber' : left === 1 ? 'red' : 'purple'}`}
                          style={{ fontSize: '10.5px', padding: '1px 6px' }}
                        >
                          {left === 2 ? '2 Days Left' : left === 1 ? '1 Day Left' : 'Expires Today'}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="3"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                        <span>{m.phone || 'No Phone Registered'} · Plan: {m.plan || 'Standard'} · Exp: {formatDate(m.end_date)}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      className="link"
                      onClick={() => setPreviewMember(m)}
                      style={{ fontSize: '11.5px', padding: '4px' }}
                    >
                      Preview
                    </button>

                    <button
                      type="button"
                      className={`btn sm ${sent ? 'secondary' : 'btn-whatsapp'}`}
                      disabled={!hasPhone}
                      onClick={() => handleSendReminder(m)}
                      title={hasPhone ? 'Send WhatsApp Expiry Reminder' : 'No phone number available'}
                    >
                      <WhatsAppIcon size={12} />
                      <span>{sent ? 'Resend' : 'Send WhatsApp'}</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Message Preview Drawer / Accordion */}
        {previewMember && (
          <div
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '12px 14px',
              fontSize: '12px',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <b style={{ color: 'var(--text)' }}>Message Preview for {previewMember.name}:</b>
              <button
                type="button"
                className="link"
                style={{ fontSize: '11px' }}
                onClick={() => setPreviewMember(null)}
              >
                Hide
              </button>
            </div>
            <pre
              style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit',
                fontSize: '12px',
                color: 'var(--text)',
                lineHeight: 1.45,
                background: 'var(--card)',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
              }}
            >
              {buildExpiryReminderText({
                memberName: previewMember.name,
                gymName: gym?.gym_name,
                endDate: previewMember.end_date,
                daysLeftCount: daysLeft(previewMember.end_date),
                ownerPhone: gym?.phone,
              })}
            </pre>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
          <button type="button" className="btn secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
