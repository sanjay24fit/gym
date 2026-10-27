/* oxlint-disable react/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'

const LANGUAGE_KEY = 'gym_language'

export const SUPPORTED_LANGUAGES = [
  // Primary Indian Languages
  { code: 'en', name: 'English', native: 'English', flag: '🇬🇧', region: 'India / Global' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳', region: 'India' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', flag: '🇮🇳', region: 'India (Maharashtra)' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', flag: '🇮🇳', region: 'India (Gujarat)' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', flag: '🇮🇳', region: 'India (Punjab)' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', flag: '🇮🇳', region: 'India (West Bengal)' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳', region: 'India (Tamil Nadu)' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', flag: '🇮🇳', region: 'India (Andhra/Telangana)' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', flag: '🇮🇳', region: 'India (Karnataka)' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', flag: '🇮🇳', region: 'India (Kerala)' },
  { code: 'ur', name: 'Urdu', native: 'اردو', flag: '🇮🇳', region: 'India' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ', flag: '🇮🇳', region: 'India (Odisha)' },
  { code: 'as', name: 'Assamese', native: 'অসমীয়া', flag: '🇮🇳', region: 'India (Assam)' },
  
  // International Languages
  { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸', region: 'Spain / Americas' },
  { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷', region: 'France' },
  { code: 'ar', name: 'Arabic', native: 'العربية', flag: '🇸🇦', region: 'Middle East' },
  { code: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪', region: 'Germany' },
  { code: 'ru', name: 'Russian', native: 'Русский', flag: '🇷🇺', region: 'Russia' },
  { code: 'pt', name: 'Portuguese', native: 'Português', flag: '🇵🇹', region: 'Portugal / Brazil' },
  { code: 'ja', name: 'Japanese', native: '日本語', flag: '🇯🇵', region: 'Japan' },
  { code: 'ko', name: 'Korean', native: '한국어', flag: '🇰🇷', region: 'South Korea' },
  { code: 'zh-CN', name: 'Chinese', native: '简体中文', flag: '🇨🇳', region: 'China' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', flag: '🇮🇩', region: 'Indonesia' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe', flag: '🇹🇷', region: 'Turkey' },
  { code: 'it', name: 'Italian', native: 'Italiano', flag: '🇮🇹', region: 'Italy' },
  { code: 'ne', name: 'Nepali', native: 'नेपाली', flag: '🇳🇵', region: 'Nepal' },
]

const LanguageContext = createContext({
  currentLanguage: 'en',
  setLanguage: () => {},
  languages: SUPPORTED_LANGUAGES,
})

function setTranslateCookie(langCode) {
  if (typeof document === 'undefined') return
  const hostname = window.location.hostname
  const value = langCode === 'en' ? '' : `/en/${langCode}`

  if (!value) {
    // Reset translation to original English
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${hostname}; path=/;`
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=.${hostname}; path=/;`
  } else {
    document.cookie = `googtrans=${value}; path=/;`
    document.cookie = `googtrans=${value}; domain=${hostname}; path=/;`
    if (hostname.includes('.')) {
      document.cookie = `googtrans=${value}; domain=.${hostname}; path=/;`
    }
  }
}

export function LanguageProvider({ children }) {
  const [currentLanguage, setCurrentLanguageState] = useState(() => {
    if (typeof window === 'undefined') return 'en'
    return localStorage.getItem(LANGUAGE_KEY) || 'en'
  })

  useEffect(() => {
    // 1. Setup Google Translate script if not present
    if (typeof window === 'undefined') return

    window.googleTranslateElementInit = function () {
      if (window.google?.translate?.TranslateElement) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            autoDisplay: false,
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          },
          'google_translate_element'
        )
      }
    }

    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script')
      script.id = 'google-translate-script'
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
      script.async = true
      document.body.appendChild(script)
    }

    // Apply saved language cookie on mount
    const saved = localStorage.getItem(LANGUAGE_KEY)
    if (saved && saved !== 'en') {
      setTranslateCookie(saved)
    }
  }, [])

  const setLanguage = (langCode) => {
    setCurrentLanguageState(langCode)
    try {
      localStorage.setItem(LANGUAGE_KEY, langCode)
    } catch (e) {
      console.warn('Failed to save language in localStorage', e)
    }

    setTranslateCookie(langCode)

    // Trigger Google Translate dropdown element if available in DOM
    const combo = document.querySelector('.goog-te-combo')
    if (combo) {
      combo.value = langCode
      combo.dispatchEvent(new Event('change'))
    } else {
      // Reload page once to let the googtrans cookie apply cleanly
      window.location.reload()
    }
  }

  const selectedLang = SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0]

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        selectedLang,
        setLanguage,
        languages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
