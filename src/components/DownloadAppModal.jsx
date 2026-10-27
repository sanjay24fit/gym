import { useState } from 'react'
import GymLogo from './GymLogo'

export default function DownloadAppModal({ isOpen, onClose, deferredPrompt, onInstalled }) {
  const [installing, setInstalling] = useState(false)

  const [platform] = useState(() => {
    if (typeof window === 'undefined') return 'unknown'
    const ua = navigator.userAgent || ''
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'ios'
    if (/Android/i.test(ua)) return 'android'
    return 'desktop'
  })

  const [isStandalone] = useState(() => {
    if (typeof window === 'undefined') return false
    return Boolean(
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true,
    )
  })

  if (!isOpen) return null

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return
    setInstalling(true)
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        if (onInstalled) onInstalled()
        onClose()
      }
    } catch (err) {
      console.warn('Install prompt error:', err)
    } finally {
      setInstalling(false)
    }
  }

  return (
    <div
      className="dialog-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="dialog" style={{ maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'inline-block', marginBottom: '8px' }}>
            <GymLogo size={52} />
          </div>
          <h3 style={{ margin: '4px 0 2px' }}>Download Gym Manager APK</h3>
          <p className="small muted">
            Install the app / APK on your phone for fast, full-screen offline-ready access.
          </p>
        </div>

        {isStandalone ? (
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              background: 'var(--success-bg)',
              border: '1px solid var(--success-border)',
              textAlign: 'center',
              marginBottom: '16px',
            }}
          >
            <b style={{ color: 'var(--success)', display: 'block', marginBottom: '4px' }}>
              App Already Installed!
            </b>
            <span className="small muted">
              You are currently using Gym Manager in standalone app mode from your home screen.
            </span>
          </div>
        ) : (
          <>
            {/* Direct 1-click install button if browser prompt is available */}
            {deferredPrompt && (
              <div style={{ marginBottom: '16px' }}>
                <button
                  type="button"
                  className="btn accent full"
                  style={{ padding: '12px', fontSize: '15px' }}
                  onClick={handleNativeInstall}
                  disabled={installing}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>{installing ? 'Downloading APK...' : 'Download APK / Install Now (1-Tap)'}</span>
                </button>
              </div>
            )}

            {/* Platform-specific instructions */}
            <div
              style={{
                background: 'var(--card-subtle)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{platform === 'ios' ? '🍏 iPhone / iPad' : platform === 'android' ? '🤖 Android Phone' : '💻 PC / Mac'}</span>
                <span>Installation Guide:</span>
              </div>

              {platform === 'ios' ? (
                <ol
                  style={{
                    margin: 0,
                    paddingLeft: '20px',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    color: 'var(--text)',
                  }}
                >
                  <li>
                    Open this page in <b>Safari</b> browser.
                  </li>
                  <li>
                    Tap the <b>Share</b> button{' '}
                    <span style={{ fontSize: '14px', display: 'inline-block' }}>⎋</span> (square with arrow) at the bottom.
                  </li>
                  <li>
                    Scroll down and tap <b>&ldquo;Add to Home Screen&rdquo;</b>.
                  </li>
                  <li>
                    Tap <b>&ldquo;Add&rdquo;</b> in the top right. Gym Manager icon will appear on your home screen!
                  </li>
                </ol>
              ) : platform === 'android' ? (
                <ol
                  style={{
                    margin: 0,
                    paddingLeft: '20px',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    color: 'var(--text)',
                  }}
                >
                  <li>
                    Tap the <b>three dots (⋮)</b> in the top-right corner of Chrome.
                  </li>
                  <li>
                    Select <b>&ldquo;Install app&rdquo;</b> or <b>&ldquo;Add to Home screen&rdquo;</b>.
                  </li>
                  <li>
                    Tap <b>&ldquo;Install&rdquo;</b> to download the app on your phone.
                  </li>
                </ol>
              ) : (
                <ol
                  style={{
                    margin: 0,
                    paddingLeft: '20px',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    color: 'var(--text)',
                  }}
                >
                  <li>
                    Click the <b>Install</b> icon on the right side of the browser address bar (or menu <b>⋮</b> &gt; <b>&ldquo;Install Gym Manager&rdquo;</b>).
                  </li>
                  <li>
                    Click <b>&ldquo;Install&rdquo;</b> when prompted.
                  </li>
                  <li>Gym Manager will launch in its own native desktop window.</li>
                </ol>
              )}
            </div>
          </>
        )}

        <div className="dialog-actions">
          <button type="button" className="btn full secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
