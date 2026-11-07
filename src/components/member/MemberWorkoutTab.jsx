import { useState } from 'react'
import { calculateBmi, getBmiCategory, getWaterIntakeToday, setWaterIntakeToday } from '../../lib/memberPortal'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function MemberWorkoutTab({ workouts = [], diet = null, member: _member }) {
  const [subTab, setSubTab] = useState('workout') // 'workout' | 'diet' | 'tools'

  // Today's Day Name
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const todayName = dayNames[new Date().getDay()]

  const [selectedDay, setSelectedDay] = useState(todayName)

  // Interactive Tools State
  const [heightCm, setHeightCm] = useState('172')
  const [weightKg, setWeightKg] = useState('70')
  const bmiScore = calculateBmi(weightKg, heightCm)
  const bmiCategory = getBmiCategory(bmiScore)

  const [waterGlasses, setWaterGlasses] = useState(() => getWaterIntakeToday())

  const handleWaterToggle = (idx) => {
    const nextVal = idx + 1 === waterGlasses ? idx : idx + 1
    setWaterGlasses(nextVal)
    setWaterIntakeToday(nextVal)
  }

  // Find workout for selected day
  const currentWorkout = workouts.find((w) => w.day?.toLowerCase() === selectedDay.toLowerCase())

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* ==============================================================
          A. SUB-MODULE SWITCHER
      ============================================================== */}
      <div
        className="tabs"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          padding: '4px',
          background: 'var(--card)',
          borderRadius: '14px',
          border: '1px solid var(--border)',
          margin: 0,
        }}
      >
        <button
          type="button"
          className={subTab === 'workout' ? 'active' : ''}
          onClick={() => setSubTab('workout')}
          style={{ fontSize: '13px', padding: '8px', borderRadius: '10px' }}
        >
          🏋️ Workout
        </button>
        <button
          type="button"
          className={subTab === 'diet' ? 'active' : ''}
          onClick={() => setSubTab('diet')}
          style={{ fontSize: '13px', padding: '8px', borderRadius: '10px' }}
        >
          🥗 Diet Plan
        </button>
        <button
          type="button"
          className={subTab === 'tools' ? 'active' : ''}
          onClick={() => setSubTab('tools')}
          style={{ fontSize: '13px', padding: '8px', borderRadius: '10px' }}
        >
          ⚡ Fitness Tools
        </button>
      </div>

      {/* ==============================================================
          TAB 1: WORKOUT SCHEDULE
      ============================================================== */}
      {subTab === 'workout' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Day Selector Chips */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              paddingBottom: '4px',
              scrollbarWidth: 'none',
            }}
          >
            {DAYS.map((d) => {
              const isToday = d.toLowerCase() === todayName.toLowerCase()
              const isSelected = d.toLowerCase() === selectedDay.toLowerCase()

              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDay(d)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '12px',
                    border: isSelected ? '1.5px solid var(--accent, #4f46e5)' : '1px solid var(--border)',
                    background: isSelected ? 'var(--accent, #4f46e5)' : isToday ? 'rgba(79, 70, 229, 0.1)' : 'var(--card)',
                    color: isSelected ? '#FFFFFF' : 'var(--text)',
                    fontSize: '12px',
                    fontWeight: isSelected || isToday ? 800 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  <span>{d.slice(0, 3)}</span>
                  {isToday && (
                    <span style={{ fontSize: '9px', opacity: 0.85, textTransform: 'uppercase' }}>
                      Today
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Active Workout Card */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <span className="badge purple" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  {selectedDay} Schedule
                </span>
                <h3 style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 800 }}>
                  {currentWorkout?.title || (selectedDay === 'Sunday' ? 'Active Rest & Recovery' : 'Standard Routine')}
                </h3>
              </div>

              {selectedDay.toLowerCase() === todayName.toLowerCase() && (
                <span className="badge green" style={{ fontSize: '11px', padding: '3px 8px' }}>
                  ★ Today's Focus
                </span>
              )}
            </div>

            {currentWorkout?.notes && (
              <div className="alert info small" style={{ marginBottom: '14px', padding: '8px 12px' }}>
                <b>Coach Notes:</b> {currentWorkout.notes}
              </div>
            )}

            {/* Exercise List */}
            {currentWorkout?.exercises && Array.isArray(currentWorkout.exercises) && currentWorkout.exercises.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {currentWorkout.exercises.map((ex, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: 'var(--bg-subtle, rgba(0,0,0,0.02))',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <b style={{ fontSize: '14px' }}>{ex.name || ex}</b>
                      {ex.muscle && <span className="muted xs block">{ex.muscle}</span>}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {ex.sets && (
                        <span className="badge blue" style={{ fontSize: '11px' }}>
                          {ex.sets} Sets
                        </span>
                      )}
                      {ex.reps && (
                        <span className="badge amber" style={{ fontSize: '11px' }}>
                          {ex.reps} Reps
                        </span>
                      )}
                      {ex.rest && (
                        <span className="muted xs">⏱️ {ex.rest}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : selectedDay === 'Sunday' ? (
              <div className="empty" style={{ padding: '24px 16px', textAlign: 'center' }}>
                <span style={{ fontSize: '32px' }}>🛌</span>
                <p style={{ margin: '8px 0 2px', fontWeight: 700 }}>Rest & Muscle Recovery</p>
                <span className="muted small">Hydrate well, eat high protein meals, and allow muscles to recover.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Fallback canonical exercises if no custom plan assigned */}
                <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                  <b style={{ fontSize: '13px' }}>Primary Compound Lift</b>
                  <span className="muted small block">3 - 4 Warmup & Working Sets · 8 - 12 Repetitions</span>
                </div>
                <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                  <b style={{ fontSize: '13px' }}>Accessory Hypertrophy Exercises</b>
                  <span className="muted small block">3 Sets · 10 - 15 Reps · Rest 60-90s</span>
                </div>
                <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                  <b style={{ fontSize: '13px' }}>Finisher & Core Conditioning</b>
                  <span className="muted small block">Planks, stretching, or 15m cardio</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==============================================================
          TAB 2: DIET & NUTRITION
      ============================================================== */}
      {subTab === 'diet' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Daily Nutrition Targets */}
          <div className="card">
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 800 }}>
              Daily Nutrition Targets
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: '12px', textAlign: 'center' }}>
                <span className="muted xs block">Protein Goal</span>
                <b style={{ fontSize: '17px', color: 'var(--accent)' }}>
                  {diet?.protein_target_g || 120}g
                </b>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: '12px', textAlign: 'center' }}>
                <span className="muted xs block">Water Intake</span>
                <b style={{ fontSize: '17px', color: '#0284c7' }}>
                  {diet?.water_target_l || 3.0}L
                </b>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: '12px', textAlign: 'center' }}>
                <span className="muted xs block">Calories Target</span>
                <b style={{ fontSize: '17px', color: '#d97706' }}>
                  {diet?.calories_target || 2100}
                </b>
              </div>
            </div>
          </div>

          {/* Meals Breakdown Card */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                {diet?.title || 'Daily Meal Plan'}
              </h3>
              <span className="badge green" style={{ fontSize: '10.5px' }}>Trainer Approved</span>
            </div>

            {diet?.trainer_notes && (
              <div className="alert info small" style={{ marginBottom: '14px', padding: '8px 12px' }}>
                <b>Nutrition Tip:</b> {diet.trainer_notes}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <b style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🌅</span> Breakfast (08:00 AM)
                </b>
                <span className="small block" style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>
                  {diet?.meals?.breakfast || 'Oats with milk, 3-4 boiled eggs or paneer, and 1 banana.'}
                </span>
              </div>

              <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <b style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>☀️</span> Lunch (01:00 PM)
                </b>
                <span className="small block" style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>
                  {diet?.meals?.lunch || '2 Roti, brown rice, dal, chicken breast or paneer, green salad and curd.'}
                </span>
              </div>

              <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <b style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>☕</span> Pre-Workout / Snack (05:00 PM)
                </b>
                <span className="small block" style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>
                  {diet?.meals?.snacks || 'Black coffee, peanut butter toast or 1 apple with almonds.'}
                </span>
              </div>

              <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <b style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🌙</span> Dinner (08:30 PM)
                </b>
                <span className="small block" style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>
                  {diet?.meals?.dinner || 'Light meal: 2 Roti, mixed vegetables, grilled chicken/paneer, soup.'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          TAB 3: FITNESS TOOLS (BMI & WATER)
      ============================================================== */}
      {subTab === 'tools' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Interactive BMI Calculator */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>BMI Calculator</h3>
                <span className="muted xs">Body Mass Index & weight status</span>
              </div>
              {bmiScore && (
                <span className={`badge ${bmiCategory?.tone || 'blue'}`} style={{ fontSize: '13px', fontWeight: 800, padding: '4px 10px' }}>
                  BMI: {bmiScore}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <label style={{ margin: 0 }}>
                <span className="xs muted">Height (cm)</span>
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="172"
                  style={{ marginTop: '4px' }}
                />
              </label>
              <label style={{ margin: 0 }}>
                <span className="xs muted">Weight (kg)</span>
                <input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="70"
                  style={{ marginTop: '4px' }}
                />
              </label>
            </div>

            {bmiScore && (
              <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                <b>Category: {bmiCategory?.label}</b>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  💡 {bmiCategory?.tip}
                </p>
              </div>
            )}
          </div>

          {/* Daily 8-Glass Water Tracker */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Daily Water Goal</h3>
                <span className="muted xs">Target: 8 glasses (~2 Litres) per day</span>
              </div>
              <span className="badge blue" style={{ fontSize: '12px', padding: '3px 8px' }}>
                {waterGlasses} / 8 Glasses
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '6px', margin: '12px 0' }}>
              {Array.from({ length: 8 }).map((_, idx) => {
                const filled = idx < waterGlasses
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleWaterToggle(idx)}
                    title={`Log glass ${idx + 1}`}
                    style={{
                      padding: '10px 2px',
                      borderRadius: '10px',
                      border: filled ? '2px solid #0284c7' : '1px dashed var(--border)',
                      background: filled ? 'rgba(2, 132, 199, 0.15)' : 'var(--bg-subtle)',
                      fontSize: '18px',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    {filled ? '💧' : '🥛'}
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)' }}>
              <span>{waterGlasses >= 8 ? '🎉 Hydration Goal Complete!' : 'Tap a glass to mark completed'}</span>
              {waterGlasses > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setWaterGlasses(0)
                    setWaterIntakeToday(0)
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '11px' }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
