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
        <span className="lang-icon" aria-hidden="true">
          🌐
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
