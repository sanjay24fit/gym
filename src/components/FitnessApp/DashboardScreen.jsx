import React, { useState } from 'react'

export default function DashboardScreen({ onNavigate, onTriggerAction }) {
  const [selectedDay, setSelectedDay] = useState('W')

  const weeklyData = [
    { day: 'M', height: 42 },
    { day: 'T', height: 60 },
    { day: 'W', height: 85, active: true },
    { day: 'T', height: 50 },
    { day: 'F', height: 35 },
    { day: 'S', height: 70 },
    { day: 'S', height: 45 },
  ]

  const metrics = [
    { label: 'Workout', val: '45 min', color: 'var(--fit-mint)' },
    { label: 'Calories', val: '520 kcal', color: 'var(--fit-peach)' },
    { label: 'Steps', val: '8,752', color: 'var(--fit-blue)' },
    { label: 'Active Time', val: '1h 15m', color: 'var(--fit-lavender)' },
  ]

  return (
    <div className="fit-screen-dashboard">
      {/* Top Header */}
      <div className="fit-dash-header">
        <div className="fit-header-left">
          <button
            type="button"
            className="fit-menu-icon-btn"
            aria-label="Navigation Menu"
            onClick={() => onNavigate('onboarding')}
          >
            <div className="fit-menu-bar" />
            <div className="fit-menu-bar short" />
          </button>
          <div className="fit-dash-user-title">
            <span className="fit-dash-greeting">Hi, Alex 👋</span>
            <span className="fit-dash-subtitle">Ready to crush your goals?</span>
          </div>
        </div>
        <button
          type="button"
          className="fit-bell-btn"
          aria-label="Notifications"
          onClick={() => onTriggerAction('notifications')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <div className="fit-bell-badge" />
        </button>
      </div>

      {/* Card: Today's Progress */}
      <div className="fit-card">
        <div className="fit-card-header">
          <span className="fit-card-title">Today's Progress</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--fit-text-muted)" strokeWidth="2">
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
        </div>

        <div className="fit-progress-content">
          {/* Circular Progress Ring */}
          <div className="fit-ring-wrapper">
            <svg width="104" height="104" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="var(--fit-card-subtle)"
                strokeWidth="9"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="url(#mintGradient)"
                strokeWidth="9"
                strokeDasharray="251.2"
                strokeDashoffset="62.8" /* 75% filled */
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dashoffset 1s ease' }}
              />
              <defs>
                <linearGradient id="mintGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#48D1B5" />
                  <stop offset="100%" stopColor="#2BAA91" />
                </linearGradient>
              </defs>
            </svg>
            <div className="fit-ring-center">
              <span className="fit-ring-percent">75%</span>
            </div>
          </div>

          {/* Metric Details */}
          <div className="fit-metrics-list">
            {metrics.map((m) => (
              <div key={m.label} className="fit-metric-item">
                <div className="fit-metric-label-group">
                  <div className="fit-metric-dot" style={{ background: m.color }} />
                  <span>{m.label}</span>
                </div>
                <span className="fit-metric-val">{m.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Card: Weekly Activity */}
      <div className="fit-card">
        <div className="fit-card-header">
          <span className="fit-card-title">Weekly Activity</span>
          <button
            type="button"
            className="fit-skip-btn"
            style={{ fontSize: '0.75rem', color: 'var(--fit-mint-dark)' }}
            onClick={() => onNavigate('activity')}
          >
            Details
          </button>
        </div>

        <div className="fit-chart-days">
          {weeklyData.map((d) => {
            const isSelected = selectedDay === d.day
            return (
              <div
                key={d.day}
                className={`fit-chart-col ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedDay(d.day)}
                style={{ cursor: 'pointer' }}
              >
                <div className="fit-chart-bar-bg">
                  <div
                    className="fit-chart-bar-fill"
                    style={{ height: `${d.height}%` }}
                  />
                </div>
                <span className="fit-chart-day-label">{d.day}</span>
                {isSelected && <div className="fit-day-dot" />}
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="fit-quick-actions-section">
        <span className="fit-section-heading">Quick Actions</span>
        <div className="fit-quick-grid">
          <button
            type="button"
            className="fit-quick-tile"
            onClick={() => onNavigate('workouts')}
          >
            <div className="fit-quick-icon-box" style={{ background: 'var(--fit-mint-light)', color: 'var(--fit-mint-dark)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M6 5v14M18 5v14M2 9v6h4V9H2zm16 0v6h4V9h-4zM6 12h12" />
              </svg>
            </div>
            <div className="fit-quick-info">
              <span className="fit-quick-title">Start Workout</span>
            </div>
          </button>

          <button
            type="button"
            className="fit-quick-tile"
            onClick={() => onTriggerAction('log-food')}
          >
            <div className="fit-quick-icon-box" style={{ background: 'var(--fit-peach-light)', color: 'var(--fit-peach-dark)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                <line x1="6" y1="1" x2="6" y2="4" />
                <line x1="10" y1="1" x2="10" y2="4" />
                <line x1="14" y1="1" x2="14" y2="4" />
              </svg>
            </div>
            <div className="fit-quick-info">
              <span className="fit-quick-title">Log Food</span>
            </div>
          </button>

          <button
            type="button"
            className="fit-quick-tile"
            onClick={() => onNavigate('activity')}
          >
            <div className="fit-quick-icon-box" style={{ background: 'var(--fit-lavender-light)', color: 'var(--fit-lavender)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
              </svg>
            </div>
            <div className="fit-quick-info">
              <span className="fit-quick-title">Body Stats</span>
            </div>
          </button>

          <button
            type="button"
            className="fit-quick-tile"
            onClick={() => onTriggerAction('challenges')}
          >
            <div className="fit-quick-icon-box" style={{ background: 'var(--fit-amber-light)', color: 'var(--fit-amber)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
              </svg>
            </div>
            <div className="fit-quick-info">
              <span className="fit-quick-title">Challenges</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
