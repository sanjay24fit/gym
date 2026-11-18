import { useId } from 'react'

export default function GymLogo({ size = 40, className = '' }) {
  const uid = useId()
  const logoBgId = `${uid}-logo-bg`
  const primaryGradId = `${uid}-primary`
  const goldGradId = `${uid}-gold`
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
        {/* Deep Forest Green Background Gradient */}
        <linearGradient id={logoBgId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#145C43" />
          <stop offset="100%" stopColor="#0B3728" />
        </linearGradient>

        {/* Emerald Vibrant Gradient */}
        <linearGradient id={primaryGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#35B982" />
          <stop offset="100%" stopColor="#1DB071" />
        </linearGradient>

        {/* Refined Gold Gradient */}
        <linearGradient id={goldGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5E4B5" />
          <stop offset="100%" stopColor="#D6B46A" />
        </linearGradient>

        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#35B982" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Background Badge */}
      <rect width="100" height="100" rx="24" fill={`url(#${logoBgId})`} />
      <rect x="1.5" y="1.5" width="97" height="97" rx="22.5" stroke="rgba(53, 185, 130, 0.3)" strokeWidth="1.5" />

      {/* Stylized Modern Dumbbell & Athletic Monogram */}
      <g filter={`url(#${glowId})`}>
        {/* Left Weight Plates */}
        <rect x="20" y="32" width="8" height="36" rx="4" fill={`url(#${primaryGradId})`} />
        <rect x="30" y="38" width="6" height="24" rx="3" fill={`url(#${goldGradId})`} />

        {/* Right Weight Plates */}
        <rect x="64" y="38" width="6" height="24" rx="3" fill={`url(#${goldGradId})`} />
        <rect x="72" y="32" width="8" height="36" rx="4" fill={`url(#${primaryGradId})`} />

        {/* Center Knurled Barbell Shaft */}
        <rect x="36" y="47" width="28" height="6" rx="3" fill="#FFFFFF" />

        {/* Athletic Diamond Accent */}
        <path d="M50 36L55 43H45L50 36Z" fill={`url(#${goldGradId})`} />
        <path d="M50 64L45 57H55L50 64Z" fill={`url(#${goldGradId})`} />
      </g>
    </svg>
  )
}
