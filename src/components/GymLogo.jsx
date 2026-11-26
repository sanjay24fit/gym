import { useId } from 'react'

/**
 * Athletic Gym Manager Flame & Dumbbell Logo
 * Inspired by modern sports and fitness aesthetic (Electric Orange & White Flame)
 */
export default function GymLogo({ size = 40, className = '' }) {
  const uid = useId()
  const logoBgId = `${uid}-athletic-bg`
  const flameGradId = `${uid}-flame-grad`
  const innerGlowId = `${uid}-inner-glow`
  const glowId = `${uid}-glow`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ flexShrink: 0, borderRadius: size > 48 ? '18px' : '12px' }}
    >
      <defs>
        {/* Electric Athletic Orange Gradient Background */}
        <linearGradient id={logoBgId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF7A1A" />
          <stop offset="45%" stopColor="#FF5500" />
          <stop offset="100%" stopColor="#E63900" />
        </linearGradient>

        {/* Pure White to Radiant Warm Flame Accent */}
        <linearGradient id={flameGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="65%" stopColor="#FFF2E8" />
          <stop offset="100%" stopColor="#FFD1B3" />
        </linearGradient>

        {/* Soft Athletic Orange Glow */}
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#FF5500" floodOpacity="0.45" />
        </filter>

        <linearGradient id={innerGlowId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FF7A1A" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Main Badge Surface */}
      <rect width="100" height="100" rx="26" fill={`url(#${logoBgId})`} />
      <rect
        x="1.5"
        y="1.5"
        width="97"
        height="97"
        rx="24.5"
        stroke="rgba(255, 255, 255, 0.35)"
        strokeWidth="1.5"
      />

      {/* Subtle Top-Left Gloss Highlight */}
      <path
        d="M6 30C6 16.7452 16.7452 6 30 6H70C73.3137 6 76 8.68629 76 12C76 15.3137 73.3137 18 70 18H32C24.268 18 18 24.268 18 32V70C18 73.3137 15.3137 76 12 76C8.68629 76 6 73.3137 6 70V30Z"
        fill={`url(#${innerGlowId})`}
        opacity="0.3"
      />

      {/* Iconic Athletic Flame & Power Dumbbell Silhouette */}
      <g filter={`url(#${glowId})`}>
        {/* Core Athletic Power Flame */}
        <path
          d="M50 16C50 16 55.5 24.5 55.5 30C55.5 32.2 54.8 34.2 53.6 35.8C59.2 32.6 63 26.8 63 26.8C63 26.8 68 34.2 68 44C68 56.5 59.5 65 50 65C40.5 65 32 56.5 32 44C32 35.5 36.5 28.5 41 24.5C40.2 27.2 40.5 30.5 42 32.5C44.2 35.5 47.8 35.8 49.5 33C51.2 30.2 50.8 23 50 16Z"
          fill={`url(#${flameGradId})`}
        />

        {/* Athletic Barbells Anchor / Platform Base */}
        {/* Left Plate */}
        <rect x="22" y="68" width="6" height="18" rx="3" fill="#FFFFFF" />
        <rect x="30" y="71" width="5" height="12" rx="2.5" fill="#FFE2CC" />

        {/* Center Barbell Bar */}
        <rect x="35" y="74.5" width="30" height="5" rx="2.5" fill="#FFFFFF" />

        {/* Right Plate */}
        <rect x="65" y="71" width="5" height="12" rx="2.5" fill="#FFE2CC" />
        <rect x="72" y="68" width="6" height="18" rx="3" fill="#FFFFFF" />

        {/* Energetic Center Core Pip */}
        <circle cx="50" cy="51" r="4.5" fill="#FF5500" />
      </g>
    </svg>
  )
}
