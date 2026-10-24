import React from 'react'

export default function OnboardingScreen({ onGetStarted, onSkip }) {
  return (
    <div className="fit-screen-onboarding">
      <div className="fit-onboarding-top">
        <button
          type="button"
          className="fit-circle-ghost-btn"
          onClick={onSkip}
          aria-label="Back"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button type="button" className="fit-skip-btn" onClick={onSkip}>
          Skip
        </button>
      </div>

      <div className="fit-onboarding-hero">
        <div className="fit-onboarding-backdrop-blob" />
        <img
          src="/fitness/onboarding-hero.jpg"
          alt="Fitness Model"
          className="fit-onboarding-img"
          onError={(e) => {
            // fallback if path issues
            e.currentTarget.src = 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=700&q=80'
          }}
        />
      </div>

      <div className="fit-onboarding-text">
        <h1 className="fit-onboarding-title">
          Your Fitness<br />Journey<br />Starts Here
        </h1>
        <p className="fit-onboarding-desc">
          Track workouts, stay consistent and become your best self.
        </p>

        <button
          type="button"
          className="fit-onboarding-btn"
          onClick={onGetStarted}
        >
          <span>Get Started</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>

      <div className="fit-social-proof-card">
        <div className="fit-social-text">
          <span className="fit-social-label">Join Over</span>
          <span className="fit-social-val">2M+ Users</span>
        </div>
        <div className="fit-avatar-stack">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
            alt="User 1"
            className="fit-avatar"
          />
          <img
            src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=120&q=80"
            alt="User 2"
            className="fit-avatar"
          />
          <img
            src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80"
            alt="User 3"
            className="fit-avatar"
          />
          <div className="fit-avatar-plus">+</div>
        </div>
      </div>
    </div>
  )
}
