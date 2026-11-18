import { useState, useEffect, useCallback } from 'react'
import { fetchRegisteredCityGyms, POPULAR_CITIES } from '../lib/ranking'
import { fetchGymReviews } from '../lib/reviews'
import { getGymCoverImage } from '../lib/assets'
import Modal from './Modal'
import { Trophy, Star, Search, MapPin, Sparkles, Building2 } from 'lucide-react'

export default function CityRankings({ gym, onRefreshGym: _onRefreshGym }) {
  const defaultCity = gym?.city || 'Udaipur'
  const [selectedCity, setSelectedCity] = useState(defaultCity)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTab, setFilterTab] = useState('all') // 'all' | 'highest_rated' | 'most_reviewed'
  const [loading, setLoading] = useState(true)
  const [rankingData, setRankingData] = useState({
    city: defaultCity,
    total_registered: 0,
    my_rank: null,
    my_rank_display: 'Not Ranked Yet',
    gyms: [],
    ranked_gyms: [],
  })

  // Selected Gym for viewing member reviews modal
  const [reviewModalGym, setReviewModalGym] = useState(null)
  const [gymReviews, setGymReviews] = useState(null)
  const [loadingReviews, setLoadingReviews] = useState(false)

  // Load real registered gyms in selected city
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

  // Filter & Search Logic
  const allGyms = rankingData.gyms || []
  const filteredGyms = allGyms
    .filter((g) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        (g.gym_name || '').toLowerCase().includes(q) ||
        (g.pincode || '').includes(q) ||
        (g.area || '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      if (filterTab === 'highest_rated') {
        if (b.rating !== a.rating) return b.rating - a.rating
        return b.total_reviews - a.total_reviews
      }
      if (filterTab === 'most_reviewed') {
        if (b.total_reviews !== a.total_reviews) return b.total_reviews - a.total_reviews
        return b.rating - a.rating
      }
      // 'all' default: ranked gyms first (by rank), then unranked
      if (a.is_ranked && !b.is_ranked) return -1
      if (!a.is_ranked && b.is_ranked) return 1
      if (a.is_ranked && b.is_ranked) return (a.rank || 999) - (b.rank || 999)
      return (a.gym_name || '').localeCompare(b.gym_name || '')
    })

  // Logged-in Owner's Gym Resolution
  const myGym = allGyms.find((g) => g.is_my_gym) || {
    gym_name: gym?.gym_name || 'My Gym',
    city: gym?.city || defaultCity,
    state: gym?.state || 'Rajasthan',
    pincode: gym?.pincode || '',
    area: gym?.area || 'City Center',
    rating: (gym?.total_reviews > 0) ? (Number(gym.rating) || 0) : 0,
    total_reviews: Number(gym?.total_reviews) || 0,
    is_my_gym: true,
    is_ranked: Boolean(rankingData.my_rank),
    rank: rankingData.my_rank,
    rank_display: rankingData.my_rank_display || 'Not Ranked Yet',
  }

  const myHasReviews = (myGym.total_reviews || 0) > 0
  const topRanked = (rankingData.ranked_gyms || []).slice(0, 3)
  const firstPlace = topRanked[0]
  const secondPlace = topRanked[1]
  const thirdPlace = topRanked[2]

  return (
    <div className="gym-rankings-page" style={{ maxWidth: '1120px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ==============================================================
          1. CLEAN MODERN PAGE HEADER WITH CITY SELECTOR
      ============================================================== */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          paddingBottom: '4px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(20, 92, 67, 0.1)',
                color: '#145C43',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trophy size={20} strokeWidth={2.2} />
            </div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.4px' }}>
              Gym Rankings
            </h1>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
            Discover and compare registered gyms in your city.
          </p>
        </div>

        {/* City Selector Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--card)',
            padding: '8px 14px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          }}
        >
          <MapPin size={16} color="#145C43" />
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>City:</span>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            style={{
              background: 'transparent',
              color: 'var(--text)',
              border: 'none',
              fontWeight: 700,
              fontSize: '13.5px',
              cursor: 'pointer',
              outline: 'none',
              paddingRight: '4px',
            }}
          >
            {POPULAR_CITIES.map((c) => (
              <option key={c} value={c} style={{ background: 'var(--card)', color: 'var(--text)' }}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* ==============================================================
          2. TWO-COLUMN SAAS LEADERBOARD LAYOUT (DESKTOP / MOBILE STACK)
      ============================================================== */}
      <div
        className="rankings-layout-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.8fr) minmax(300px, 1fr)',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* ============================================================
            LEFT COLUMN: TOP PODIUM + LEADERBOARD LIST
        ============================================================ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* A. Top 3 Podium Visual Card (Inspired by Reference Screenshot) */}
          {topRanked.length > 0 ? (
            <div
              className="card podium-card"
              style={{
                borderRadius: '20px',
                padding: '24px 20px 20px',
                background: 'linear-gradient(145deg, #16241D 0%, #0F1A14 100%)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.18)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Subtle athletic grid backdrop */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0.05,
                  backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                  pointerEvents: 'none',
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="#D6B46A" />
                  <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#D6B46A' }}>
                    Top Rated Gyms in {selectedCity}
                  </span>
                </div>
                <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.12)', padding: '2px 8px', borderRadius: '6px' }}>
                  Verified Reviews
                </span>
              </div>

              {/* Podium Pillars Container */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-end',
                  gap: '14px',
                  minHeight: '200px',
                  paddingTop: '10px',
                }}
              >
                {/* 2nd Place Pillar (Left) */}
                {secondPlace ? (
                  <div
                    style={{
                      flex: '1',
                      maxWidth: '135px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                    }}
                  >
                    <img
                      src={getGymCoverImage(secondPlace.gym_id || secondPlace.gym_name)}
                      alt={secondPlace.gym_name}
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2.5px solid #E2E8F0',
                        marginBottom: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      }}
                    />
                    <b style={{ fontSize: '13px', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                      {secondPlace.gym_name}
                    </b>
                    <span style={{ fontSize: '11px', color: '#CBD5E1', margin: '2px 0 8px' }}>
                      ★ {secondPlace.rating.toFixed(1)} ({secondPlace.total_reviews})
                    </span>
                    <div
                      style={{
                        width: '100%',
                        height: '85px',
                        borderRadius: '12px 12px 4px 4px',
                        background: 'linear-gradient(180deg, #F472B6 0%, #DB2777 100%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        boxShadow: '0 4px 16px rgba(219, 39, 119, 0.3)',
                      }}
                    >
                      <span style={{ fontSize: '20px', fontWeight: 900 }}>2nd</span>
                      <span style={{ fontSize: '10px', opacity: 0.85 }}>{secondPlace.total_reviews} reviews</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: '1', maxWidth: '135px' }} />
                )}

                {/* 1st Place Pillar (Center, Tallest) */}
                {firstPlace && (
                  <div
                    style={{
                      flex: '1',
                      maxWidth: '145px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      zIndex: 2,
                    }}
                  >
                    <div style={{ position: 'relative', marginBottom: '8px' }}>
                      <span
                        style={{
                          position: 'absolute',
                          top: '-14px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          fontSize: '18px',
                        }}
                      >
                        👑
                      </span>
                      <img
                        src={getGymCoverImage(firstPlace.gym_id || firstPlace.gym_name)}
                        alt={firstPlace.gym_name}
                        style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '3px solid #D6B46A',
                          boxShadow: '0 6px 16px rgba(214, 180, 106, 0.45)',
                        }}
                      />
                    </div>
                    <b style={{ fontSize: '14px', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                      {firstPlace.gym_name}
                    </b>
                    <span style={{ fontSize: '11px', color: '#FDE047', fontWeight: 700, margin: '2px 0 8px' }}>
                      ★ {firstPlace.rating.toFixed(1)} ({firstPlace.total_reviews})
                    </span>
                    <div
                      style={{
                        width: '100%',
                        height: '115px',
                        borderRadius: '14px 14px 4px 4px',
                        background: 'linear-gradient(180deg, #FACC15 0%, #D6B46A 100%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#18231E',
                        boxShadow: '0 6px 20px rgba(214, 180, 106, 0.4)',
                      }}
                    >
                      <span style={{ fontSize: '24px', fontWeight: 900 }}>1st</span>
                      <span style={{ fontSize: '11px', fontWeight: 700 }}>{firstPlace.total_reviews} reviews</span>
                    </div>
                  </div>
                )}

                {/* 3rd Place Pillar (Right) */}
                {thirdPlace ? (
                  <div
                    style={{
                      flex: '1',
                      maxWidth: '135px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                    }}
                  >
                    <img
                      src={getGymCoverImage(thirdPlace.gym_id || thirdPlace.gym_name)}
                      alt={thirdPlace.gym_name}
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2.5px solid #C084FC',
                        marginBottom: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      }}
                    />
                    <b style={{ fontSize: '13px', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                      {thirdPlace.gym_name}
                    </b>
                    <span style={{ fontSize: '11px', color: '#CBD5E1', margin: '2px 0 8px' }}>
                      ★ {thirdPlace.rating.toFixed(1)} ({thirdPlace.total_reviews})
                    </span>
                    <div
                      style={{
                        width: '100%',
                        height: '70px',
                        borderRadius: '12px 12px 4px 4px',
                        background: 'linear-gradient(180deg, #A855F7 0%, #7E22CE 100%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        boxShadow: '0 4px 16px rgba(126, 34, 206, 0.3)',
                      }}
                    >
                      <span style={{ fontSize: '18px', fontWeight: 900 }}>3rd</span>
                      <span style={{ fontSize: '10px', opacity: 0.85 }}>{thirdPlace.total_reviews} reviews</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: '1', maxWidth: '135px' }} />
                )}
              </div>
            </div>
          ) : (
            /* Clean Motivation Card when no reviews yet in city */
            <div
              className="card"
              style={{
                borderRadius: '18px',
                padding: '22px 24px',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
              }}
            >
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '14px',
                  background: 'rgba(214, 180, 106, 0.15)',
                  color: '#D6B46A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trophy size={26} strokeWidth={2.2} />
              </div>
              <div>
                <b style={{ fontSize: '15px', color: 'var(--text)', display: 'block', marginBottom: '3px' }}>
                  City Podium Awaiting First Verified Member Reviews
                </b>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  Gyms in {selectedCity} are ranked based on verified member reviews. Have your members rate your gym to claim the <b>#1 Podium Spot</b>!
                </p>
              </div>
            </div>
          )}

          {/* B. Search & Filter Bar */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              {/* Search Box */}
              <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-secondary)',
                  }}
                />
                <input
                  type="text"
                  placeholder={`Search by gym name, area, or PIN code…`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)',
                  }}
                />
              </div>

              {/* Filter Tabs */}
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  background: 'var(--card)',
                  padding: '4px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setFilterTab('all')}
                  style={{
                    border: 'none',
                    background: filterTab === 'all' ? '#145C43' : 'transparent',
                    color: filterTab === 'all' ? '#FFFFFF' : 'var(--text-secondary)',
                    fontWeight: filterTab === 'all' ? 700 : 500,
                    fontSize: '12px',
                    padding: '6px 12px',
                    borderRadius: '7px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  All Gyms
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('highest_rated')}
                  style={{
                    border: 'none',
                    background: filterTab === 'highest_rated' ? '#145C43' : 'transparent',
                    color: filterTab === 'highest_rated' ? '#FFFFFF' : 'var(--text-secondary)',
                    fontWeight: filterTab === 'highest_rated' ? 700 : 500,
                    fontSize: '12px',
                    padding: '6px 12px',
                    borderRadius: '7px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Highest Rated
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('most_reviewed')}
                  style={{
                    border: 'none',
                    background: filterTab === 'most_reviewed' ? '#145C43' : 'transparent',
                    color: filterTab === 'most_reviewed' ? '#FFFFFF' : 'var(--text-secondary)',
                    fontWeight: filterTab === 'most_reviewed' ? 700 : 500,
                    fontSize: '12px',
                    padding: '6px 12px',
                    borderRadius: '7px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Most Reviewed
                </button>
              </div>
            </div>
          </div>

          {/* C. City Leaderboard List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {loading ? (
              <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>⏳</span>
                <span>Loading registered gyms in {selectedCity}…</span>
              </div>
            ) : filteredGyms.length === 0 ? (
              /* Clean Empty State as requested */
              <div
                className="card"
                style={{
                  padding: '48px 24px',
                  textAlign: 'center',
                  borderRadius: '20px',
                  background: 'var(--card)',
                  border: '1px dashed var(--border)',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'rgba(20, 92, 67, 0.08)',
                    color: '#145C43',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <Building2 size={32} />
                </div>
                <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>
                  Your City Leaderboard Is Just Getting Started
                </h3>
                <p style={{ maxWidth: '440px', margin: '0 auto 20px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  More gyms will appear here as gym owners join Gym Manager.
                </p>
                {selectedCity !== defaultCity && (
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => setSelectedCity(defaultCity)}
                    style={{ fontSize: '12px', padding: '7px 16px' }}
                  >
                    Back to {defaultCity}
                  </button>
                )}
              </div>
            ) : (
              filteredGyms.map((g) => {
                const isMine = g.is_my_gym
                const isRanked = g.is_ranked
                const rankNum = g.rank

                let rankBadgeBg = 'var(--card-subtle)'
                let rankBadgeColor = 'var(--text)'
                let rankBorder = '1px solid var(--border)'

                if (rankNum === 1) {
                  rankBadgeBg = 'rgba(214, 180, 106, 0.2)'
                  rankBadgeColor = '#92400E'
                  rankBorder = '1px solid #D6B46A'
                } else if (rankNum === 2) {
                  rankBadgeBg = 'rgba(226, 232, 240, 0.8)'
                  rankBadgeColor = '#334155'
                } else if (rankNum === 3) {
                  rankBadgeBg = 'rgba(205, 127, 50, 0.15)'
                  rankBadgeColor = '#9A3412'
                }

                return (
                  <div
                    key={g.gym_id || g.id || rankNum}
                    className="card leaderboard-row"
                    style={{
                      padding: '14px 18px',
                      borderRadius: '16px',
                      background: isMine ? 'rgba(20, 92, 67, 0.03)' : 'var(--card)',
                      border: isMine ? '2px solid #145C43' : '1px solid var(--border)',
                      boxShadow: isMine ? '0 4px 16px rgba(20, 92, 67, 0.08)' : '0 2px 6px rgba(0,0,0,0.02)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    {/* Left: Rank + Image + Gym Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '220px' }}>
                      {/* Rank Indicator */}
                      <div
                        style={{
                          minWidth: '38px',
                          height: '38px',
                          padding: '0 8px',
                          borderRadius: '10px',
                          background: isRanked ? rankBadgeBg : 'var(--card-subtle)',
                          color: isRanked ? rankBadgeColor : 'var(--text-secondary)',
                          border: isRanked ? rankBorder : '1px dashed var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: isRanked ? '14px' : '11px',
                          flexShrink: 0,
                          textAlign: 'center',
                        }}
                      >
                        {isRanked ? `#${rankNum}` : '—'}
                      </div>

                      {/* Gym Thumbnail */}
                      <img
                        src={getGymCoverImage(g.gym_id || g.gym_name)}
                        alt={g.gym_name}
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '10px',
                          objectFit: 'cover',
                          border: '1px solid var(--border)',
                          flexShrink: 0,
                        }}
                        loading="lazy"
                      />

                      {/* Gym Details */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <b style={{ fontSize: '15px', color: 'var(--text)' }}>
                            {g.gym_name}
                          </b>
                          {isMine && (
                            <span
                              style={{
                                background: '#145C43',
                                color: '#FFFFFF',
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '999px',
                              }}
                            >
                              Your Gym
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            📍 {g.area ? `${g.area}, ` : ''}{g.city} {g.pincode ? `(${g.pincode})` : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Rating & View Button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ textAlign: 'right' }}>
                        {g.has_reviews ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                            <Star size={14} fill="#F59E0B" color="#F59E0B" />
                            <b style={{ fontSize: '15px', color: 'var(--text)' }}>
                              {Number(g.rating).toFixed(1)}
                            </b>
                            <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                              ({g.total_reviews})
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            No reviews yet
                          </span>
                        )}
                        <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', display: 'block', marginTop: '1px' }}>
                          {g.has_reviews ? 'Verified Score' : 'Unranked'}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => handleViewReviews(g)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          borderRadius: '8px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        View Profile
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ============================================================
            RIGHT COLUMN: "MY GYM RANKING CARD" & CITY INFO
        ============================================================ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 3. My Gym Ranking Card (Dedicated SaaS Widget) */}
          <div
            className="card my-gym-card"
            style={{
              padding: '24px 20px',
              borderRadius: '20px',
              background: 'var(--card)',
              border: '1.5px solid var(--border)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  My Gym Overview
                </span>
                <h3 style={{ margin: '4px 0 2px', fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>
                  {myGym.gym_name}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  📍 {myGym.area || 'City Center'}, {selectedCity}
                </span>
              </div>

              <span
                style={{
                  background: myGym.is_ranked ? 'rgba(214, 180, 106, 0.15)' : 'var(--card-subtle)',
                  color: myGym.is_ranked ? '#92400E' : 'var(--text-secondary)',
                  border: myGym.is_ranked ? '1px solid #D6B46A' : '1px solid var(--border)',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: '999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {myGym.is_ranked ? `🏆 #${myGym.rank}` : 'Not Ranked Yet'}
              </span>
            </div>

            {/* Metrics Breakdown Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {/* Metric 1: Average Rating */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'var(--card-subtle)',
                  border: '1px solid var(--border)',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>Average Rating</span>
                {myHasReviews ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '4px' }}>
                    <Star size={16} fill="#F59E0B" color="#F59E0B" />
                    <b style={{ fontSize: '18px', color: 'var(--text)' }}>
                      {Number(myGym.rating).toFixed(1)}
                    </b>
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '6px' }}>
                    No reviews yet
                  </div>
                )}
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', opacity: 0.8, display: 'block', marginTop: '2px' }}>
                  {myHasReviews ? 'Out of 5.0' : '0 submissions'}
                </span>
              </div>

              {/* Metric 2: Total Verified Reviews */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'var(--card-subtle)',
                  border: '1px solid var(--border)',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>Verified Reviews</span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', marginTop: '4px' }}>
                  {myGym.total_reviews || 0}
                </div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', opacity: 0.8, display: 'block', marginTop: '2px' }}>
                  Member Feedback
                </span>
              </div>
            </div>

            {/* Explanatory Ranking Status Badge */}
            {!myHasReviews ? (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: 'rgba(214, 180, 106, 0.08)',
                  border: '1px solid rgba(214, 180, 106, 0.3)',
                  fontSize: '12px',
                  color: '#92400E',
                  lineHeight: 1.45,
                }}
              >
                <b>📌 Why Not Ranked Yet?</b>
                <p style={{ margin: '4px 0 0', opacity: 0.9 }}>
                  Gym Manager calculates rankings strictly from <b>verified member reviews</b>. Ask your active members to review your gym on the member app to claim your city rank!
                </p>
              </div>
            ) : (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: 'rgba(20, 92, 67, 0.06)',
                  border: '1px solid rgba(20, 92, 67, 0.2)',
                  fontSize: '12px',
                  color: '#145C43',
                  lineHeight: 1.45,
                }}
              >
                <b>✓ Active City Ranking</b>
                <p style={{ margin: '4px 0 0', opacity: 0.9 }}>
                  Aapka gym {selectedCity} leaderboard me <b>#{myGym.rank} position</b> par hai. High star ratings rank ko top position par maintain karti hain.
                </p>
              </div>
            )}

            {/* View My Reviews Button */}
            <button
              type="button"
              className="btn full"
              onClick={() => handleViewReviews(myGym)}
              style={{
                background: '#145C43',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '13px',
                padding: '10px',
                borderRadius: '10px',
              }}
            >
              ⭐ View My Member Reviews
            </button>
          </div>

          {/* 4. Ranking Guidelines & Integrity Note */}
          <div
            className="card"
            style={{
              padding: '20px',
              borderRadius: '18px',
              background: 'var(--card)',
              border: '1px solid var(--border)',
            }}
          >
            <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
              🏆 How City Rankings Work
            </h4>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: 1.45 }}>
              <li>
                <b>100% Genuine Reviews:</b> Only authenticated members connected through your 6-digit Gym Code can review.
              </li>
              <li>
                <b>Zero Artificial Ranks:</b> Gyms without review data are clearly marked as <i>"Not Ranked Yet"</i>.
              </li>
              <li>
                <b>Equal Standards:</b> All gym owners in {selectedCity} view the exact same verified city leaderboard.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ==============================================================
          3. GYM REVIEWS MODAL
      ============================================================== */}
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
                  color: '#F59E0B',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>★</span>
                <span>
                  {(gymReviews?.total_reviews || reviewModalGym.total_reviews) > 0
                    ? Number(gymReviews?.average_rating || reviewModalGym.rating || 0).toFixed(1)
                    : '—'}
                </span>
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
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                Loading verified member reviews…
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#F59E0B', fontSize: '12px' }}>
                        {'★'.repeat(r.rating || 5)}
                        {'☆'.repeat(5 - (r.rating || 5))}
                      </div>
                    </div>
                    {r.review_text && (
                      <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text)', lineHeight: 1.4 }}>
                        &ldquo;{r.review_text}&rdquo;
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <span>🏋️ Equip: {r.aspect_equipment || 5}★</span>
                      <span>🧼 Clean: {r.aspect_cleanliness || 5}★</span>
                      <span>🧑‍🏫 Trainer: {r.aspect_trainer || 5}★</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '13px' }}>
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
