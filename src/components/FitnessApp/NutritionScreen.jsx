import React, { useState } from 'react'

export default function NutritionScreen({ onOpenLogModal }) {
  const [meals, setMeals] = useState([
    {
      id: 'breakfast',
      type: 'Breakfast',
      name: 'Oatmeal with Fruits',
      calories: 450,
      completed: true,
      thumb: '/fitness/meal-oatmeal.jpg',
    },
    {
      id: 'lunch',
      type: 'Lunch',
      name: 'Grilled Chicken Salad',
      calories: 550,
      completed: true,
      thumb: '/fitness/meal-salad.jpg',
    },
    {
      id: 'dinner',
      type: 'Dinner',
      name: 'Salmon with Veggies',
      calories: 450,
      completed: false,
      thumb: '/fitness/meal-salmon.jpg',
    },
    {
      id: 'snacks',
      type: 'Snacks',
      name: 'Greek Yogurt & Honey',
      calories: 150,
      completed: false,
      thumb: '/fitness/meal-oatmeal.jpg',
    },
  ])

  const toggleMealComplete = (id) => {
    setMeals((prev) =>
      prev.map((m) => (m.id === id ? { ...m, completed: !m.completed } : m))
    )
  }

  // Calculate current consumed calories from completed meals
  const totalCalories = meals.reduce((sum, m) => sum + (m.completed ? m.calories : 0), 450)
  const targetCalories = 2000
  const calPercent = Math.min(100, Math.round((totalCalories / targetCalories) * 100))

  return (
    <div className="fit-screen-nutrition">
      {/* Header */}
      <div className="fit-detail-nav">
        <button type="button" className="fit-circle-ghost-btn" aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="fit-detail-title">Nutrition</span>
        <button type="button" className="fit-circle-ghost-btn" aria-label="More options">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="19" cy="12" r="1.5" />
            <circle cx="5" cy="12" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Card: Calorie Goal */}
      <div className="fit-calorie-goal-card">
        <span className="fit-social-label">Calorie Goal</span>
        <div className="fit-cal-goal-top">
          <span className="fit-cal-goal-big">
            {targetCalories.toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>kcal</span>
          </span>
          <span className="fit-cal-sub-count">
            {totalCalories.toLocaleString()} / {targetCalories.toLocaleString()}
          </span>
        </div>

        <div className="fit-cal-bar-track">
          <div
            className="fit-cal-bar-fill"
            style={{ width: `${calPercent}%`, transition: 'width 0.4s ease' }}
          />
        </div>
      </div>

      {/* Macro 3-Columns Grid */}
      <div className="fit-macro-grid">
        <div className="fit-macro-card">
          <span className="fit-macro-name">Carbs</span>
          <span className="fit-macro-grams">180g</span>
          <span className="fit-macro-circle-pct">45%</span>
        </div>

        <div className="fit-macro-card">
          <span className="fit-macro-name">Protein</span>
          <span className="fit-macro-grams">120g</span>
          <span className="fit-macro-circle-pct" style={{ color: 'var(--fit-mint-dark)', background: 'var(--fit-mint-light)' }}>
            30%
          </span>
        </div>

        <div className="fit-macro-card">
          <span className="fit-macro-name">Fats</span>
          <span className="fit-macro-grams">60g</span>
          <span className="fit-macro-circle-pct" style={{ color: '#5B93E3', background: '#EDF4FD' }}>
            25%
          </span>
        </div>
      </div>

      {/* Today's Meals Section */}
      <div className="fit-quick-actions-section">
        <span className="fit-section-heading">Today's Meals</span>

        {meals.map((meal) => (
          <div key={meal.id} className="fit-meal-row">
            <div className="fit-meal-left">
              <img src={meal.thumb} alt={meal.name} className="fit-meal-thumb" />
              <div className="fit-meal-info">
                <span className="fit-meal-type">{meal.type}</span>
                <span className="fit-meal-dish">{meal.name}</span>
                <span className="fit-meal-cals">{meal.calories} kcal</span>
              </div>
            </div>

            <button
              type="button"
              className={`fit-meal-check-btn ${meal.completed ? 'done' : 'add'}`}
              onClick={() => toggleMealComplete(meal.id)}
              aria-label={meal.completed ? 'Mark unlogged' : 'Log this meal'}
            >
              {meal.completed ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Sticky Log Food Button */}
      <button
        type="button"
        className="fit-sticky-log-btn"
        onClick={onOpenLogModal}
      >
        Log Food
      </button>
    </div>
  )
}
