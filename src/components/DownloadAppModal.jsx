import { useState, useEffect, useRef, useCallback } from 'react'
import GymLogo from './GymLogo'
import { getDeviceInfo } from '../lib/deviceDetect'
import { useLanguage } from '../lib/language'

const MODAL_CONTENT = {
  en: {
    title: 'Install Gym Manager App',
    subtitle: 'Install on your device in 1 tap for fast, full-screen offline access.',
    close: 'Close',
    closeAria: 'Close modal',
    followBelow: '👇 Follow Steps Below',
    tabs: {
      ios: 'iPhone / iOS',
      android: 'Android',
      desktop: 'PC / Mac',
    },
    action: {
      installNow: 'Install Now',
      installed: '✓ App Successfully Installed!',
      installing: 'Installing...',
      unavailable: 'Install Unavailable',
    },
    ios: {
      buttonSub: 'Follow the 2 simple steps below using Safari\'s Share (📤) button.',
      inAppWarningTitle: 'Open in Safari:',
      inAppWarningText: 'Tap the Share icon or menu and choose "Open in Safari" to install.',
      stepsTitle: 'How to Install via Safari:',
      step1: 'Open this page in the Safari browser.',
      step1Sub: 'If viewing inside WhatsApp or Instagram, tap 3 dots or Share and choose "Open in Safari".',
      step2: 'Tap the Share button (square with arrow) in Safari\'s bottom toolbar.',
      step3: 'Scroll down and select "Add to Home Screen".',
      step4: 'Tap "Add" in the top-right corner.',
      infoTitle: 'Full-Screen App:',
      infoText: 'Runs in full screen without the browser address bar, loading instantly like a native app.',
    },
    android: {
      buttonSubAvailable: 'Click to install directly using the browser prompt.',
      buttonSubUnavailable: 'Open in Chrome or the app is already installed.',
      inAppWarningTitle: 'Open in Chrome:',
      inAppWarningText: 'Tap 3 dots (⋮) and choose "Open in Chrome" or "Open in browser".',
      stepsTitle: 'How to Install via Chrome:',
      step1: 'Tap the 3 dots (⋮) in the top-right corner of Chrome.',
      step2: 'Select "Install app" or "Add to Home screen" from the menu.',
      step3: 'Tap "Install" — Gym Manager will be added to your home screen.',
      infoTitle: 'Full-Screen App:',
      infoText: 'Opens without the browser address bar, loads instantly, and works smoothly offline.',
      note: 'Note: Menu labels may vary slightly on Samsung Internet or Firefox.',
    },
    desktop: {
      buttonSub: 'Install desktop app from the browser address bar or menu.',
      stepsTitle: 'Desktop Installation:',
      step1: 'Click the Install icon on the right side of the Chrome or Edge address bar.',
      step2: 'Click "Install" when the confirmation dialog appears.',
      step3Mac: 'For Safari on Mac:',
      step3MacText: 'Choose File → Add to Dock from the top menu bar.',
      infoTitle: 'Desktop Window:',
      infoText: 'Opens in a clean desktop application window with no browser tabs or URL bar.',
      alertHelp: 'Click the Install icon on the right side of your Chrome or Edge address bar.',
    },
  },
  hinglish: {
    title: 'Install Gym Manager App',
    subtitle: 'Apne phone par 1-tap mein install karein. Fast, full-screen aur offline-ready.',
    close: 'Close',
    closeAria: 'Modal band karein',
    followBelow: '👇 Niche Follow Karein',
    tabs: {
      ios: 'iPhone / iOS',
      android: 'Android',
      desktop: 'PC / Mac',
    },
    action: {
      installNow: 'Install Now',
      installed: '✓ App Successfully Installed!',
      installing: 'Installing...',
      unavailable: 'Install Unavailable',
    },
    ios: {
      buttonSub: 'Niche Safari Share (📤) button se 2-step mein install karein.',
      inAppWarningTitle: 'Safari mein kholein:',
      inAppWarningText: 'Niche Share icon ya 3 dots daba kar "Open in Safari" chunein.',
      stepsTitle: 'Safari Se Install Karne Ka Tarika:',
      step1: 'Is page ko Safari browser mein kholein.',
      step1Sub: 'Agar WhatsApp ya Instagram ke andar hain to 3 dots ya Share → "Open in Safari" chunein.',
      step2: 'Safari ke bottom toolbar mein Share button (square with arrow) par tap karein.',
      step3: 'Options ko scroll karein aur "Add to Home Screen" chunein.',
      step4: 'Top-right corner mein "Add" par tap karein.',
      infoTitle: 'Full-Screen App:',
      infoText: 'Install hone ke baad app bina browser bar ke bilkul native app ki tarah full-screen aur fast chalegi.',
    },
    android: {
      buttonSubAvailable: 'Browser prompt ke zariye direct install karein.',
      buttonSubUnavailable: 'Chrome mein kholein ya app pehle se installed hai.',
      inAppWarningTitle: 'Chrome mein kholein:',
      inAppWarningText: 'Upar 3 dots (⋮) par tap karein aur "Open in Chrome" chunein.',
      stepsTitle: 'Chrome Se Install Karne Ka Tarika:',
      step1: 'Chrome browser ke top-right corner mein 3 dots (⋮) par tap karein.',
      step2: 'Menu mein se "Install app" ya "Add to Home screen" chunein.',
      step3: '"Install" button dabayein — App aapke phone ki home screen par install ho jayegi.',
      infoTitle: 'Full-Screen App:',
      infoText: 'Install hone ke baad app bina browser bar ke instant load hogi aur offline bhi chalegi.',
      note: 'Note: Samsung Internet ya Firefox mein menu thoda alag ho sakta hai.',
    },
    desktop: {
      buttonSub: 'Browser address bar ya menu se desktop app install karein.',
      stepsTitle: 'Desktop Par Install Karne Ka Tarika:',
      step1: 'Chrome ya Edge browser ke address bar ke right side mein Install icon par click karein.',
      step2: 'Popup confirmation aane par "Install" par click karein.',
      step3Mac: 'Safari (Mac) ke liye:',
      step3MacText: 'Top menu se File → Add to Dock chunein.',
      infoTitle: 'Desktop Window:',
      infoText: 'Install hone ke baad Gym Manager address bar bina clean desktop application ki tarah open hoga.',
      alertHelp: 'Chrome ya Edge address bar ke right side mein Install icon par click karein.',
    },
  },
  hi: {
    title: 'Gym Manager ऐप इंस्टॉल करें',
    subtitle: 'तेज़, फुल-स्क्रीन और ऑफलाइन इस्तेमाल के लिए 1-टैप में इंस्टॉल करें।',
    close: 'बंद करें',
    closeAria: 'मोडल बंद करें',
    followBelow: '👇 नीचे दिए गए चरण देखें',
    tabs: {
      ios: 'iPhone / iOS',
      android: 'Android',
      desktop: 'PC / Mac',
    },
    action: {
      installNow: 'अभी इंस्टॉल करें',
      installed: '✓ ऐप सफलतापूर्वक इंस्टॉल हो गया!',
      installing: 'इंस्टॉल हो रहा है...',
      unavailable: 'इंस्टॉल अनुपलब्ध',
    },
    ios: {
      buttonSub: 'सफारी के शेयर (📤) बटन से नीचे 2 आसान चरणों में इंस्टॉल करें।',
      inAppWarningTitle: 'Safari में खोलें:',
      inAppWarningText: 'शेयर या 3 डॉट्स मेनू दबाकर "Open in Safari" चुनें ताकि ऐप इंस्टॉल हो सके।',
      stepsTitle: 'Safari से इंस्टॉल करने का तरीका:',
      step1: 'इस पेज को Safari ब्राउज़र में खोलें।',
      step1Sub: 'यदि आप WhatsApp या Instagram में हैं तो Share मेनू से "Open in Safari" चुनें।',
      step2: 'Safari के नीचे टूलबार में Share बटन (तीर वाला चौकोर आइकन) पर टैप करें।',
      step3: 'विकल्पों को नीचे स्क्रॉल करें और "Add to Home Screen" चुनें।',
      step4: 'ऊपर दाईं ओर "Add" पर टैप करें।',
      infoTitle: 'फुल-स्क्रीन ऐप:',
      infoText: 'होम स्क्रीन पर ऐप जुड़ने के बाद यह बिना ब्राउज़र बार के असली ऐप की तरह तेज़ चलेगा।',
    },
    android: {
      buttonSubAvailable: 'ब्राउज़र प्रॉम्प्ट के ज़रिए सीधे इंस्टॉल करें।',
      buttonSubUnavailable: 'Chrome में खोलें या ऐप पहले से इंस्टॉल है।',
      inAppWarningTitle: 'Chrome में खोलें:',
      inAppWarningText: 'ऊपर 3 डॉट्स (⋮) पर टैप करें और "Open in Chrome" चुनें।',
      stepsTitle: 'Chrome से इंस्टॉल करने का तरीका:',
      step1: 'Chrome ब्राउज़र के ऊपर दाईं ओर 3 डॉट्स (⋮) पर टैप करें।',
      step2: 'मेनू में से "Install app" या "Add to Home screen" चुनें।',
      step3: '"Install" बटन दबाएं — ऐप आपकी होम स्क्रीन पर इंस्टॉल हो जाएगी।',
      infoTitle: 'फुल-स्क्रीन ऐप:',
      infoText: 'ब्राउज़र बार के बिना खुलता है, तुरंत लोड होता है और ऑफलाइन भी काम करता है।',
      note: 'नोट: Samsung Internet या Firefox में मेनू नाम थोड़ा अलग हो सकता है।',
    },
    desktop: {
      buttonSub: 'ब्राउज़र एड्रेस बार या मेनू से डेस्कटॉप ऐप इंस्टॉल करें।',
      stepsTitle: 'डेस्कटॉप पर इंस्टॉल करने का तरीका:',
      step1: 'Chrome या Edge एड्रेस बार के दाईं ओर Install आइकन पर क्लिक करें।',
      step2: 'कन्फर्मेशन आने पर "Install" पर क्लिक करें।',
      step3Mac: 'Mac पर Safari के लिए:',
      step3MacText: 'ऊपर मेनू से File → Add to Dock चुनें।',
      infoTitle: 'डेस्कटॉप विंडो:',
      infoText: 'Gym Manager बिना ब्राउज़र टैब या URL बार के एक स्वतंत्र विंडो में खुलेगा।',
      alertHelp: 'Chrome या Edge एड्रेस bar के दाईं ओर Install आइकन पर क्लिक करें।',
    },
  },
}

