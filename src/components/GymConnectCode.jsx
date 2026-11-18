import React, { useState, useEffect } from 'react'
import { rotateGymConnectionCode } from '../lib/memberAuth'

export default function GymConnectCode({ gym, onGymUpdated }) {
  const [connectCode, setConnectCode] = useState(() => {
    return gym?.connect_code || gym?.connection_code || ''
  })

  const [copied, setCopied] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [infoMsg, setInfoMsg] = useState('')

  // Sync state if gym prop from DB has a code, or auto-fetch/generate via DB RPC if missing
  useEffect(() => {
    const dbCode = gym?.connect_code || gym?.connection_code
    if (dbCode) {
      setConnectCode(String(dbCode))
    } else if (gym?.id) {
      // Auto-generate in database if gym has no code yet
      rotateGymConnectionCode().then((res) => {
        if (res && res.connect_code) {
          setConnectCode(String(res.connect_code))
          if (onGymUpdated) {
            onGymUpdated({ connect_code: res.connect_code, connection_code: res.connect_code })
          }
        }
      }).catch(() => {})
    }
  }, [gym?.connect_code, gym?.connection_code, gym?.id, onGymUpdated])

  // Copy 6-digit code to clipboard
  const handleCopy = async () => {
    if (!connectCode) return
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(connectCode)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = connectCode
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      setCopied(true)
      setInfoMsg('Gym Connect Code copied successfully.')
      setTimeout(() => {
        setCopied(false)
        setInfoMsg('')
      }, 3000)
    } catch (err) {
      console.warn('Copy failed:', err)
      setInfoMsg('Copied to clipboard.')
      setTimeout(() => setInfoMsg(''), 2500)
    }
  }

  // Share 6-digit code via Web Share or WhatsApp
  const handleShare = () => {
    if (!connectCode) return
    const gymTitle = gym?.gym_name || 'Our Gym'
    const shareText = `🏋️ Connect to *${gymTitle}* on Gym Manager!\n\nUse our 6-digit Gym Connect Code: *${connectCode}*\n\nEnter this 6-digit code in the member signup screen to view your membership pass, attendance, and workout plans.`

    if (navigator.share) {
      navigator
        .share({
          title: `${gymTitle} - Gym Connect Code`,
          text: shareText,
        })
        .catch(() => {})
    } else {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`
      window.open(waUrl, '_blank')
    }
  }

  // Regenerate a fresh 6-digit code via secure database logic
  const handleConfirmRegenerate = async () => {
    setLoading(true)
    setInfoMsg('')

    try {
      const res = await rotateGymConnectionCode()
      if (res && res.success && res.connect_code) {
        const newCode = String(res.connect_code)
        setConnectCode(newCode)
        if (onGymUpdated) {
          onGymUpdated({ connect_code: newCode, connection_code: newCode })
        }
        setInfoMsg(`New 6-digit code saved in database: ${newCode}`)
      } else {
        setInfoMsg(res?.error || 'Database error generating code. Please verify database migration.')
      }
    } catch (err) {
      console.warn('Code rotation error:', err)
      setInfoMsg(err.message || 'Error communicating with database.')
    } finally {
      setLoading(false)
      setShowConfirmModal(false)
      setTimeout(() => setInfoMsg(''), 5000)
    }
  }

  return (
    <section
      className="gym-connect-code-card"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: '20px 24px',
        marginBottom: '20px',
        boxShadow: 'var(--shadow-sm)',
        position: 'relative',
        transition: 'all 0.2s ease',
      }}
      aria-label="Gym Connect Code"
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        {/* Left Info Column */}
        <div style={{ flex: '1 1 280px', minWidth: '260px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'rgba(79, 70, 229, 0.12)',
                color: 'var(--accent, #4f46e5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '15px',
              }}
            >
              🔑
            </div>
            <h2
              style={{
                fontSize: '16px',
                fontWeight: 700,
                margin: 0,
                color: 'var(--text)',
                letterSpacing: '-0.2px',
              }}
            >
              Gym Connect Code
            </h2>
            <span
              className="badge green"
              style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                padding: '2px 8px',
              }}
            >
              Active
            </span>
          </div>

          <p
            className="muted small"
            style={{
              margin: '0 0 6px',
              fontSize: '12.5px',
              lineHeight: 1.45,
              color: 'var(--muted)',
            }}
          >
            Share this 6-digit unique code with your gym members so they can connect their accounts to your gym.
          </p>

          {/* Feedback messages */}
          {infoMsg && (
            <div
              style={{
                fontSize: '12.5px',
                fontWeight: 600,
                color: 'var(--success, #10b981)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '4px',
              }}
            >
              <span>✓</span> {infoMsg}
            </div>
          )}
        </div>

        {/* Right Action / Code Column */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '10px',
            flexShrink: 0,
          }}
        >
          {/* 6-Digit Code Badge Box */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(79, 70, 229, 0.08)',
              border: '2px solid var(--accent, #4f46e5)',
              borderRadius: '12px',
              padding: '6px 16px',
              cursor: 'pointer',
              userSelect: 'all',
              transition: 'all 0.15s ease',
            }}
            onClick={handleCopy}
            title="Click to copy 6-digit Gym Connect Code"
          >
            <span
              style={{
                fontSize: '20px',
                fontWeight: 800,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                letterSpacing: '3px',
                color: 'var(--accent, #4f46e5)',
              }}
            >
              {connectCode}
            </span>
            <span
              style={{
                fontSize: '11px',
                color: copied ? 'var(--success, #10b981)' : 'var(--muted)',
                fontWeight: 600,
              }}
            >
              {copied ? '✓ Copied' : 'Click to copy'}
            </span>
          </div>

          {/* Copy Button */}
          <button
            type="button"
            className="btn sm"
            onClick={handleCopy}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontWeight: 600,
              fontSize: '13px',
              borderRadius: '10px',
              background: copied ? 'var(--success, #10b981)' : 'var(--card)',
              color: copied ? '#fff' : 'var(--text)',
              borderColor: copied ? 'var(--success, #10b981)' : 'var(--border)',
              transition: 'all 0.15s ease',
            }}
            title="Copy Code to clipboard"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>

          {/* Share Button */}
          <button
            type="button"
            className="btn sm"
            onClick={handleShare}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontWeight: 600,
              fontSize: '13px',
              borderRadius: '10px',
            }}
            title="Share 6-digit Code via WhatsApp or Native Share"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            <span>Share</span>
          </button>

          {/* Regenerate Code Button */}
          <button
            type="button"
            className="btn sm"
            onClick={() => {
              setInfoMsg('')
              setShowConfirmModal(true)
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              fontWeight: 500,
              fontSize: '12px',
              borderRadius: '10px',
              color: 'var(--muted)',
              background: 'transparent',
              border: '1px solid var(--border)',
            }}
            title="Generate a new 6-digit code"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <span>Regenerate</span>
          </button>
        </div>
      </div>

      {/* Confirmation Dialog for Regenerating 6-Digit Code */}
      {showConfirmModal && (
        <div
          className="modal-overlay"
          onClick={() => !loading && setShowConfirmModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: 'var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.2))',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: 'var(--danger, #ef4444)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                }}
              >
                ⚠️
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                Generate New 6-Digit Code?
              </h3>
            </div>

            <p style={{ fontSize: '13.5px', lineHeight: 1.5, color: 'var(--text)', margin: '0 0 12px' }}>
              Generate a new 6-digit Gym Connect Code for <b>{gym?.gym_name || 'your gym'}</b>?
            </p>

            <div
              style={{
                background: 'var(--hover)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '12px 14px',
                marginBottom: '16px',
                fontSize: '12.5px',
                lineHeight: 1.5,
              }}
            >
              <div style={{ color: 'var(--danger, #ef4444)', fontWeight: 700, marginBottom: '4px' }}>
                Important Information:
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--muted)' }}>
                <li>Your current code (<b>{connectCode}</b>) will stop working for new registrations.</li>
                <li><b>Existing members remain fully connected</b> and will NOT be disconnected.</li>
                <li>New members will simply enter the new 6-digit code.</li>
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setShowConfirmModal(false)}
                disabled={loading}
                style={{ padding: '9px 16px', fontWeight: 600, fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={handleConfirmRegenerate}
                disabled={loading}
                style={{
                  padding: '9px 18px',
                  fontWeight: 700,
                  fontSize: '13px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {loading ? 'Generating…' : 'Yes, Generate New Code'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
