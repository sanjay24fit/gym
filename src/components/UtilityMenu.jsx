import { useState, useRef, useEffect } from 'react'
import { useTheme } from '../lib/theme'
import { useLanguage } from '../lib/language'
import { WHATSAPP_SUPPORT_URL, WhatsAppIcon } from './WhatsAppSupport'
import Modal from './Modal'

export default function UtilityMenu({
  gymName = '',
  userEmail = '',
  isAdmin = false,
  isInstalled = false,
  onDownloadApp,
  onLogout,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLangModalOpen, setIsLangModalOpen] = useState(false)
  const [langSearch, setLangSearch] = useState('')
  const menuRef = useRef(null)
  const buttonRef = useRef(null)

  const { isDark, toggleTheme } = useTheme()
  const { currentLanguage, selectedLang, setLanguage, languages } = useLanguage()

  // Close on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setIsLangModalOpen(false)
        buttonRef.current?.focus()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const q = langSearch.trim().toLowerCase()
  const filteredLanguages = languages.filter(
    (l) =>
      !q ||
      l.name.toLowerCase().includes(q) ||
      l.native.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q) ||
      (l.region && l.region.toLowerCase().includes(q))
  )

  const indianLanguages = filteredLanguages.filter((l) => l.flag === '🇮🇳' || l.code === 'en')
  const internationalLanguages = filteredLanguages.filter((l) => l.flag !== '🇮🇳' && l.code !== 'en')

  return (
    <div className="utility-menu-wrapper" style={{ position: 'relative' }}>
      {/* Accessible 3-Line Hamburger Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        className={`hamburger-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open utility menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Settings & Tools"
      >
        <span className="hamburger-box">
          <span className="hamburger-inner" />
        </span>
      </button>

      {/* Polished Dropdown Panel */}
      {isOpen && (
        <div
          ref={menuRef}
          className="utility-dropdown"
          role="menu"
          aria-orientation="vertical"
        >
          {/* User & Gym Info Header */}
          <div className="utility-menu-header">
            <div className="utility-user-info">
              <span className="utility-gym-name">
                {isAdmin ? 'Admin Portal' : gymName || 'Gym Manager'}
              </span>
              <span className="utility-user-email" title={userEmail}>
                {userEmail}
              </span>
            </div>
            <span className="badge blue small" style={{ fontSize: '10.5px', padding: '2px 7px' }}>
              {isAdmin ? 'Platform Admin' : 'Active Account'}
            </span>
          </div>

          <div className="utility-menu-divider" />

          {/* Menu Options List */}
          <div className="utility-menu-list">
            {/* 1. Language Option */}
            <button
              type="button"
              className="utility-menu-item"
              role="menuitem"
              onClick={() => {
                setIsOpen(false)
                setIsLangModalOpen(true)
              }}
            >
              <span className="utility-item-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </span>
              <div className="utility-item-content">
                <span className="utility-item-title">Language / भाषा</span>
                <span className="utility-item-sub">
                  {selectedLang?.flag} {selectedLang?.native}
                </span>
              </div>
              <span className="utility-item-arrow" aria-hidden="true">›</span>
            </button>

            {/* 2. Theme Toggle Option */}
            <button
              type="button"
              className="utility-menu-item"
              role="menuitem"
              onClick={() => toggleTheme()}
            >
              <span className="utility-item-icon" aria-hidden="true">
                {isDark ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fbbf24' }}>
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#0284c7' }}>
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </span>
              <div className="utility-item-content">
                <span className="utility-item-title">
                  {isDark ? 'Light Theme' : 'Dark Theme'}
                </span>
                <span className="utility-item-sub">
                  Currently {isDark ? 'Charcoal Dark' : 'Clean Light'}
                </span>
              </div>
              <span className="utility-item-badge">
                {isDark ? 'Dark' : 'Light'}
              </span>
            </button>

            {/* 3. Download App Option (if not installed or supported) */}
            {!isInstalled && onDownloadApp && (
              <button
                type="button"
                className="utility-menu-item"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false)
                  onDownloadApp()
                }}
              >
                <span className="utility-item-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                </span>
                <div className="utility-item-content">
                  <span className="utility-item-title">Download App</span>
                  <span className="utility-item-sub">Install on home screen (PWA)</span>
                </div>
              </button>
            )}

            {/* 4. WhatsApp Support Option */}
            <a
              href={WHATSAPP_SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="utility-menu-item"
              role="menuitem"
              onClick={() => setIsOpen(false)}
            >
              <span className="utility-item-icon" style={{ color: '#22c55e' }} aria-hidden="true">
                <WhatsAppIcon size={16} />
              </span>
              <div className="utility-item-content">
                <span className="utility-item-title">WhatsApp Support</span>
                <span className="utility-item-sub">Need help? Chat with admin</span>
              </div>
            </a>
          </div>

          <div className="utility-menu-divider" />

          {/* 5. Logout Option */}
          <div className="utility-menu-footer">
            <button
              type="button"
              className="utility-menu-item logout"
              role="menuitem"
              onClick={() => {
                setIsOpen(false)
                if (onLogout) onLogout()
              }}
            >
              <span className="utility-item-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </span>
              <div className="utility-item-content">
                <span className="utility-item-title">Sign Out / Logout</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Language Modal (Triggered from Hamburger Menu) */}
      {isLangModalOpen && (
        <Modal title="Choose Language / भाषा चुनें" onClose={() => setIsLangModalOpen(false)}>
          <div className="language-modal-body">
            <div className="search-box" style={{ marginBottom: '14px' }}>
              <span className="search-icon">🔍</span>
              <input
                type="text"
                autoFocus
                placeholder="Search language / भाषा खोजें (Hindi, Marathi, Gujarati…)"
                value={langSearch}
                onChange={(e) => setLangSearch(e.target.value)}
              />
            </div>

            {indianLanguages.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div className="small muted" style={{ fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Indian Languages (भारतीय भाषाएं)
                </div>
                <div className="lang-grid">
                  {indianLanguages.map((lang) => {
                    const isActive = currentLanguage === lang.code
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        className={`lang-option-card ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          setLanguage(lang.code)
                          setIsLangModalOpen(false)
                        }}
                      >
                        <span className="lang-flag">{lang.flag}</span>
                        <div className="lang-info">
                          <span className="lang-native">{lang.native}</span>
                          <span className="lang-name muted small">{lang.name}</span>
                        </div>
                        {isActive && <span className="lang-check">✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {internationalLanguages.length > 0 && (
              <div>
                <div className="small muted" style={{ fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  International Languages (अंतर्राष्ट्रीय भाषाएं)
                </div>
                <div className="lang-grid">
                  {internationalLanguages.map((lang) => {
                    const isActive = currentLanguage === lang.code
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        className={`lang-option-card ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          setLanguage(lang.code)
                          setIsLangModalOpen(false)
                        }}
                      >
                        <span className="lang-flag">{lang.flag}</span>
                        <div className="lang-info">
                          <span className="lang-native">{lang.native}</span>
                          <span className="lang-name muted small">{lang.name}</span>
                        </div>
                        {isActive && <span className="lang-check">✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {filteredLanguages.length === 0 && (
              <div className="card empty" style={{ textAlign: 'center', padding: '24px 12px' }}>
                No languages found matching "{langSearch}".
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
