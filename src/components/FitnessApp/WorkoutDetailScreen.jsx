import React, { useState, useEffect } from 'react'

export default function WorkoutDetailScreen({ workout, onBack }) {
  const currentWorkout = workout || {
    id: 'full-body-strength',
    title: 'Full Body Strength',
    duration: '45 min',
    calories: '320 kcal',
    level: 'Intermediate',
    thumb: '/fitness/workout-strength.jpg',
  }

  const [activeSession, setActiveSession] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [completedExercises, setCompletedExercises] = useState({})

  const exercises = [
    {
      id: 'goblet-squat',
      name: 'Goblet Squat',
      reps: '4 Sets x 12 Reps',
      thumb: '/fitness/workout-strength.jpg',
    },
    {
      id: 'push-ups',
      name: 'Push Ups',
      reps: '4 Sets x 15 Reps',
      thumb: '/fitness/workout-hiit.jpg',
    },
    {
      id: 'bent-over-row',
      name: 'Bent Over Row',
      reps: '4 Sets x 12 Reps',
      thumb: '/fitness/workout-strength.jpg',
    },
    {
      id: 'plank-hold',
      name: 'Plank Hold',
      reps: '3 Sets x 45 Sec',
      thumb: '/fitness/workout-core.jpg',
    },
  ]

  useEffect(() => {
    let timer = null
    if (activeSession && !isPaused) {
      timer = setInterval(() => {
        setSeconds((s) => s + 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [activeSession, isPaused])

  const toggleExerciseCheck = (id) => {
    setCompletedExercises((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="fit-screen-detail">
      {/* Detail Navigation */}
      <div className="fit-detail-nav">
        <button
          type="button"
          className="fit-circle-ghost-btn"
          onClick={onBack}
          aria-label="Back to workouts"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="fit-detail-title">{currentWorkout.title}</span>
        <button
          type="button"
          className="fit-circle-ghost-btn"
          aria-label="More options"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="19" cy="12" r="1.5" />
            <circle cx="5" cy="12" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Hero Media Card */}
      <div className="fit-detail-hero-card">
        <img
          src={currentWorkout.thumb}
          alt={currentWorkout.title}
          className="fit-detail-hero-img"
        />
        <div className="fit-hero-overlay">
          <button
            type="button"
            className="fit-hero-play-btn"
            onClick={() => setActiveSession(true)}
            aria-label="Play video preview"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stats Triple Pill */}
      <div className="fit-detail-stats-row">
        <div className="fit-stat-pill-box">
          <span className="fit-stat-sub">Duration</span>
          <div className="fit-stat-val-bold">{currentWorkout.duration}</div>
        </div>
        <div className="fit-stat-pill-box">
          <span className="fit-stat-sub">Calories</span>
          <div className="fit-stat-val-bold">{currentWorkout.calories}</div>
        </div>
        <div className="fit-stat-pill-box">
          <span className="fit-stat-sub">Level</span>
          <div className="fit-stat-val-bold">{currentWorkout.level || 'Intermediate'}</div>
        </div>
      </div>

      {/* Exercises Section */}
      <div className="fit-quick-actions-section">
        <span className="fit-section-heading">Exercises</span>

        {exercises.map((ex) => {
          const isDone = completedExercises[ex.id]
          return (
            <div
              key={ex.id}
              className="fit-exercise-row"
              onClick={() => toggleExerciseCheck(ex.id)}
            >
              <div className="fit-exercise-left">
                <img src={ex.thumb} alt={ex.name} className="fit-exercise-mini-thumb" />
                <div className="fit-exercise-details">
                  <span className="fit-exercise-name" style={{ textDecoration: isDone ? 'line-through' : 'none', opacity: isDone ? 0.6 : 1 }}>
                    {ex.name}
                  </span>
                  <span className="fit-exercise-reps">{ex.reps}</span>
                </div>
              </div>

              <div
                className={`fit-meal-check-btn ${isDone ? 'done' : 'add'}`}
                style={{ width: 26, height: 26 }}
              >
                {isDone ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Sticky Bottom Action Button */}
      <button
        type="button"
        className="fit-sticky-start-btn"
        onClick={() => {
          setActiveSession(true)
          setSeconds(0)
          setIsPaused(false)
        }}
      >
        Start Workout
      </button>

      {/* Live Active Session Modal */}
      {activeSession && (
        <div className="fit-modal-backdrop" onClick={() => setActiveSession(false)}>
          <div className="fit-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="fit-sheet-handle" />
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  background: 'var(--fit-mint-light)',
                  color: 'var(--fit-mint-dark)',
                  borderRadius: 20,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--fit-mint)' }} />
                <span>ACTIVE WORKOUT</span>
              </div>
              <h3 style={{ margin: '0 0 4px', fontFamily: 'var(--fit-font-heading)', fontSize: '1.4rem' }}>
                {currentWorkout.title}
              </h3>
              <p style={{ margin: '0 0 20px', color: 'var(--fit-text-muted)', fontSize: '0.85rem' }}>
                Target: 320 kcal • 4 Exercises
              </p>

              {/* Running Timer */}
              <div
                style={{
                  fontFamily: 'var(--fit-font-heading)',
                  fontSize: '3.2rem',
                  fontWeight: 800,
                  color: 'var(--fit-text-main)',
                  letterSpacing: '-0.02em',
                  margin: '10px 0 24px',
                }}
              >
                {formatTimer(seconds)}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: 999,
                    border: 'none',
                    background: isPaused ? 'var(--fit-mint)' : 'var(--fit-card-subtle)',
                    color: isPaused ? '#fff' : 'var(--fit-text-main)',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  onClick={() => setIsPaused(!isPaused)}
                >
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: 999,
                    border: 'none',
                    background: 'linear-gradient(135deg, var(--fit-mint) 0%, #29A88E 100%)',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 8px 20px var(--fit-mint-glow)',
                  }}
                  onClick={() => setActiveSession(false)}
                >
                  Finish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
