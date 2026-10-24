import React from 'react'

export default function FitnessBottomNav({ currentTab, onSelectTab }) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 10.5L12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5h-4a1 1 0 0 1-1-1v-5a1 1 0 0 0-1-1h-3a1 1 0 0 0-1 1v5a1 1 0 0 1-1 1h-4A1.5 1.5 0 0 1 3 20v-9.5z" />
        </svg>
      ),
    },
    {
      id: 'workouts',
      label: 'Workouts',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M6 5v14M18 5v14M2 9v6a1 1 0 0 0 1 1h3V8H3a1 1 0 0 0-1 1zm16-1h3a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-3V8zM6 12h12" />
        </svg>
      ),
    },
    {
      id: 'activity',
      label: 'Activity',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
    {
      id: 'nutrition',
      label: 'Nutrition',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 2a9 9 0 0 0-9 9c0 4.1 2.8 7.6 6.7 8.7L12 22l2.3-2.3C18.2 18.6 21 15.1 21 11a9 9 0 0 0-9-9z" />
          <path d="M12 7v5l3 2" />
        </svg>
      ),
    },
  ]

  return (
    <nav className="fit-bottom-dock" aria-label="Fitness Navigation">
      {navItems.map((item) => {
        const isActive = currentTab === item.id || (item.id === 'workouts' && currentTab === 'workout-detail')
        return (
          <button
            key={item.id}
            type="button"
            className={`fit-dock-item ${isActive ? 'active' : ''}`}
            onClick={() => onSelectTab(item.id)}
            aria-label={item.label}
          >
            {item.icon}
          </button>
        )
      })}
    </nav>
  )
}
