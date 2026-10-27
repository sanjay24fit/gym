import { useId } from 'react'

export default function GymLogo({ size = 40, className = '' }) {
  // Unique ids per instance so multiple logos on one screen never collide (T01 UT7)
  const uid = useId()
  const logoBgId = `${uid}-logo-bg`
  const primaryGradId = `${uid}-primary`
  const accentGradId = `${uid}-accent`
  const glowId = `${uid}-glow`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ flexShrink: 0, borderRadius: size > 48 ? '16px' : '10px' }}
    >
      <defs>
        <linearGradient id={logoBgId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2D2338" />
          <stop offset="100%" stopColor="#1A1422" />
        </linearGradient>
        <linearGradient id={primaryGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C5B8E2" />
          <stop offset="100%" stopColor="#A394C8" />
        </linearGradient>
        <linearGradient id={accentGradId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#E8E0F2" />
          <stop offset="100%" stopColor="#D5C8E5" />
        </linearGradient>
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#A394C8" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Background Badge */}
      <rect width="100" height="100" rx="22" fill={`url(#${logoBgId})`} />
      <rect x="1" y="1" width="98" height="98" rx="21" stroke="#3A3344" strokeWidth="1.5" />

      {/* Stylized Modern Dumbbell & Athletic Monogram */}
      <g filter={`url(#${glowId})`}>
        {/* Left Weight Plates */}
        <rect x="20" y="32" width="8" height="36" rx="3.5" fill={`url(#${primaryGradId})`} />
        <rect x="30" y="38" width="6" height="24" rx="2.5" fill={`url(#${primaryGradId})`} />

        {/* Right Weight Plates */}
        <rect x="64" y="38" width="6" height="24" rx="2.5" fill={`url(#${primaryGradId})`} />
        <rect x="72" y="32" width="8" height="36" rx="3.5" fill={`url(#${primaryGradId})`} />

        {/* Central Connecting Bar */}
        <rect x="34" y="47.5" width="32" height="5" rx="2.5" fill="#FFFFFF" />

        {/* Center Athletic Diamond / Crown Core */}
        <path
          d="M50 30L59 44H41L50 30Z"
          fill={`url(#${accentGradId})`}
        />
        <circle cx="50" cy="50" r="4.5" fill="#FFFFFF" />
        <path
          d="M50 70L41 56H59L50 70Z"
          fill={`url(#${primaryGradId})`}
        />
      </g>
    </svg>
  )
}
