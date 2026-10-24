import React, { useState } from 'react'

export default function ActivityScreen() {
  const [period, setPeriod] = useState('Week')
  const [activeTooltip, setActiveTooltip] = useState(520)

  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  return (
    <div className="fit-screen-activity">
      {/* Header */}
      <div className="fit-workouts-header">
        <h2 className="fit-workouts-title">Activity</h2>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--fit-text-secondary)" strokeWidth="2">
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
          <circle cx="5" cy="12" r="1.5" />
        </svg>
      </div>

      {/* Period Segmented Switch */}
      <div className="fit-period-switch">
        {['Day', 'Week', 'Month', 'Year'].map((p) => (
          <button
            key={p}
            type="button"
            className={`fit-period-btn ${period === p ? 'active' : ''}`}
            onClick={() => setPeriod(p)}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Date Stepper */}
      <div className="fit-date-stepper">
        <button type="button" className="fit-skip-btn" style={{ fontSize: '0.75rem' }}>
          &lt;
        </button>
        <span>May 12 – May 18</span>
        <button type="button" className="fit-skip-btn" style={{ fontSize: '0.75rem' }}>
          &gt;
        </button>
      </div>

      {/* Card: Calories Burned & Spline Chart */}
      <div className="fit-burned-card">
        <span className="fit-social-label">Calories Burned</span>
        <div className="fit-burned-val-row">
          <span className="fit-burned-number">2,450 <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>kcal</span></span>
          <span className="fit-delta-badge">▲ 12% vs last week</span>
        </div>

        {/* Smooth Area Curve Chart */}
        <div className="fit-spline-chart-wrap">
          <svg width="100%" height="90" viewBox="0 0 280 80" preserveAspectRatio="none">
            <defs>
              <linearGradient id="peachAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFA68F" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#FFA68F" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Filled area */}
            <path
              d="M 10,65 Q 40,68 60,55 T 110,48 T 160,52 T 210,22 T 250,30 T 275,35 L 275,80 L 10,80 Z"
              fill="url(#peachAreaGrad)"
            />

            {/* Spline line */}
            <path
              d="M 10,65 Q 40,68 60,55 T 110,48 T 160,52 T 210,22 T 250,30 T 275,35"
              fill="none"
              stroke="var(--fit-peach)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* Highlighted point on Friday/Saturday */}
            <circle cx="210" cy="22" r="5" fill="#FFFFFF" stroke="var(--fit-peach)" strokeWidth="3" />
          </svg>

          {/* Floating Tooltip Bubble */}
          <div
            style={{
              position: 'absolute',
              top: '2px',
              left: '70%',
              transform: 'translateX(-50%)',
              background: '#24302F',
              color: '#FFFFFF',
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: '0.68rem',
              fontWeight: 700,
              boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
            }}
          >
            {activeTooltip}
          </div>

          {/* Days Label Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 6px', marginTop: 4 }}>
            {days.map((d, i) => {
              const dayValues = [380, 420, 510, 470, 520, 610, 390]
              const val = dayValues[i]
              const isActive = activeTooltip === val
              return (
                <span
                  key={i}
                  onClick={() => setActiveTooltip(val)}
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: isActive ? 800 : 600,
                    color: isActive ? 'var(--fit-mint-dark)' : 'var(--fit-text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {d}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      {/* Card: Concentric Activity Rings */}
      <div className="fit-rings-card">
        <div className="fit-card-header" style={{ marginBottom: 12 }}>
          <span className="fit-card-title">Activity Rings</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--fit-text-muted)" strokeWidth="2">
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
        </div>

        <div className="fit-rings-layout">
          {/* 3 Concentric SVG Rings */}
          <div className="fit-concentric-svg-box">
            <svg width="110" height="110" viewBox="0 0 100 100">
              {/* Outer Ring - Move (Peach) */}
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--fit-card-subtle)" strokeWidth="7" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="var(--fit-peach)"
                strokeWidth="7"
                strokeDasharray="263.8"
                strokeDashoffset="60"
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />

              {/* Middle Ring - Exercise (Mint) */}
              <circle cx="50" cy="50" r="32" fill="none" stroke="var(--fit-card-subtle)" strokeWidth="7" />
              <circle
                cx="50"
                cy="50"
                r="32"
                fill="none"
                stroke="var(--fit-mint)"
                strokeWidth="7"
                strokeDasharray="201"
                strokeDashoffset="55"
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />

              {/* Inner Ring - Stand (Teal) */}
              <circle cx="50" cy="50" r="22" fill="none" stroke="var(--fit-card-subtle)" strokeWidth="7" />
              <circle
                cx="50"
                cy="50"
                r="22"
                fill="none"
                stroke="#4DB5C6"
                strokeWidth="7"
                strokeDasharray="138"
                strokeDashoffset="30"
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            </svg>
          </div>

          {/* Ring Legend Items */}
          <div className="fit-rings-legend">
            <div className="fit-ring-legend-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className="fit-ring-dot move" />
                <span style={{ color: 'var(--fit-text-secondary)', fontWeight: 600 }}>Move</span>
              </div>
              <span style={{ fontWeight: 700, color: 'var(--fit-text-main)' }}>520 / 600 kcal</span>
            </div>

            <div className="fit-ring-legend-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className="fit-ring-dot exercise" />
                <span style={{ color: 'var(--fit-text-secondary)', fontWeight: 600 }}>Exercise</span>
              </div>
              <span style={{ fontWeight: 700, color: 'var(--fit-text-main)' }}>45 / 60 min</span>
            </div>

            <div className="fit-ring-legend-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className="fit-ring-dot stand" />
                <span style={{ color: 'var(--fit-text-secondary)', fontWeight: 600 }}>Stand</span>
              </div>
              <span style={{ fontWeight: 700, color: 'var(--fit-text-main)' }}>10 / 12 hr</span>
            </div>
          </div>
        </div>
      </div>

      {/* Card: Steps */}
      <div className="fit-steps-card">
        <div className="fit-steps-left">
          <span className="fit-social-label">Steps</span>
          <span className="fit-steps-val">8,752 <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Steps</span></span>
          <span style={{ fontSize: '0.68rem', color: 'var(--fit-mint-dark)', fontWeight: 700, marginTop: 2 }}>
            ▲ 8% vs last week
          </span>
        </div>

        {/* Mini Bars */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 38 }}>
          {[30, 45, 75, 50, 95, 60, 40].map((h, idx) => (
            <div
              key={idx}
              style={{
                width: 6,
                height: `${h}%`,
                background: idx === 4 ? 'var(--fit-mint)' : 'var(--fit-mint-light)',
                borderRadius: 4,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
