import { useState } from 'react'
import GymLogo from './GymLogo'
import { getDeviceInfo } from '../lib/deviceDetect'

export default function DownloadAppModal({ isOpen, onClose, deferredPrompt, onInstalled }) {
  const [installing, setInstalling] = useState(false)
  const deviceInfo = getDeviceInfo()

  // Allow tab switching between iOS, Android, and Desktop
  const [selectedPlatform, setSelectedPlatform] = useState(() => {
    if (deviceInfo.isIOS) return 'ios'
    if (deviceInfo.isAndroid) return 'android'
    return 'desktop'
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
      <div className="dialog" style={{ maxWidth: '460px', padding: '22px' }}>
        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'inline-block', marginBottom: '6px' }}>
            <GymLogo size={48} />
          </div>
          <h3 style={{ margin: '2px 0 4px', fontSize: '18px' }}>
            {selectedPlatform === 'ios'
              ? 'Install Gym Manager on iPhone / iPad'
              : selectedPlatform === 'android'
              ? 'Download Gym Manager App / APK'
              : 'Install Gym Manager App'}
          </h3>
          <p className="small muted" style={{ margin: 0, fontSize: '13px' }}>
            {selectedPlatform === 'ios'
              ? 'iPhone par 1-tap me install karein — Bina App Store ke full-screen native app ki tarah chalegi!'
              : 'Apne mobile par 1-tap me install karein for fast, full-screen offline-ready access.'}
          </p>
        </div>

        {/* Platform Switcher Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '6px',
            marginBottom: '14px',
            background: 'var(--bg-subtle, rgba(0,0,0,0.05))',
            padding: '4px',
            borderRadius: '10px',
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedPlatform('ios')}
            style={{
              padding: '8px 4px',
              border: 'none',
              borderRadius: '7px',
              fontSize: '12.5px',
              fontWeight: selectedPlatform === 'ios' ? 700 : 500,
              background: selectedPlatform === 'ios' ? 'var(--card)' : 'transparent',
              color: selectedPlatform === 'ios' ? 'var(--accent, #35B982)' : 'var(--muted)',
              cursor: 'pointer',
              boxShadow: selectedPlatform === 'ios' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            🍎 iPhone / iOS
          </button>
          <button
            type="button"
            onClick={() => setSelectedPlatform('android')}
            style={{
              padding: '8px 4px',
              border: 'none',
              borderRadius: '7px',
              fontSize: '12.5px',
              fontWeight: selectedPlatform === 'android' ? 700 : 500,
              background: selectedPlatform === 'android' ? 'var(--card)' : 'transparent',
              color: selectedPlatform === 'android' ? 'var(--accent, #35B982)' : 'var(--muted)',
              cursor: 'pointer',
              boxShadow: selectedPlatform === 'android' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            🤖 Android
          </button>
          <button
            type="button"
            onClick={() => setSelectedPlatform('desktop')}
            style={{
              padding: '8px 4px',
              border: 'none',
              borderRadius: '7px',
              fontSize: '12.5px',
              fontWeight: selectedPlatform === 'desktop' ? 700 : 500,
              background: selectedPlatform === 'desktop' ? 'var(--card)' : 'transparent',
              color: selectedPlatform === 'desktop' ? 'var(--accent, #35B982)' : 'var(--muted)',
              cursor: 'pointer',
              boxShadow: selectedPlatform === 'desktop' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            💻 PC / Mac
          </button>
        </div>

        {deviceInfo.isStandalone ? (
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
              ✓ App Already Installed!
            </b>
            <span className="small muted">
              Aap already Gym Manager ko standalone native app mode me use kar rahe hain.
            </span>
          </div>
        ) : (
          <>
            {/* Direct 1-click install button for Android/Desktop if browser prompt is available */}
            {deferredPrompt && selectedPlatform !== 'ios' && (
              <div style={{ marginBottom: '14px' }}>
                <button
                  type="button"
                  className="btn accent full"
                  style={{ padding: '12px', fontSize: '15px', fontWeight: 700 }}
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
                  <span>{installing ? 'Installing...' : '1-Tap Direct Install Now'}</span>
                </button>
              </div>
            )}

            {/* Platform-specific instructions */}
            <div
              style={{
                background: 'var(--card-subtle)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '14px',
              }}
            >
              {selectedPlatform === 'ios' ? (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '10px',
                      color: 'var(--accent, #35B982)',
                      fontWeight: 700,
                      fontSize: '13.5px',
                    }}
                  >
                    <span>🍏 iPhone / iPad (iOS Safari) Installation Guide:</span>
                  </div>

                  <ol
                    style={{
                      margin: 0,
                      paddingLeft: '22px',
                      fontSize: '13px',
                      lineHeight: '1.65',
                      color: 'var(--text)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <li>
                      Is link ko iPhone ke <b>Safari</b> browser me open karein.
                      <span className="muted small" style={{ display: 'block', fontSize: '11.5px' }}>
                        (Agar WhatsApp ya Instagram me open hua hai, toh bottom me Safari icon daba kar Safari me kholein)
                      </span>
                    </li>
                    <li>
                      Safari ke bottom bar me <b>Share button</b>{' '}
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: 'rgba(53, 185, 130, 0.15)',
                          fontWeight: 700,
                          fontSize: '14px',
                        }}
                      >
                        📤 (Square with Arrow)
                      </span>{' '}
                      par tap karein.
                    </li>
                    <li>
                      Options ko scroll karein aur{' '}
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: 'rgba(53, 185, 130, 0.15)',
                          fontWeight: 700,
                        }}
                      >
                        ➕ Add to Home Screen (होम स्क्रीन पर जोड़ें)
                      </span>{' '}
                      chunein.
                    </li>
                    <li>
                      Top-right corner me <b>&ldquo;Add&rdquo;</b> par tap karein.
                    </li>
                  </ol>

                  <div
                    style={{
                      marginTop: '12px',
                      padding: '10px',
                      borderRadius: '8px',
                      background: 'rgba(53, 185, 130, 0.08)',
                      border: '1px solid rgba(53, 185, 130, 0.2)',
                      fontSize: '12px',
                      color: 'var(--text)',
                      lineHeight: '1.45',
                    }}
                  >
                    ✨ <b>iPhone Full-Screen App:</b> Home screen par Gym Manager ka icon ban jayega. Tap karne par Safari ka URL bar gayab ho jayega aur bilkul native iPhone app ki tarah open hoga!
                  </div>
                </div>
              ) : selectedPlatform === 'android' ? (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '10px',
                      color: 'var(--accent, #35B982)',
                      fontWeight: 700,
                      fontSize: '13.5px',
                    }}
                  >
                    <span>🤖 Android Phone Installation:</span>
                  </div>

                  <ol
                    style={{
                      margin: 0,
                      paddingLeft: '22px',
                      fontSize: '13px',
                      lineHeight: '1.65',
                      color: 'var(--text)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <li>
                      Chrome browser ke top-right corner me <b>3 dots (⋮)</b> par tap karein.
                    </li>
                    <li>
                      Menu me se <b>&ldquo;Install app&rdquo;</b> ya <b>&ldquo;Add to Home screen&rdquo;</b> chunein.
                    </li>
                    <li>
                      <b>&ldquo;Install&rdquo;</b> button dabayein — App aapke phone ki app drawer aur home screen me download ho jayegi.
                    </li>
                  </ol>
                </div>
              ) : (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '10px',
                      color: 'var(--accent, #35B982)',
                      fontWeight: 700,
                      fontSize: '13.5px',
                    }}
                  >
                    <span>💻 PC / Mac Desktop Installation:</span>
                  </div>

                  <ol
                    style={{
                      margin: 0,
                      paddingLeft: '22px',
                      fontSize: '13px',
                      lineHeight: '1.65',
                      color: 'var(--text)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <li>
                      Chrome / Edge ke address bar ke right side me <b>Install icon</b> par click karein.
                    </li>
                    <li>
                      <b>&ldquo;Install Gym Manager&rdquo;</b> confirmation par click karein.
                    </li>
                    <li>Gym Manager desktop native window me launch ho jayega.</li>
                  </ol>
                </div>
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
