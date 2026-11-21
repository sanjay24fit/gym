import GymLogo from './GymLogo'

export default function SplashScreen({ message = 'Loading Gym Manager…' }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg, #0E1411)',
        color: 'var(--text, #F2F5F3)',
        zIndex: 99999,
        padding: '24px',
        boxSizing: 'border-box',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          textAlign: 'center',
          maxWidth: '320px',
        }}
      >
        <div
          style={{
            animation: 'splashPulse 1.8s ease-in-out infinite',
            filter: 'drop-shadow(0 10px 24px rgba(53, 185, 130, 0.28))',
          }}
        >
          <GymLogo size={68} />
        </div>

        <div>
          <h1
            style={{
              margin: '8px 0 2px',
              fontSize: '22px',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: 'var(--text, #F2F5F3)',
            }}
          >
            Gym Manager
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '12.5px',
              color: 'var(--muted, #96A39C)',
              fontWeight: 500,
            }}
          >
            Smart Management & Member Portal
          </p>
        </div>

        {/* Elegant Shimmer Progress Indicator */}
        <div
          style={{
            width: '130px',
            height: '3.5px',
            background: 'var(--border, rgba(255, 255, 255, 0.08))',
            borderRadius: '99px',
            overflow: 'hidden',
            position: 'relative',
            marginTop: '12px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: '45%',
              background: 'linear-gradient(90deg, transparent, var(--accent, #35B982), transparent)',
              borderRadius: '99px',
              animation: 'splashBar 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
            }}
          />
        </div>

        {message && (
          <span
            style={{
              fontSize: '11.5px',
              color: 'var(--muted-light, #67756D)',
              marginTop: '4px',
            }}
          >
            {message}
          </span>
        )}
      </div>
    </div>
  )
}
