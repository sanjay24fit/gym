import React, { useState } from 'react'

export default function WorkoutsScreen({ onSelectWorkout }) {
  const [activeCategory, setActiveCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const categories = ['All', 'Strength', 'Cardio', 'Yoga', 'HIIT']

  const workouts = [
    {
      id: 'full-body-strength',
      title: 'Full Body Strength',
      duration: '45 min',
      calories: '320 kcal',
      category: 'Strength',
      level: 'Intermediate',
      thumb: '/fitness/workout-strength.jpg',
    },
    {
      id: 'hiit-burn',
      title: 'HIIT Burn',
      duration: '25 min',
      calories: '300 kcal',
      category: 'HIIT',
      level: 'Advanced',
      thumb: '/fitness/workout-hiit.jpg',
    },
    {
      id: 'core-crusher',
      title: 'Core Crusher',
      duration: '20 min',
      calories: '180 kcal',
      category: 'Strength',
      level: 'Beginner',
      thumb: '/fitness/workout-core.jpg',
    },
  ]

  const filteredWorkouts = workouts.filter((w) => {
    const matchesCat = activeCategory === 'All' || w.category === activeCategory
    const matchesSearch = w.title.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCat && matchesSearch
  })

  return (
    <div className="fit-screen-workouts">
      {/* Header */}
      <div className="fit-workouts-header">
        <h2 className="fit-workouts-title">Workouts</h2>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--fit-text-secondary)" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Search Bar */}
      <div className="fit-search-container">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--fit-text-muted)" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          className="fit-search-input"
          placeholder="Search workouts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button type="button" className="fit-filter-icon-btn" aria-label="Filters">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="21" x2="4" y2="14" />
            <line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" />
            <line x1="9" y1="8" x2="15" y2="8" />
            <line x1="17" y1="16" x2="23" y2="16" />
          </svg>
        </button>
      </div>

      {/* Categories */}
      <div className="fit-category-scroll">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`fit-cat-pill ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Workout Cards */}
      <div className="fit-workouts-list">
        {filteredWorkouts.map((w) => (
          <div
            key={w.id}
            className="fit-workout-card"
            onClick={() => onSelectWorkout(w)}
            role="button"
            tabIndex={0}
          >
            <div className="fit-workout-card-left">
              <span className="fit-workout-card-title">{w.title}</span>
              <span className="fit-workout-tags">
                {w.duration} | {w.calories}
              </span>
              <button
                type="button"
                className="fit-workout-card-arrow-btn"
                aria-label={`Open ${w.title}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            <div className="fit-workout-card-thumb-wrapper">
              <img
                src={w.thumb}
                alt={w.title}
                className="fit-workout-card-thumb"
                onError={(e) => {
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=300&q=80'
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
