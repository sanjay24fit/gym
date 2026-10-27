import { useState } from 'react'
import { useLanguage } from '../lib/language'
import Modal from './Modal'

// Shared language-selection modal: used by the LanguageToggle component.
export default function LanguageModal({ onClose }) {
  const { currentLanguage, setLanguage, languages } = useLanguage()
  const [search, setSearch] = useState('')

  const q = search.trim().toLowerCase()
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

  function renderLanguageGrid(list) {
    return (
      <div className="lang-grid">
        {list.map((lang) => {
          const isActive = currentLanguage === lang.code
          return (
            <button
              key={lang.code}
              type="button"
              className={`lang-option-card ${isActive ? 'active' : ''}`}
              onClick={() => {
                setLanguage(lang.code)
                onClose()
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
    )
  }

  return (
    <Modal title="Choose Language / भाषा चुनें" onClose={onClose}>
      <div className="language-modal-body">
        {/* Search Box */}
        <div className="search-box" style={{ marginBottom: '14px' }}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            autoFocus
            placeholder="Search language / भाषा खोजें (Hindi, Marathi, Gujarati…)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Indian Languages Section */}
        {indianLanguages.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div className="small muted" style={{ fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Indian Languages (भारतीय भाषाएं)
            </div>
            {renderLanguageGrid(indianLanguages)}
          </div>
        )}

        {/* International Languages Section */}
        {internationalLanguages.length > 0 && (
          <div>
            <div className="small muted" style={{ fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              International Languages (अंतर्राष्ट्रीय भाषाएं)
            </div>
            {renderLanguageGrid(internationalLanguages)}
          </div>
        )}

        {filteredLanguages.length === 0 && (
          <div className="card empty" style={{ textAlign: 'center', padding: '24px 12px' }}>
            No languages found matching "{search}".
          </div>
        )}
      </div>
    </Modal>
  )
}
