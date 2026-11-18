import { useState, useEffect, useCallback } from 'react'
import { fetchRegisteredCityGyms, POPULAR_CITIES } from '../lib/ranking'
import { fetchGymReviews } from '../lib/reviews'
import Modal from './Modal'

export default function CityRankings({ gym, onRefreshGym: _onRefreshGym }) {
  const defaultCity = gym?.city || 'Udaipur'
  const [selectedCity, setSelectedCity] = useState(defaultCity)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [rankingData, setRankingData] = useState({
    city: defaultCity,
    total_registered: 0,
    my_rank: 1,
    gyms: [],
  })

  // Selected Gym for viewing reviews
  const [reviewModalGym, setReviewModalGym] = useState(null)
  const [gymReviews, setGymReviews] = useState(null)
  const [loadingReviews, setLoadingReviews] = useState(false)

  // Load real registered gyms
  const loadRankings = useCallback(async (cityToLoad) => {
    setLoading(true)
    try {
      const res = await fetchRegisteredCityGyms(cityToLoad, gym?.id)
      if (res && res.success) {
        setRankingData(res)
      }
    } finally {
      setLoading(false)
    }
  }, [gym?.id])

  useEffect(() => {
    loadRankings(selectedCity)
  }, [selectedCity, loadRankings])

  // Open member reviews for a specific gym
  const handleViewReviews = async (targetGym) => {
    setReviewModalGym(targetGym)
    setLoadingReviews(true)
    try {
      const data = await fetchGymReviews(targetGym.gym_id || targetGym.id)
      setGymReviews(data)
    } finally {
      setLoadingReviews(false)
    }
  }

  // Filter gyms by search query (name or pincode or area)
  const filteredGyms = (rankingData.gyms || []).filter((g) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      (g.gym_name || '').toLowerCase().includes(q) ||
      (g.pincode || '').includes(q) ||
      (g.area || '').toLowerCase().includes(q)
    )
  })

  // Find owner's gym in list or fallback
  const myGymEntry = rankingData.gyms.find((g) => g.is_my_gym) || {
    rank: rankingData.my_rank || 1,
    gym_name: gym?.gym_name || 'Aapka Gym',
    city: gym?.city || defaultCity,
    state: gym?.state || 'Rajasthan',
    pincode: gym?.pincode || '',
    area: gym?.area || 'City Center',
    rating: gym?.rating || 5.0,
    total_reviews: gym?.total_reviews || 0,
    is_my_gym: true,
  }

  return (
    <div className="city-rankings-section" style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header Card with City & State */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)',
          color: '#FFFFFF',
          borderRadius: 'var(--radius-xl)',
          padding: '22px 24px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>🏆</span>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.3px' }}>
                City Gym Rankings & Leaderboard
              </h2>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '13px', opacity: 0.85, color: '#e2e8f0', maxWidth: '580px', lineHeight: 1.5 }}>
              Aapki city me registered sabhi gyms ki actual live rankings. Har gym ki ranking <b>Members ke Genuine Reviews & Star Ratings</b> ke aadhar par calculate hoti hai.
            </p>
          </div>

          {/* City Selector Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.1)', padding: '6px 12px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
            <span style={{ fontSize: '12px', opacity: 0.8 }}>City:</span>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              style={{
                background: 'transparent',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {POPULAR_CITIES.map((c) => (
                <option key={c} value={c} style={{ background: '#1e1b4b', color: '#FFFFFF' }}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 2. "Aapka Gym" Highlight Banner */}
        <div
          style={{
            marginTop: '20px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>RANK</span>
              <span style={{ fontSize: '20px', lineHeight: 1 }}>#{myGymEntry.rank || 1}</span>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <b style={{ fontSize: '16px', color: '#FFFFFF' }}>{gym?.gym_name || 'Aapka Gym'}</b>
                <span
                  style={{
                    background: '#10b981',
                    color: '#FFFFFF',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                  }}
                >
                  ⭐ Aapka Gym
                </span>
              </div>
              <span style={{ fontSize: '12px', opacity: 0.85, color: '#cbd5e1', display: 'block', marginTop: '3px' }}>
                📍 {gym?.area || 'City Center'}, {selectedCity} {gym?.pincode ? `· PIN ${gym.pincode}` : ''}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                <span style={{ color: '#fbbf24', fontSize: '14px' }}>★</span>
                <b style={{ fontSize: '16px', color: '#FFFFFF' }}>{Number(myGymEntry.rating || 5.0).toFixed(1)}</b>
                <span style={{ fontSize: '12px', opacity: 0.8, color: '#cbd5e1' }}>
                  ({myGymEntry.total_reviews || 0} Reviews)
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>
                Member Rating & Feedback
              </span>
            </div>

            <button
              type="button"
              className="btn sm"
              onClick={() => handleViewReviews(myGymEntry)}
              style={{
                background: '#FFFFFF',
                color: '#0f172a',
                border: 'none',
                fontWeight: 700,
                fontSize: '12px',
                padding: '8px 14px',
                borderRadius: '10px',
                whiteSpace: 'nowrap',
              }}
            >
              ⭐ View Reviews
            </button>
          </div>
        </div>
      </div>

      {/* 3. Search & Quick Filters Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <input
            type="text"
            placeholder={`Search registered gyms in ${selectedCity} by name or PIN code...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 36px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--card)',
              color: 'var(--text)',
              fontSize: '13px',
            }}
          />
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
            🔍
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              color: 'var(--muted)',
            }}
          >
            📊 {filteredGyms.length} Registered Gym{filteredGyms.length === 1 ? '' : 's'} in {selectedCity}
          </span>
        </div>
      </div>

      {/* 4. Systematic List of Registered Gyms */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {loading ? (
          <div className="card" style={{ padding: '36px', textAlign: 'center', color: 'var(--muted)' }}>
            <span style={{ fontSize: '20px', display: 'block', marginBottom: '8px' }}>⏳</span>
            <span>Loading registered gyms in {selectedCity}...</span>
          </div>
        ) : filteredGyms.length === 0 ? (
          <div
            className="card"
            style={{
              padding: '36px 24px',
              textAlign: 'center',
              borderRadius: 'var(--radius-xl)',
              background: 'var(--card)',
              border: '1px dashed var(--border)',
            }}
          >
            <span style={{ fontSize: '32px', display: 'block', marginBottom: '10px' }}>🏋️</span>
            <b style={{ fontSize: '16px', display: 'block', marginBottom: '6px' }}>
              {selectedCity} me abhi koi aur gym registered nahi hai
            </b>
            <p className="muted small" style={{ maxWidth: '480px', margin: '0 auto 16px' }}>
              Aapka gym <b>{gym?.gym_name}</b> {selectedCity} me successfully active hai. Jaise hi is city ke aur gym owners sign up karenge, wo sabhi live ranking leaderboard me show honge.
            </p>
            {selectedCity !== defaultCity && (
              <button
                type="button"
                className="btn sm"
                onClick={() => setSelectedCity(defaultCity)}
              >
                Back to {defaultCity}
              </button>
            )}
          </div>
        ) : (
          filteredGyms.map((g) => {
            const isMine = g.is_my_gym || g.gym_id === gym?.id
            const rankNum = g.rank || 1
            const medal = rankNum === 1 ? '🥇' : rankNum === 2 ? '🥈' : rankNum === 3 ? '🥉' : null

            return (
              <div
                key={g.gym_id || g.id || rankNum}
                className="card"
                style={{
                  padding: '16px 20px',
                  borderRadius: '16px',
                  background: isMine
                    ? 'var(--card-hover, var(--card))'
                    : 'var(--card)',
                  border: isMine
                    ? '2px solid var(--accent, #4f46e5)'
                    : '1px solid var(--border)',
                  boxShadow: isMine ? '0 4px 16px rgba(79, 70, 229, 0.12)' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '14px',
                  transition: 'transform 0.15s ease',
                }}
              >
                {/* Left: Rank & Gym Details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '220px' }}>
                  {/* Rank Badge */}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: rankNum === 1
                        ? '#fef3c7'
                        : rankNum === 2
                        ? '#f1f5f9'
                        : rankNum === 3
                        ? '#ffedd5'
                        : 'var(--card-hover)',
                      color: rankNum === 1
                        ? '#b45309'
                        : rankNum === 2
                        ? '#475569'
                        : rankNum === 3
                        ? '#c2410c'
                        : 'var(--text)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: rankNum <= 3 ? '18px' : '15px',
                      flexShrink: 0,
                    }}
                  >
                    {medal || `#${rankNum}`}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <b style={{ fontSize: '15px', color: 'var(--text)' }}>
                        {g.gym_name}
                      </b>
                      {isMine && (
                        <span
                          style={{
                            background: 'var(--accent, #4f46e5)',
                            color: '#FFFFFF',
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '999px',
                          }}
                        >
                          Aapka Gym
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                        📍 {g.area ? `${g.area}, ` : ''}{g.city} {g.pincode ? `(${g.pincode})` : ''}
                      </span>
                      {g.state && (
                        <span style={{ fontSize: '11px', color: 'var(--muted)', opacity: 0.8 }}>
                          · {g.state}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Real Member Rating & Reviews */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                      <span style={{ color: '#f59e0b', fontSize: '13px' }}>★</span>
                      <b style={{ fontSize: '15px' }}>{Number(g.rating || 5.0).toFixed(1)}</b>
                      <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                        ({g.total_reviews || 0} Reviews)
                      </span>
                    </div>
                    <span style={{ fontSize: '10.5px', color: 'var(--muted)', display: 'block' }}>
                      Member Decided Rank
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => handleViewReviews(g)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Reviews →
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 5. Systematic Ranking Explanation Card */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          borderRadius: '16px',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          display: 'flex',
          gap: '14px',
          alignItems: 'flex-start',
        }}
      >
        <span style={{ fontSize: '24px' }}>💡</span>
        <div>
          <b style={{ fontSize: '13.5px', display: 'block', marginBottom: '4px' }}>
            City Ranking Rule: How Rank is Decided
          </b>
          <p className="muted small" style={{ margin: 0, lineHeight: 1.5 }}>
            Yeh ranking 100% genuine hai. Member panel me members jo <b>1 se 5 star ratings aur written reviews</b> submit karte hain, wahi gym ki position decide karte hain. Jin gyms ko zyada 5-star verified reviews milte hain, wo city leaderboard me <b>#1 position</b> par rank hote hain.
          </p>
        </div>
      </div>

      {/* 6. Gym Member Reviews Modal */}
      {reviewModalGym && (
        <Modal
          title={`⭐ Reviews: ${reviewModalGym.gym_name}`}
          onClose={() => {
            setReviewModalGym(null)
            setGymReviews(null)
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header summary */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '14px 18px',
                borderRadius: '14px',
                background: 'var(--card-hover)',
              }}
            >
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 900,
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>★</span>
                <span>{Number(gymReviews?.average_rating || reviewModalGym.rating || 5.0).toFixed(1)}</span>
              </div>
              <div>
                <b style={{ fontSize: '14px', display: 'block' }}>
                  {gymReviews?.total_reviews || reviewModalGym.total_reviews || 0} Verified Member Reviews
                </b>
                <span className="muted small">
                  📍 {reviewModalGym.area || 'City Center'}, {reviewModalGym.city} {reviewModalGym.pincode ? `(${reviewModalGym.pincode})` : ''}
                </span>
              </div>
            </div>

            {/* Reviews List */}
            {loadingReviews ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>
                Loading verified member reviews...
              </div>
            ) : gymReviews?.reviews && gymReviews.reviews.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '380px', overflowY: 'auto' }}>
                {gymReviews.reviews.map((r, i) => (
                  <div
                    key={r.id || i}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <b style={{ fontSize: '13px' }}>{r.reviewer_name || 'Verified Member'}</b>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#f59e0b', fontSize: '12px' }}>
                        {'★'.repeat(r.rating || 5)}
                        {'☆'.repeat(5 - (r.rating || 5))}
                      </div>
                    </div>
                    {r.review_text && (
                      <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text)', lineHeight: 1.4 }}>
                        &ldquo;{r.review_text}&rdquo;
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '11px', color: 'var(--muted)' }}>
                      <span>🏋️ Equip: {r.aspect_equipment || 5}★</span>
                      <span>🧼 Clean: {r.aspect_cleanliness || 5}★</span>
                      <span>🧑‍🏫 Trainer: {r.aspect_trainer || 5}★</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)', fontSize: '13px' }}>
                Abhi is gym ke liye koi text review submit nahi hua hai. Members jab app se review denge, yahan live show honge.
              </div>
            )}

            <button
              type="button"
              className="btn block"
              onClick={() => {
                setReviewModalGym(null)
                setGymReviews(null)
              }}
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
