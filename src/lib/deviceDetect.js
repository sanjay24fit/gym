/**
 * Device & Platform Detection Helper
 * Provides reliable detection for iOS (iPhone/iPad/iPod), Android, and Standalone PWA mode.
 */

export function getDeviceInfo() {
  if (typeof window === 'undefined') {
    return {
      isIOS: false,
      isAndroid: false,
      isStandalone: false,
      isInAppBrowser: false,
      platform: 'desktop',
    }
  }

  const ua = window.navigator.userAgent || ''
  const isAppleMobile = /iPad|iPhone|iPod/.test(ua)
  // Modern iPadOS 13+ reports MacIntel but has touch points
  const isIpadOS =
    window.navigator.platform === 'MacIntel' &&
    typeof window.navigator.maxTouchPoints === 'number' &&
    window.navigator.maxTouchPoints > 1

  const isIOS = (isAppleMobile || isIpadOS) && !window.MSStream
  const isAndroid = /Android/i.test(ua)

  const isStandalone = Boolean(
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    (typeof document !== 'undefined' && document.referrer.includes('android-app://'))
  )

  // In-app browsers on iOS (Instagram, WhatsApp, Facebook, LinkedIn)
  const isInAppBrowser =
    isIOS &&
    !isStandalone &&
    (/FBAN|FBAV|Instagram|WhatsApp|Line|Snapchat/i.test(ua) ||
      (!/Safari/i.test(ua) && /AppleWebKit/i.test(ua)))

  return {
    isIOS,
    isAndroid,
    isStandalone,
    isInAppBrowser,
    platform: isIOS ? 'ios' : isAndroid ? 'android' : 'desktop',
  }
}
