import { useState } from 'react'
import { useLanguage } from '../lib/language'
import LanguageModal from './LanguageModal'

export default function LanguageToggle({
  size = 'md', // 'sm' | 'md'
  showLabel = true,
  className = '',
}) {
  const { selectedLang } = useLanguage()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`btn-language-toggle ${size === 'sm' ? 'btn-lang-sm' : ''} ${className}`.trim()}
        title="Change App Language / भाषा बदलें"
        aria-label="Change Language"
      >
        <span className="lang-icon" aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </span>
        {showLabel && (
          <span className="lang-current-label">
            {selectedLang.native}
          </span>
        )}
      </button>

      {open && <LanguageModal onClose={() => setOpen(false)} />}
    </>
  )
}
