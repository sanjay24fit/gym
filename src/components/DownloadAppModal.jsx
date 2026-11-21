import { useState, useEffect, useRef, useCallback } from 'react'
import GymLogo from './GymLogo'
import { getDeviceInfo } from '../lib/deviceDetect'

export default function DownloadAppModal({ isOpen, onClose, deferredPrompt, onInstalled }) {
  const deviceInfo = getDeviceInfo()
  const [installing, setInstalling] = useState(false)
  const [localPrompt, setLocalPrompt] = useState(deferredPrompt)
  const [installedSuccess, setInstalledSuccess] = useState(false)

  // Track active tab: 'ios' | 'android' | 'desktop'
  const [selectedPlatform, setSelectedPlatform] = useState(() => {
    if (deviceInfo.isIOS) return 'ios'
    if (deviceInfo.isAndroid) return 'android'
    return 'desktop'
  })

  const modalRef = useRef(null)
  const previousFocusRef = useRef(null)
  const tabRefs = useRef({})

  // Sync external deferredPrompt
  useEffect(() => {
    if (deferredPrompt) setLocalPrompt(deferredPrompt)
  }, [deferredPrompt])

  // Listen for beforeinstallprompt and appinstalled events
  useEffect(() => {
    const handlePrompt = (e) => {
      e.preventDefault()
      setLocalPrompt(e)
    }

    const handleAppInstalled = () => {
      setLocalPrompt(null)
      setInstalledSuccess(true)
      if (onInstalled) onInstalled()
      setTimeout(() => {
        onClose()
      }, 1400)
    }

    window.addEventListener('beforeinstallprompt', handlePrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [onInstalled, onClose])

  // Lock body scroll and handle focus trap when modal is open
  useEffect(() => {
    if (!isOpen) return

    previousFocusRef.current = document.activeElement
    const originalOverflow = document.body.style.overflow
    const originalPaddingRight = document.body.style.paddingRight

    // Lock body scrolling
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    // Set initial focus to active tab button
    setTimeout(() => {
      if (tabRefs.current[selectedPlatform]) {
        tabRefs.current[selectedPlatform].focus()
      }
    }, 50)

    // Handle Escape key and Tab focus trap
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = originalPaddingRight
      window.removeEventListener('keydown', handleKeyDown)
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus()
      }
    }
  }, [isOpen, onClose, selectedPlatform])

  // Handle native 1-Tap installation
  const handleNativeInstall = async () => {
    const promptToUse = localPrompt || deferredPrompt
    if (!promptToUse) return

    setInstalling(true)
    try {
      await promptToUse.prompt()
      const { outcome } = await promptToUse.userChoice
      if (outcome === 'accepted') {
        setLocalPrompt(null)
        setInstalledSuccess(true)
        if (onInstalled) onInstalled()
        setTimeout(() => {
          onClose()
        }, 1200)
      }
    } catch (err) {
      console.warn('Install prompt error:', err)
    } finally {
      setInstalling(false)
    }
  }

  // Keyboard navigation for tabs (ArrowLeft, ArrowRight, Home, End)
  const handleTabKeyDown = useCallback((e, currentPlatform) => {
    const platforms = ['ios', 'android', 'desktop']
    const currentIndex = platforms.indexOf(currentPlatform)
    let nextIndex = null

    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % platforms.length
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + platforms.length) % platforms.length
    } else if (e.key === 'Home') {
      nextIndex = 0
    } else if (e.key === 'End') {
      nextIndex = platforms.length - 1
    }

    if (nextIndex !== null) {
      e.preventDefault()
      const nextPlatform = platforms[nextIndex]
      setSelectedPlatform(nextPlatform)
      if (tabRefs.current[nextPlatform]) {
        tabRefs.current[nextPlatform].focus()
      }
    }
  }, [])

  if (!isOpen) return null

  // Check if prompt is available on Android / Desktop
  const isPromptAvailable = Boolean(localPrompt || deferredPrompt)

  return (
    <div
      className="gm-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gmModalTitle"
      aria-describedby="gmModalDesc"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(10, 18, 14, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.18s ease-out',
      }}
    >
      <div
        ref={modalRef}
        className="gm-modal-container"
        style={{
          width: '100%',
          maxWidth: '480px',
          minHeight: '580px',
          maxHeight: 'calc(100vh - 32px)',
          maxHeight: 'calc(100dvh - 32px)',
          background: 'var(--card, #FFFFFF)',
          color: 'var(--text, #142019)',
          borderRadius: '24px',
          boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.45), 0 0 0 1px var(--border, rgba(20, 92, 67, 0.12))',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
          animation: 'modalPopIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '24px 22px 14px',
            textAlign: 'center',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          {/* Top-Right Close 'X' Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Modal band karein"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '34px',
              height: '34px',
              borderRadius: '99px',
              border: '1px solid var(--border, #E5EBE6)',
              background: 'var(--bg-subtle, #F8FAF8)',
              color: 'var(--muted, #5B6A61)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--primary, #145C43)'
              e.currentTarget.style.color = '#FFFFFF'
              e.currentTarget.style.borderColor = 'var(--primary, #145C43)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-subtle, #F8FAF8)'
              e.currentTarget.style.color = 'var(--muted, #5B6A61)'
              e.currentTarget.style.borderColor = 'var(--border, #E5EBE6)'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Logo Badge */}
          <div style={{ display: 'inline-flex', marginBottom: '8px' }}>
            <GymLogo size={48} />
          </div>

          <h2
            id="gmModalTitle"
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '20px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--text, #142019)',
              margin: '2px 0 4px',
            }}
          >
            Install Gym Manager App
          </h2>
          <p
            id="gmModalDesc"
            style={{
              fontSize: '13px',
              lineHeight: 1.45,
              color: 'var(--muted, #5B6A61)',
              maxWidth: '360px',
              margin: '0 auto',
            }}
          >
            Apne phone par 1-tap mein install karein. Fast, full-screen aur offline-ready.
          </p>
        </div>

        {/* Tab Navigation (Clean SVG Icons + ARIA Tabs) */}
        <div style={{ padding: '0 20px 14px', flexShrink: 0 }}>
          <div
            role="tablist"
            aria-label="Device selection"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '6px',
              background: 'var(--bg-subtle, #F8FAF8)',
              padding: '5px',
              borderRadius: '14px',
              border: '1px solid var(--border, #E5EBE6)',
            }}
          >
            {/* Tab: iPhone / iOS */}
            <button
              type="button"
              role="tab"
              id="tab-btn-ios"
              ref={(el) => (tabRefs.current.ios = el)}
              aria-selected={selectedPlatform === 'ios'}
              aria-controls="panel-ios"
              tabIndex={selectedPlatform === 'ios' ? 0 : -1}
              onClick={() => setSelectedPlatform('ios')}
              onKeyDown={(e) => handleTabKeyDown(e, 'ios')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '9px 6px',
                border: selectedPlatform === 'ios' ? '1px solid var(--border, rgba(20, 92, 67, 0.2))' : '1px solid transparent',
                borderRadius: '10px',
                background: selectedPlatform === 'ios' ? 'var(--card, #FFFFFF)' : 'transparent',
                color: selectedPlatform === 'ios' ? 'var(--primary, #145C43)' : 'var(--muted, #5B6A61)',
                fontFamily: 'inherit',
                fontSize: '12.5px',
                fontWeight: selectedPlatform === 'ios' ? 700 : 600,
                cursor: 'pointer',
                boxShadow: selectedPlatform === 'ios' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Apple SVG */}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.84c.64-.78 1.08-1.87.96-2.96-.93.04-2.05.62-2.71 1.4-.58.67-1.09 1.76-.95 2.83 1.04.08 2.06-.51 2.7-1.27z" />
              </svg>
              <span>iPhone / iOS</span>
            </button>

            {/* Tab: Android */}
            <button
              type="button"
              role="tab"
              id="tab-btn-android"
              ref={(el) => (tabRefs.current.android = el)}
              aria-selected={selectedPlatform === 'android'}
              aria-controls="panel-android"
              tabIndex={selectedPlatform === 'android' ? 0 : -1}
              onClick={() => setSelectedPlatform('android')}
              onKeyDown={(e) => handleTabKeyDown(e, 'android')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '9px 6px',
                border: selectedPlatform === 'android' ? '1px solid var(--border, rgba(20, 92, 67, 0.2))' : '1px solid transparent',
                borderRadius: '10px',
                background: selectedPlatform === 'android' ? 'var(--card, #FFFFFF)' : 'transparent',
                color: selectedPlatform === 'android' ? 'var(--primary, #145C43)' : 'var(--muted, #5B6A61)',
                fontFamily: 'inherit',
                fontSize: '12.5px',
                fontWeight: selectedPlatform === 'android' ? 700 : 600,
                cursor: 'pointer',
                boxShadow: selectedPlatform === 'android' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Android Robot SVG */}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v6c0 .83.67 1.5 1.5 1.5S5 16.33 5 15.5v-6C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v6c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-6c0-.83-.67-1.5-1.5-1.5zm-4.97-4.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 2.23 12.95 2 12 2c-.96 0-1.86.23-2.66.63L7.85 1.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 4.26 6 5.92 6 7.8h12c0-1.88-.97-3.54-2.47-4.64zM9 6c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm6 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
              </svg>
              <span>Android</span>
            </button>

            {/* Tab: PC / Mac */}
            <button
              type="button"
              role="tab"
              id="tab-btn-desktop"
              ref={(el) => (tabRefs.current.desktop = el)}
              aria-selected={selectedPlatform === 'desktop'}
              aria-controls="panel-desktop"
              tabIndex={selectedPlatform === 'desktop' ? 0 : -1}
              onClick={() => setSelectedPlatform('desktop')}
              onKeyDown={(e) => handleTabKeyDown(e, 'desktop')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '9px 6px',
                border: selectedPlatform === 'desktop' ? '1px solid var(--border, rgba(20, 92, 67, 0.2))' : '1px solid transparent',
                borderRadius: '10px',
                background: selectedPlatform === 'desktop' ? 'var(--card, #FFFFFF)' : 'transparent',
                color: selectedPlatform === 'desktop' ? 'var(--primary, #145C43)' : 'var(--muted, #5B6A61)',
                fontFamily: 'inherit',
                fontSize: '12.5px',
                fontWeight: selectedPlatform === 'desktop' ? 700 : 600,
                cursor: 'pointer',
                boxShadow: selectedPlatform === 'desktop' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Monitor SVG */}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7l-2 3v1h8v-1l-2-3h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 12H3V4h18v10z" />
              </svg>
              <span>PC / Mac</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content Body with Custom Thin Scrollbar */}
        <div
          className="gm-modal-scroll-body"
          style={{
            padding: '0 20px 16px',
            overflowY: 'auto',
            flex: '1 1 auto',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--accent, #35B982) transparent',
          }}
        >
          {/* ================================================================
              PANEL 1: IPHONE / IOS TAB
              ================================================================ */}
          {selectedPlatform === 'ios' && (
            <div id="panel-ios" role="tabpanel" aria-labelledby="tab-btn-ios" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* In-App Browser Warning Banner if detected */}
              {deviceInfo.isInApp && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px 12px',
                    background: 'var(--warning-bg, #FFFBEB)',
                    border: '1px solid var(--warning-border, #FDE68A)',
                    color: 'var(--warning-text, #92400E)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    lineHeight: 1.45,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <div>
                    <strong>Safari mein kholein:</strong> Niche Share icon ya 3 dots par tap karein aur <strong>&ldquo;Open in Safari&rdquo;</strong> chunein taaki app install ho sake.
                  </div>
                </div>
              )}

              {/* Step by Step Card with Green Number Badges */}
              <div
                style={{
                  background: 'var(--bg-subtle, #F8FAF8)',
                  border: '1px solid var(--border, #E5EBE6)',
                  borderRadius: '14px',
                  padding: '14px',
                }}
              >
                <div
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--primary, #145C43)',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>Safari Se Install Karne Ka Tarika:</span>
                </div>

                <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '11px' }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '11px', fontSize: '13px', lineHeight: 1.5 }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '99px', background: 'var(--primary, #145C43)', color: '#FFFFFF', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>1</span>
                    <div style={{ flex: 1 }}>
                      Is page ko <strong>Safari</strong> browser mein kholein.
                      <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--muted, #5B6A61)', marginTop: '2px' }}>
                        Agar WhatsApp ya Instagram ke andar hain to 3 dots ya Share &rarr; &ldquo;Open in Safari&rdquo; chunein.
                      </span>
                    </div>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '11px', fontSize: '13px', lineHeight: 1.5 }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '99px', background: 'var(--primary, #145C43)', color: '#FFFFFF', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>2</span>
                    <div style={{ flex: 1 }}>
                      Safari ke bottom toolbar mein <strong>Share</strong> button (square with arrow) par tap karein.
                    </div>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '11px', fontSize: '13px', lineHeight: 1.5 }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '99px', background: 'var(--primary, #145C43)', color: '#FFFFFF', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>3</span>
                    <div style={{ flex: 1 }}>
                      Options ko scroll karein aur <strong>&ldquo;Add to Home Screen&rdquo;</strong> (होम स्क्रीन पर जोड़ें) chunein.
                    </div>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '11px', fontSize: '13px', lineHeight: 1.5 }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '99px', background: 'var(--primary, #145C43)', color: '#FFFFFF', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>4</span>
                    <div style={{ flex: 1 }}>
                      Top-right corner mein <strong>&ldquo;Add&rdquo;</strong> par tap karein.
                    </div>
                  </li>
                </ol>
              </div>

              {/* Full-Screen Info Card */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '11px 13px',
                  background: 'var(--accent-light, rgba(53, 185, 130, 0.12))',
                  border: '1px solid var(--accent-border, rgba(53, 185, 130, 0.28))',
                  borderRadius: '10px',
                  fontSize: '12px',
                  lineHeight: 1.48,
                  color: 'var(--text, #142019)',
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, color: 'var(--primary, #145C43)', marginTop: '1px' }}>
                  <rect x="5" y="2" width="14" height="20" rx="3" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
                <div>
                  <strong>Full-Screen App:</strong> Install hone ke baad app bina browser bar ke bilkul native app ki tarah full-screen aur fast chalegi.
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              PANEL 2: ANDROID TAB
              ================================================================ */}
          {selectedPlatform === 'android' && (
            <div id="panel-android" role="tabpanel" aria-labelledby="tab-btn-android" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* In-App Browser Warning Banner */}
              {deviceInfo.isInApp && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px 12px',
                    background: 'var(--warning-bg, #FFFBEB)',
                    border: '1px solid var(--warning-border, #FDE68A)',
                    color: 'var(--warning-text, #92400E)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    lineHeight: 1.45,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <div>
                    <strong>Chrome mein kholein:</strong> Upar 3 dots (&#8942;) par tap karein aur <strong>&ldquo;Open in Chrome&rdquo;</strong> ya <strong>&ldquo;Open in browser&rdquo;</strong> chunein.
                  </div>
                </div>
              )}

              {/* 1-Tap Direct Install Action Button */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleNativeInstall}
                  disabled={!isPromptAvailable || installing || installedSuccess}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '13px 18px',
                    background: isPromptAvailable ? 'var(--primary, #145C43)' : 'var(--bg-subtle, #F8FAF8)',
                    color: isPromptAvailable ? '#FFFFFF' : 'var(--muted-light, #7C8B82)',
                    border: isPromptAvailable ? '1px solid var(--primary, #145C43)' : '1px solid var(--border, #E5EBE6)',
                    borderRadius: '14px',
                    fontFamily: 'inherit',
                    fontSize: '14.5px',
                    fontWeight: 700,
                    cursor: isPromptAvailable ? 'pointer' : 'not-allowed',
                    boxShadow: isPromptAvailable ? '0 4px 12px rgba(20, 92, 67, 0.22)' : 'none',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>
                    {installedSuccess
                      ? '✓ App Successfully Installed!'
                      : installing
                      ? 'Installing...'
                      : isPromptAvailable
                      ? '1-Tap Direct Install Now'
                      : '1-Tap Direct Install Unavailable'}
                  </span>
                </button>

                <span style={{ fontSize: '11.5px', textAlign: 'center', color: 'var(--muted, #5B6A61)', lineHeight: 1.4 }}>
                  {isPromptAvailable
                    ? 'Browser prompt ke zariye 1-tap mein direct install karein.'
                    : 'Chrome mein kholein ya app pehle se installed hai.'}
                </span>
              </div>

              {/* Step by Step Card */}
              <div
                style={{
                  background: 'var(--bg-subtle, #F8FAF8)',
                  border: '1px solid var(--border, #E5EBE6)',
                  borderRadius: '14px',
                  padding: '14px',
                }}
              >
                <div
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--primary, #145C43)',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>Chrome Se Install Karne Ka Tarika:</span>
                </div>

                <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '11px' }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '11px', fontSize: '13px', lineHeight: 1.5 }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '99px', background: 'var(--primary, #145C43)', color: '#FFFFFF', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>1</span>
                    <div style={{ flex: 1 }}>
                      Chrome browser ke top-right corner mein <strong>3 dots (&#8942;)</strong> par tap karein.
                    </div>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '11px', fontSize: '13px', lineHeight: 1.5 }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '99px', background: 'var(--primary, #145C43)', color: '#FFFFFF', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>2</span>
                    <div style={{ flex: 1 }}>
                      Menu mein se <strong>&ldquo;Install app&rdquo;</strong> ya <strong>&ldquo;Add to Home screen&rdquo;</strong> chunein.
                    </div>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '11px', fontSize: '13px', lineHeight: 1.5 }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '99px', background: 'var(--primary, #145C43)', color: '#FFFFFF', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>3</span>
                    <div style={{ flex: 1 }}>
                      <strong>&ldquo;Install&rdquo;</strong> button dabayein — App aapke phone ki home screen par install ho jayegi.
                    </div>
                  </li>
                </ol>
              </div>

              {/* Note about other browsers */}
              <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--muted, #5B6A61)', padding: '0 4px', lineHeight: 1.4 }}>
                Note: Samsung Internet, Firefox ya Opera mein menu ka naam thoda alag ho sakta hai.
              </p>

              {/* Full-Screen Info Card */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '11px 13px',
                  background: 'var(--accent-light, rgba(53, 185, 130, 0.12))',
                  border: '1px solid var(--accent-border, rgba(53, 185, 130, 0.28))',
                  borderRadius: '10px',
                  fontSize: '12px',
                  lineHeight: 1.48,
                  color: 'var(--text, #142019)',
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, color: 'var(--primary, #145C43)', marginTop: '1px' }}>
                  <rect x="5" y="2" width="14" height="20" rx="3" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
                <div>
                  <strong>Full-Screen App:</strong> Install hone ke baad app bina browser bar ke bilkul native app ki tarah full-screen aur fast chalegi.
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              PANEL 3: PC / MAC TAB
              ================================================================ */}
          {selectedPlatform === 'desktop' && (
            <div id="panel-desktop" role="tabpanel" aria-labelledby="tab-btn-desktop" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Step by Step Card */}
              <div
                style={{
                  background: 'var(--bg-subtle, #F8FAF8)',
                  border: '1px solid var(--border, #E5EBE6)',
                  borderRadius: '14px',
                  padding: '14px',
                }}
              >
                <div
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--primary, #145C43)',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>Desktop Par Install Karne Ka Tarika:</span>
                </div>

                <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '11px' }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '11px', fontSize: '13px', lineHeight: 1.5 }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '99px', background: 'var(--primary, #145C43)', color: '#FFFFFF', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>1</span>
                    <div style={{ flex: 1 }}>
                      Chrome ya Edge browser ke address bar ke right side mein <strong>Install icon</strong> par click karein (ya menu &rarr; <strong>&ldquo;Install Gym Manager&rdquo;</strong> chunein).
                    </div>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '11px', fontSize: '13px', lineHeight: 1.5 }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '99px', background: 'var(--primary, #145C43)', color: '#FFFFFF', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>2</span>
                    <div style={{ flex: 1 }}>
                      Popup confirmation aane par <strong>&ldquo;Install&rdquo;</strong> button par click karein.
                    </div>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '11px', fontSize: '13px', lineHeight: 1.5 }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '99px', background: 'var(--primary, #145C43)', color: '#FFFFFF', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>3</span>
                    <div style={{ flex: 1 }}>
                      <strong>Safari (Mac) ke liye:</strong> Top menu se File &rarr; <strong>&ldquo;Add to Dock&rdquo;</strong> option chunein.
                    </div>
                  </li>
                </ol>
              </div>

              {/* Full-Screen Info Card */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '11px 13px',
                  background: 'var(--accent-light, rgba(53, 185, 130, 0.12))',
                  border: '1px solid var(--accent-border, rgba(53, 185, 130, 0.28))',
                  borderRadius: '10px',
                  fontSize: '12px',
                  lineHeight: 1.48,
                  color: 'var(--text, #142019)',
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, color: 'var(--primary, #145C43)', marginTop: '1px' }}>
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                <div>
                  <strong>Full-Screen App:</strong> Install hone ke baad Gym Manager aapke computer par ek alag desktop window mein bina browser tabs ke chalegi.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with High-Contrast Close Button */}
        <div
          style={{
            padding: '12px 20px 18px',
            borderTop: '1px solid var(--border, #E5EBE6)',
            background: 'var(--card, #FFFFFF)',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              padding: '11px 16px',
              background: 'var(--bg-subtle, #F8FAF8)',
              color: 'var(--text, #142019)',
              border: '1.5px solid var(--border, #E5EBE6)',
              borderRadius: '14px',
              fontFamily: 'inherit',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(20, 92, 67, 0.08)'
              e.currentTarget.style.borderColor = 'rgba(20, 92, 67, 0.3)'
              e.currentTarget.style.color = 'var(--primary, #145C43)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-subtle, #F8FAF8)'
              e.currentTarget.style.borderColor = 'var(--border, #E5EBE6)'
              e.currentTarget.style.color = 'var(--text, #142019)'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
