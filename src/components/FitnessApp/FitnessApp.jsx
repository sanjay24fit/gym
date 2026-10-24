import React, { useState } from 'react'
import './fitness-theme.css'

import OnboardingScreen from './OnboardingScreen'
import DashboardScreen from './DashboardScreen'
import WorkoutsScreen from './WorkoutsScreen'
import WorkoutDetailScreen from './WorkoutDetailScreen'
import ActivityScreen from './ActivityScreen'
import NutritionScreen from './NutritionScreen'
import FitnessBottomNav from './FitnessBottomNav'

export default function FitnessApp({ onBackToManager }) {
  // viewMode: 'simulator' | 'studio' | 'fullscreen'
  const [viewMode, setViewMode] = useState('studio')

  // activeTab in simulator: 'onboarding' | 'dashboard' | 'workouts' | 'workout-detail' | 'activity' | 'nutrition'
  const [currentTab, setCurrentTab] = useState('dashboard')
  const [selectedWorkout, setSelectedWorkout] = useState(null)

  // Interactive Modals
  const [isLogFoodOpen, setIsLogFoodOpen] = useState(false)
  const [newFoodName, setNewFoodName] = useState('')
  const [newFoodCals, setNewFoodCals] = useState('')
  const [notificationMsg, setNotificationMsg] = useState('')

  const handleOpenWorkoutDetail = (w) => {
    setSelectedWorkout(w)
    setCurrentTab('workout-detail')
  }

  const handleTriggerAction = (action) => {
    if (action === 'log-food') {
      setIsLogFoodOpen(true)
    } else if (action === 'notifications') {
      setNotificationMsg('🎉 Great job! You hit 75% of your daily movement goal.')
      setTimeout(() => setNotificationMsg(''), 4000)
    } else if (action === 'challenges') {
      setNotificationMsg('🔥 7-Day Consistency Streak active! Keep going!')
      setTimeout(() => setNotificationMsg(''), 4000)
    }
  }

  const renderActiveScreen = (tabId = currentTab) => {
    switch (tabId) {
      case 'onboarding':
        return (
          <OnboardingScreen
            onGetStarted={() => setCurrentTab('dashboard')}
            onSkip={() => setCurrentTab('dashboard')}
          />
        )
      case 'dashboard':
        return (
          <DashboardScreen
            onNavigate={(dest) => setCurrentTab(dest)}
            onTriggerAction={handleTriggerAction}
          />
        )
      case 'workouts':
        return <WorkoutsScreen onSelectWorkout={handleOpenWorkoutDetail} />
      case 'workout-detail':
        return (
          <WorkoutDetailScreen
            workout={selectedWorkout}
            onBack={() => setCurrentTab('workouts')}
          />
        )
      case 'activity':
        return <ActivityScreen />
      case 'nutrition':
        return <NutritionScreen onOpenLogModal={() => setIsLogFoodOpen(true)} />
      default:
        return (
          <DashboardScreen
            onNavigate={(dest) => setCurrentTab(dest)}
            onTriggerAction={handleTriggerAction}
          />
        )
    }
  }

  return (
    <div className="fitness-showcase-wrapper">
      {/* Top Showcase Navigation Bar */}
      <header className="fitness-showcase-header">
        <div className="fitness-brand-badge">
          <div className="fitness-brand-logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2a9 9 0 0 0-9 9c0 4.1 2.8 7.6 6.7 8.7L12 22l2.3-2.3C18.2 18.6 21 15.1 21 11a9 9 0 0 0-9-9z" />
            </svg>
          </div>
          <div>
            <span className="fitness-brand-name">ZenFit UI</span>
            <span className="fitness-brand-tag">Soft Neumorphic</span>
          </div>
        </div>

        {/* View Mode Pills Switcher */}
        <div className="fitness-mode-pills">
          <button
            type="button"
            className={`fitness-mode-btn ${viewMode === 'studio' ? 'active' : ''}`}
            onClick={() => setViewMode('studio')}
            title="Studio Grid view (all 6 screens arranged like original poster)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="3" y="3" width="7" height="7" rx="2" />
              <rect x="14" y="3" width="7" height="7" rx="2" />
              <rect x="3" y="14" width="7" height="7" rx="2" />
              <rect x="14" y="14" width="7" height="7" rx="2" />
            </svg>
            <span>Studio Showcase</span>
          </button>

          <button
            type="button"
            className={`fitness-mode-btn ${viewMode === 'simulator' ? 'active' : ''}`}
            onClick={() => setViewMode('simulator')}
            title="Interactive single device simulator"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="5" y="2" width="14" height="20" rx="3" />
              <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" />
            </svg>
            <span>Live Device</span>
          </button>

          <button
            type="button"
            className={`fitness-mode-btn ${viewMode === 'fullscreen' ? 'active' : ''}`}
            onClick={() => setViewMode('fullscreen')}
            title="Full viewport mobile view"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
            <span>Full Screen</span>
          </button>
        </div>

        {/* Header Right Actions */}
        <div className="fitness-header-actions">
          {onBackToManager && (
            <button
              type="button"
              className="fitness-action-link-btn"
              onClick={onBackToManager}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Gym Manager</span>
            </button>
          )}
        </div>
      </header>

      {/* Toast Notification Alert */}
      {notificationMsg && (
        <div
          style={{
            position: 'fixed',
            top: 76,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#FFFFFF',
            padding: '10px 20px',
            borderRadius: 999,
            boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
            zIndex: 1000,
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--fit-text-main)',
            border: '1px solid rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            animation: 'fitSlideUp 0.3s ease',
          }}
        >
          {notificationMsg}
        </div>
      )}

      {/* ====================================================================
          MODE 1: STUDIO SHOWCASE (All 6 screens matching the theme image)
          ==================================================================== */}
      {viewMode === 'studio' && (
        <div className="fitness-studio-container">
          <div className="fitness-studio-hero-title">
            <h1>Fitness Application UI Design</h1>
            <p>
              Soft pastel & neumorphic aesthetic with soothing mint green accents, warm peach gradients, generous whitespace, and tactile soft-UI depth.
            </p>
          </div>

          <div className="fitness-studio-grid">
            {/* Screen 1: Onboarding */}
            <div className="fitness-mockup-wrapper">
              <div className="fitness-phone-frame">
                <div className="fitness-status-bar">
                  <span className="fitness-status-time">9:41</span>
                  <div className="fitness-status-notch-island">
                    <div className="fitness-status-camera" />
                  </div>
                  <div className="fitness-status-sensors">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
                    </svg>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="2" y="7" width="16" height="10" rx="2" />
                      <path d="M22 11v2" />
                    </svg>
                  </div>
                </div>

                <div className="fitness-screen-content">
                  <OnboardingScreen
                    onGetStarted={() => {
                      setCurrentTab('dashboard')
                      setViewMode('simulator')
                    }}
                    onSkip={() => {
                      setCurrentTab('dashboard')
                      setViewMode('simulator')
                    }}
                  />
                </div>
                <div className="fitness-home-indicator" />
              </div>
              <div className="fitness-mockup-label">
                <span className="fitness-mockup-chip">1. Onboarding & Welcome</span>
                <span
                  className="fitness-mockup-interact-hint"
                  onClick={() => {
                    setCurrentTab('onboarding')
                    setViewMode('simulator')
                  }}
                >
                  Interact ↗
                </span>
              </div>
            </div>

            {/* Screen 2: Dashboard */}
            <div className="fitness-mockup-wrapper">
              <div className="fitness-phone-frame">
                <div className="fitness-status-bar">
                  <span className="fitness-status-time">9:41</span>
                  <div className="fitness-status-notch-island">
                    <div className="fitness-status-camera" />
                  </div>
                  <div className="fitness-status-sensors">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
                    </svg>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="2" y="7" width="16" height="10" rx="2" />
                      <path d="M22 11v2" />
                    </svg>
                  </div>
                </div>

                <div className="fitness-screen-content">
                  <DashboardScreen
                    onNavigate={(tab) => {
                      setCurrentTab(tab)
                      setViewMode('simulator')
                    }}
                    onTriggerAction={handleTriggerAction}
                  />
                </div>
                <FitnessBottomNav
                  currentTab="dashboard"
                  onSelectTab={(tab) => {
                    setCurrentTab(tab)
                    setViewMode('simulator')
                  }}
                />
                <div className="fitness-home-indicator" />
              </div>
              <div className="fitness-mockup-label">
                <span className="fitness-mockup-chip">2. Dashboard & Progress</span>
                <span
                  className="fitness-mockup-interact-hint"
                  onClick={() => {
                    setCurrentTab('dashboard')
                    setViewMode('simulator')
                  }}
                >
                  Interact ↗
                </span>
              </div>
            </div>

            {/* Screen 3: Workouts */}
            <div className="fitness-mockup-wrapper">
              <div className="fitness-phone-frame">
                <div className="fitness-status-bar">
                  <span className="fitness-status-time">9:41</span>
                  <div className="fitness-status-notch-island">
                    <div className="fitness-status-camera" />
                  </div>
                  <div className="fitness-status-sensors">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
                    </svg>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="2" y="7" width="16" height="10" rx="2" />
                      <path d="M22 11v2" />
                    </svg>
                  </div>
                </div>

                <div className="fitness-screen-content">
                  <WorkoutsScreen
                    onSelectWorkout={(w) => {
                      setSelectedWorkout(w)
                      setCurrentTab('workout-detail')
                      setViewMode('simulator')
                    }}
                  />
                </div>
                <FitnessBottomNav
                  currentTab="workouts"
                  onSelectTab={(tab) => {
                    setCurrentTab(tab)
                    setViewMode('simulator')
                  }}
                />
                <div className="fitness-home-indicator" />
              </div>
              <div className="fitness-mockup-label">
                <span className="fitness-mockup-chip">3. Workouts Explorer</span>
                <span
                  className="fitness-mockup-interact-hint"
                  onClick={() => {
                    setCurrentTab('workouts')
                    setViewMode('simulator')
                  }}
                >
                  Interact ↗
                </span>
              </div>
            </div>

            {/* Screen 4: Workout Detail */}
            <div className="fitness-mockup-wrapper">
              <div className="fitness-phone-frame">
                <div className="fitness-status-bar">
                  <span className="fitness-status-time">9:41</span>
                  <div className="fitness-status-notch-island">
                    <div className="fitness-status-camera" />
                  </div>
                  <div className="fitness-status-sensors">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
                    </svg>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="2" y="7" width="16" height="10" rx="2" />
                      <path d="M22 11v2" />
                    </svg>
                  </div>
                </div>

                <div className="fitness-screen-content">
                  <WorkoutDetailScreen
                    workout={{
                      id: 'full-body-strength',
                      title: 'Full Body Strength',
                      duration: '45 min',
                      calories: '320 kcal',
                      level: 'Intermediate',
                      thumb: '/fitness/workout-strength.jpg',
                    }}
                    onBack={() => {
                      setCurrentTab('workouts')
                      setViewMode('simulator')
                    }}
                  />
                </div>
                <div className="fitness-home-indicator" />
              </div>
              <div className="fitness-mockup-label">
                <span className="fitness-mockup-chip">4. Workout Session Detail</span>
                <span
                  className="fitness-mockup-interact-hint"
                  onClick={() => {
                    setCurrentTab('workout-detail')
                    setViewMode('simulator')
                  }}
                >
                  Interact ↗
                </span>
              </div>
            </div>

            {/* Screen 5: Activity & Analytics */}
            <div className="fitness-mockup-wrapper">
              <div className="fitness-phone-frame">
                <div className="fitness-status-bar">
                  <span className="fitness-status-time">9:41</span>
                  <div className="fitness-status-notch-island">
                    <div className="fitness-status-camera" />
                  </div>
                  <div className="fitness-status-sensors">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
                    </svg>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="2" y="7" width="16" height="10" rx="2" />
                      <path d="M22 11v2" />
                    </svg>
                  </div>
                </div>

                <div className="fitness-screen-content">
                  <ActivityScreen />
                </div>
                <FitnessBottomNav
                  currentTab="activity"
                  onSelectTab={(tab) => {
                    setCurrentTab(tab)
                    setViewMode('simulator')
                  }}
                />
                <div className="fitness-home-indicator" />
              </div>
              <div className="fitness-mockup-label">
                <span className="fitness-mockup-chip">5. Activity & Analytics</span>
                <span
                  className="fitness-mockup-interact-hint"
                  onClick={() => {
                    setCurrentTab('activity')
                    setViewMode('simulator')
                  }}
                >
                  Interact ↗
                </span>
              </div>
            </div>

            {/* Screen 6: Nutrition */}
            <div className="fitness-mockup-wrapper">
              <div className="fitness-phone-frame">
                <div className="fitness-status-bar">
                  <span className="fitness-status-time">9:41</span>
                  <div className="fitness-status-notch-island">
                    <div className="fitness-status-camera" />
                  </div>
                  <div className="fitness-status-sensors">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
                    </svg>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="2" y="7" width="16" height="10" rx="2" />
                      <path d="M22 11v2" />
                    </svg>
                  </div>
                </div>

                <div className="fitness-screen-content">
                  <NutritionScreen onOpenLogModal={() => setIsLogFoodOpen(true)} />
                </div>
                <FitnessBottomNav
                  currentTab="nutrition"
                  onSelectTab={(tab) => {
                    setCurrentTab(tab)
                    setViewMode('simulator')
                  }}
                />
                <div className="fitness-home-indicator" />
              </div>
              <div className="fitness-mockup-label">
                <span className="fitness-mockup-chip">6. Nutrition & Meals</span>
                <span
                  className="fitness-mockup-interact-hint"
                  onClick={() => {
                    setCurrentTab('nutrition')
                    setViewMode('simulator')
                  }}
                >
                  Interact ↗
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODE 2: INTERACTIVE LIVE DEVICE SIMULATOR
          ==================================================================== */}
      {viewMode === 'simulator' && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '36px 16px 60px' }}>
          <div className="fitness-phone-frame">
            {/* Status Bar */}
            <div className="fitness-status-bar">
              <span className="fitness-status-time">9:41</span>
              <div className="fitness-status-notch-island">
                <div className="fitness-status-camera" />
              </div>
              <div className="fitness-status-sensors">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
                </svg>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="2" y="7" width="16" height="10" rx="2" />
                  <path d="M22 11v2" />
                </svg>
              </div>
            </div>

            {/* Scrollable Screen Content */}
            <div className="fitness-screen-content">
              {renderActiveScreen(currentTab)}
            </div>

            {/* Floating Neumorphic Dock (Hidden on Onboarding & Workout Detail) */}
            {currentTab !== 'onboarding' && currentTab !== 'workout-detail' && (
              <FitnessBottomNav
                currentTab={currentTab}
                onSelectTab={(tab) => setCurrentTab(tab)}
              />
            )}

            {/* Bottom Home Indicator */}
            <div className="fitness-home-indicator" />
          </div>
        </div>
      )}

      {/* ====================================================================
          MODE 3: FULL SCREEN APP VIEW
          ==================================================================== */}
      {viewMode === 'fullscreen' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 640, width: '100%', margin: '0 auto', background: '#FFFFFF', minHeight: 'calc(100vh - 65px)', position: 'relative' }}>
          <div className="fitness-screen-content" style={{ flex: 1 }}>
            {renderActiveScreen(currentTab)}
          </div>
          {currentTab !== 'onboarding' && currentTab !== 'workout-detail' && (
            <FitnessBottomNav
              currentTab={currentTab}
              onSelectTab={(tab) => setCurrentTab(tab)}
            />
          )}
        </div>
      )}

      {/* Global Log Food Bottom Sheet Modal */}
      {isLogFoodOpen && (
        <div className="fit-modal-backdrop" onClick={() => setIsLogFoodOpen(false)}>
          <div className="fit-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="fit-sheet-handle" />
            <h3 style={{ margin: '0 0 4px', fontFamily: 'var(--fit-font-heading)', fontSize: '1.25rem' }}>
              Log Meal or Snack
            </h3>
            <p style={{ margin: '0 0 18px', color: 'var(--fit-text-muted)', fontSize: '0.82rem' }}>
              Track what you eat to stay on target with your 2,000 kcal goal.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                setIsLogFoodOpen(false)
                setNotificationMsg(`✅ Logged ${newFoodName || 'Meal'} (${newFoodCals || '350'} kcal)!`)
                setTimeout(() => setNotificationMsg(''), 4000)
                setNewFoodName('')
                setNewFoodCals('')
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--fit-text-secondary)', display: 'block', marginBottom: 6 }}>
                  Meal Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Avocado Toast with Poached Egg"
                  value={newFoodName}
                  onChange={(e) => setNewFoodName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 14,
                    border: '1px solid rgba(0,0,0,0.08)',
                    background: 'var(--fit-card-subtle)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--fit-text-secondary)', display: 'block', marginBottom: 6 }}>
                  Estimated Calories (kcal)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 380"
                  value={newFoodCals}
                  onChange={(e) => setNewFoodCals(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 14,
                    border: '1px solid rgba(0,0,0,0.08)',
                    background: 'var(--fit-card-subtle)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: 999,
                    border: 'none',
                    background: 'var(--fit-card-subtle)',
                    color: 'var(--fit-text-secondary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  onClick={() => setIsLogFoodOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: 999,
                    border: 'none',
                    background: 'linear-gradient(135deg, var(--fit-peach) 0%, #F57250 100%)',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 8px 20px var(--fit-peach-glow)',
                  }}
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