export default function DownloadAppModal({ isOpen, onClose, deferredPrompt, onInstalled }) {
  const deviceInfo = getDeviceInfo()
  const [installing, setInstalling] = useState(false)
  const [localPrompt, setLocalPrompt] = useState(deferredPrompt)
  const [installedSuccess, setInstalledSuccess] = useState(false)
  const [iosGuidanceActive, setIosGuidanceActive] = useState(false)

  // Determine current active language
  let activeLang = 'en'
  try {
    const langContext = useLanguage()
    if (langContext?.currentLanguage) {
      activeLang = langContext.currentLanguage
    }
  } catch {
    activeLang = 'en'
  }

  // Fallback to English if chosen language is not 'hi' or 'hinglish' (Google Translate handles English)
  const content = MODAL_CONTENT[activeLang] || MODAL_CONTENT.en

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

  // Handle native Android / Desktop installation
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
        background: 'rgba(10, 18, 14, 0.78)',
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
            aria-label={content.closeAria}
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Centered App Logo */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #145C43 0%, #0B3728 100%)',
              boxShadow: '0 8px 20px rgba(20, 92, 67, 0.28)',
              marginBottom: '10px',
            }}
          >
            <GymLogo size={42} />
          </div>

          <h2
            id="gmModalTitle"
            style={{
              fontSize: '20px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--text, #142019)',
              margin: '2px 0 4px',
            }}
          >
            {content.title}
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
            {content.subtitle}
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
              <span>{content.tabs.ios}</span>
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
                <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8.1 12 8.1s-3.5902.3116-5.1367.8497L4.841 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" />
              </svg>
              <span>{content.tabs.android}</span>
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
              {/* Desktop Monitor SVG */}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <span>{content.tabs.desktop}</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content Area */}
        <div
          className="gm-modal-scroll"
          style={{
            padding: '4px 22px 18px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* ================================================================
              PANEL 1: IPHONE / IOS TAB
              ================================================================ */}
          {selectedPlatform === 'ios' && (
            <div id="panel-ios" role="tabpanel" aria-labelledby="tab-btn-ios" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* In-App Browser Warning Banner (WhatsApp, Instagram, FB) */}
              {deviceInfo.isInAppBrowser && (
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
                    <strong>{content.ios.inAppWarningTitle}</strong> {content.ios.inAppWarningText}
                  </div>
                </div>
              )}

              {/* iOS Install Now Action Button */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIosGuidanceActive(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '13px 18px',
                    background: 'var(--primary, #145C43)',
                    color: '#FFFFFF',
                    border: '1px solid var(--primary, #145C43)',
                    borderRadius: '14px',
                    fontFamily: 'inherit',
                    fontSize: '14.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(20, 92, 67, 0.22)',
                    transition: 'all 0.18s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--primary-hover, #0F4935)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--primary, #145C43)'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>{content.action.installNow}</span>
                </button>

                <span style={{ fontSize: '11.5px', textAlign: 'center', color: 'var(--muted, #5B6A61)', lineHeight: 1.4 }}>
                  {content.ios.buttonSub}
                </span>
              </div>

              {/* Step by Step Card with Number Badges */}
              <div
                style={{
                  background: 'var(--bg-subtle, #F8FAF8)',
                  border: iosGuidanceActive ? '1.5px solid var(--accent, #35B982)' : '1px solid var(--border, #E5EBE6)',
                  borderRadius: '14px',
                  padding: '14px',
                  boxShadow: iosGuidanceActive ? '0 0 0 3px rgba(53, 185, 130, 0.2)' : 'none',
                  transition: 'all 0.2s ease',
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
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{content.ios.stepsTitle}</span>
                  {iosGuidanceActive && (
                    <span style={{ fontSize: '11px', color: 'var(--accent, #35B982)', fontWeight: 700 }}>
                      {content.followBelow}
                    </span>
                  )}
                </div>

                <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '11px' }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '11px', fontSize: '13px', lineHeight: 1.5 }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '99px', background: 'var(--primary, #145C43)', color: '#FFFFFF', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>1</span>
                    <div style={{ flex: 1 }}>
                      {content.ios.step1}
                      <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--muted, #5B6A61)', marginTop: '2px' }}>
                        {content.ios.step1Sub}
                      </span>
                    </div>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '11px', fontSize: '13px', lineHeight: 1.5 }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '99px', background: 'var(--primary, #145C43)', color: '#FFFFFF', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>2</span>
                    <div style={{ flex: 1 }}>
                      {content.ios.step2}
                    </div>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '11px', fontSize: '13px', lineHeight: 1.5 }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '99px', background: 'var(--primary, #145C43)', color: '#FFFFFF', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>3</span>
                    <div style={{ flex: 1 }}>
                      {content.ios.step3}
                    </div>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '11px', fontSize: '13px', lineHeight: 1.5 }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '99px', background: 'var(--primary, #145C43)', color: '#FFFFFF', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>4</span>
                    <div style={{ flex: 1 }}>
                      {content.ios.step4}
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
                  <strong>{content.ios.infoTitle}</strong> {content.ios.infoText}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              PANEL 2: ANDROID TAB
              ================================================================ */}
          {selectedPlatform === 'android' && (
            <div id="panel-android" role="tabpanel" aria-labelledby="tab-btn-android" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* In-App Browser Warning Banner (WhatsApp, Instagram, FB) */}
              {deviceInfo.isInAppBrowser && (
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
                    <strong>{content.android.inAppWarningTitle}</strong> {content.android.inAppWarningText}
                  </div>
                </div>
              )}

              {/* Install Now Action Button (Android) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleNativeInstall}
                  disabled={!isPromptAvailable || installing}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '13px 18px',
                    background: installedSuccess
                      ? 'var(--accent, #35B982)'
                      : isPromptAvailable
                      ? 'var(--primary, #145C43)'
                      : 'var(--bg-subtle, #EAEFEA)',
                    color: isPromptAvailable || installedSuccess ? '#FFFFFF' : 'var(--muted, #7A8981)',
                    border: '1px solid transparent',
                    borderColor: isPromptAvailable ? 'var(--primary, #145C43)' : 'var(--border, #D5DDD7)',
                    borderRadius: '14px',
                    fontFamily: 'inherit',
                    fontSize: '14.5px',
                    fontWeight: 700,
                    cursor: isPromptAvailable ? 'pointer' : 'not-allowed',
                    boxShadow: isPromptAvailable ? '0 4px 12px rgba(20, 92, 67, 0.22)' : 'none',
                    transition: 'all 0.18s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (isPromptAvailable && !installedSuccess) {
                      e.currentTarget.style.background = 'var(--primary-hover, #0F4935)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isPromptAvailable && !installedSuccess) {
                      e.currentTarget.style.background = 'var(--primary, #145C43)'
                    }
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>
                    {installedSuccess
                      ? content.action.installed
                      : installing
                      ? content.action.installing
                      : isPromptAvailable
                      ? content.action.installNow
                      : content.action.unavailable}
                  </span>
                </button>

                <span style={{ fontSize: '11.5px', textAlign: 'center', color: 'var(--muted, #5B6A61)', lineHeight: 1.4 }}>
                  {isPromptAvailable
                    ? content.android.buttonSubAvailable
                    : content.android.buttonSubUnavailable}
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
                  <span>{content.android.stepsTitle}</span>
                </div>

                <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '11px' }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '11px', fontSize: '13px', lineHeight: 1.5 }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '99px', background: 'var(--primary, #145C43)', color: '#FFFFFF', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>1</span>
                    <div style={{ flex: 1 }}>
                      {content.android.step1}
                    </div>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '11px', fontSize: '13px', lineHeight: 1.5 }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '99px', background: 'var(--primary, #145C43)', color: '#FFFFFF', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>2</span>
                    <div style={{ flex: 1 }}>
                      {content.android.step2}
                    </div>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '11px', fontSize: '13px', lineHeight: 1.5 }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '99px', background: 'var(--primary, #145C43)', color: '#FFFFFF', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>3</span>
                    <div style={{ flex: 1 }}>
                      {content.android.step3}
                    </div>
                  </li>
                </ol>
              </div>

              {/* Note about other browsers */}
              <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--muted, #5B6A61)', padding: '0 4px', lineHeight: 1.4 }}>
                {content.android.note}
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
                  <strong>{content.android.infoTitle}</strong> {content.android.infoText}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              PANEL 3: PC / MAC TAB
              ================================================================ */}
          {selectedPlatform === 'desktop' && (
            <div id="panel-desktop" role="tabpanel" aria-labelledby="tab-btn-desktop" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Install Now Action Button (PC / Mac) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  type="button"
                  onClick={isPromptAvailable ? handleNativeInstall : () => alert(content.desktop.alertHelp)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '13px 18px',
                    background: 'var(--primary, #145C43)',
                    color: '#FFFFFF',
                    border: '1px solid var(--primary, #145C43)',
                    borderRadius: '14px',
                    fontFamily: 'inherit',
                    fontSize: '14.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(20, 92, 67, 0.22)',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>{content.action.installNow}</span>
                </button>

                <span style={{ fontSize: '11.5px', textAlign: 'center', color: 'var(--muted, #5B6A61)', lineHeight: 1.4 }}>
                  {content.desktop.buttonSub}
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
                  <span>{content.desktop.stepsTitle}</span>
                </div>

                <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '11px' }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '11px', fontSize: '13px', lineHeight: 1.5 }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '99px', background: 'var(--primary, #145C43)', color: '#FFFFFF', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>1</span>
                    <div style={{ flex: 1 }}>
                      {content.desktop.step1}
                    </div>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '11px', fontSize: '13px', lineHeight: 1.5 }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '99px', background: 'var(--primary, #145C43)', color: '#FFFFFF', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>2</span>
                    <div style={{ flex: 1 }}>
                      {content.desktop.step2}
                    </div>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '11px', fontSize: '13px', lineHeight: 1.5 }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '99px', background: 'var(--primary, #145C43)', color: '#FFFFFF', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>3</span>
                    <div style={{ flex: 1 }}>
                      <strong>{content.desktop.step3Mac}</strong> {content.desktop.step3MacText}
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
                  <strong>{content.desktop.infoTitle}</strong> {content.desktop.infoText}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with High-Contrast Close Button */}
        <div
          style={{
            padding: '12px 22px 18px',
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
              padding: '12px',
              borderRadius: '12px',
              border: '1.5px solid var(--border, #D5DDD7)',
              background: 'var(--bg-subtle, #F8FAF8)',
              color: 'var(--text, #142019)',
              fontSize: '14px',
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--border, #E5EBE6)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-subtle, #F8FAF8)'
            }}
          >
            {content.close}
          </button>
        </div>
      </div>
    </div>
  )
}
