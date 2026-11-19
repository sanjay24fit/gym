import { useState, useEffect, useCallback } from 'react'
import { fetchRegisteredCityGyms, POPULAR_CITIES } from '../lib/ranking'
import { fetchGymReviews } from '../lib/reviews'
import { getGymCoverImage } from '../lib/assets'
import Modal from './Modal'
import {
  Trophy,
  Star,
  Search,
  MapPin,
  Sparkles,
  Building2,
  Phone,
  MessageSquare,
  Clock,
  ShieldCheck,
  Dumbbell,
  Share2,
  Check,
  ChevronRight,
} from 'lucide-react'

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

  // Selected Gym for viewing the Minimal Profile Modal
  const [selectedProfileGym, setSelectedProfileGym] = useState(null)
  const [gymReviews, setGymReviews] = useState(null)
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [copiedShare, setCopiedShare] = useState(false)

  // Load real registered gyms in selected city
  const loadRankings = useCallback(async (cityToLoad) => {
    setLoading(true)
    try {
      const res = await fetchRegisteredCityGyms(cityToLoad, gym?.id, gym)
      if (res && res.success) {
        setRankingData(res)
      }
    } finally {
      setLoading(false)
    }
  }, [gym])

  useEffect(() => {
    loadRankings(selectedCity)
  }, [selectedCity, loadRankings])

  // Open Minimal Gym Profile for any gym (clicked from podium or leaderboard)
  const handleOpenGymProfile = async (targetGym) => {
    if (!targetGym) return
    setSelectedProfileGym(targetGym)
    setLoadingReviews(true)
    setCopiedShare(false)
    try {
      const data = await fetchGymReviews(targetGym.gym_id || targetGym.id)
      setGymReviews(data)
    } finally {
      setLoadingReviews(false)
    }
  }

  // Handle Share / Copy Gym details
  const handleShareGym = (gymToShare) => {
    const text = `${gymToShare.gym_name} (Rank #${gymToShare.rank || 1} in ${gymToShare.city || selectedCity})\n📍 Location: ${gymToShare.area || 'City Center'}, ${gymToShare.city || selectedCity}\n⭐ Rating: ${gymToShare.has_reviews ? gymToShare.rating.toFixed(1) + '★' : 'New Gym'}\nVerified on Gym Manager`
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
      setCopiedShare(true)
      setTimeout(() => setCopiedShare(false), 2500)
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
        (g.area || '').toLowerCase().includes(q) ||
        (g.owner_name || '').toLowerCase().includes(q)
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
      // 'all' default: sorted by rank
      return (a.rank || 999) - (b.rank || 999)
    })

  // Logged-in Owner's Gym Resolution
  const myGym = allGyms.find((g) => g.is_my_gym) || {
    gym_name: gym?.gym_name || 'My Gym',
    owner_name: gym?.owner_name || '',
    phone: gym?.phone || '',
    city: gym?.city || defaultCity,
    state: gym?.state || 'Rajasthan',
    pincode: gym?.pincode || '',
    area: gym?.area || 'City Center',
    rating: (gym?.total_reviews > 0) ? (Number(gym.rating) || 0) : 0,
    total_reviews: Number(gym?.total_reviews) || 0,
    is_my_gym: true,
    is_ranked: Boolean(rankingData.my_rank),
    rank: rankingData.my_rank || 1,
    rank_display: rankingData.my_rank_display || '#1',
  }

  const myHasReviews = (myGym.total_reviews || 0) > 0
  const topRanked = allGyms.slice(0, 3)
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
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'rgba(20, 92, 67, 0.1)',
                color: '#145C43',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trophy size={22} strokeWidth={2.2} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.4px' }}>
                Gym Rankings Leaderboard
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Compare all registered fitness centers in {selectedCity}. Click any gym to view its profile & reviews.
              </p>
            </div>
          </div>
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
          gridTemplateColumns: 'minmax(0, 1.8fr) minmax(310px, 1fr)',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* ============================================================
            LEFT COLUMN: TOP PODIUM + LEADERBOARD LIST
        ============================================================ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* A. Top 3 Podium Visual Card (Interactive: Click any podium spot) */}
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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="#D6B46A" />
                  <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#D6B46A' }}>
                    Top Gyms in {selectedCity}
                  </span>
                </div>
                <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.12)', padding: '2px 8px', borderRadius: '6px' }}>
                  Click to inspect profile ↗
                </span>
              </div>

              {/* Podium Pillars Container */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-end',
                  gap: '14px',
                  minHeight: '210px',
                  paddingTop: '10px',
                }}
              >
                {/* 2nd Place Pillar (Left) */}
                {secondPlace ? (
                  <div
                    onClick={() => handleOpenGymProfile(secondPlace)}
                    role="button"
                    tabIndex={0}
                    style={{
                      flex: '1',
                      maxWidth: '135px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'transform 0.18s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    <img
                      src={getGymCoverImage(secondPlace.gym_id || secondPlace.gym_name)}
                      alt={secondPlace.gym_name}
                      style={{
                        width: '48px',
                        height: '48px',
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
                      {secondPlace.has_reviews ? `★ ${secondPlace.rating.toFixed(1)} (${secondPlace.total_reviews})` : 'New Gym'}
                    </span>
                    <div
                      style={{
                        width: '100%',
                        height: '90px',
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
                      <span style={{ fontSize: '10px', opacity: 0.9 }}>
                        {secondPlace.has_reviews ? `${secondPlace.total_reviews} reviews` : 'Top Rank'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: '1', maxWidth: '135px' }} />
                )}

                {/* 1st Place Pillar (Center, Tallest) */}
                {firstPlace && (
                  <div
                    onClick={() => handleOpenGymProfile(firstPlace)}
                    role="button"
                    tabIndex={0}
                    style={{
                      flex: '1',
                      maxWidth: '145px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      zIndex: 2,
                      cursor: 'pointer',
                      transition: 'transform 0.18s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    <div style={{ position: 'relative', marginBottom: '8px' }}>
                      <span
                        style={{
                          position: 'absolute',
                          top: '-15px',
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
                          width: '58px',
                          height: '58px',
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
                      {firstPlace.has_reviews ? `★ ${firstPlace.rating.toFixed(1)} (${firstPlace.total_reviews})` : '1st in City'}
                    </span>
                    <div
                      style={{
                        width: '100%',
                        height: '125px',
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
                      <span style={{ fontSize: '26px', fontWeight: 900 }}>1st</span>
                      <span style={{ fontSize: '11px', fontWeight: 700 }}>
                        {firstPlace.has_reviews ? `${firstPlace.total_reviews} reviews` : 'Champion'}
                      </span>
                    </div>
                  </div>
                )}

                {/* 3rd Place Pillar (Right) */}
                {thirdPlace ? (
                  <div
                    onClick={() => handleOpenGymProfile(thirdPlace)}
                    role="button"
                    tabIndex={0}
                    style={{
                      flex: '1',
                      maxWidth: '135px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'transform 0.18s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    <img
                      src={getGymCoverImage(thirdPlace.gym_id || thirdPlace.gym_name)}
                      alt={thirdPlace.gym_name}
                      style={{
                        width: '48px',
                        height: '48px',
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
                      {thirdPlace.has_reviews ? `★ ${thirdPlace.rating.toFixed(1)} (${thirdPlace.total_reviews})` : 'New Gym'}
                    </span>
                    <div
                      style={{
                        width: '100%',
                        height: '75px',
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
                      <span style={{ fontSize: '10px', opacity: 0.9 }}>
                        {thirdPlace.has_reviews ? `${thirdPlace.total_reviews} reviews` : 'Bronze'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: '1', maxWidth: '135px' }} />
                )}
              </div>
            </div>
          ) : (
            /* Clean Motivation Card when no gyms registered yet in selected city */
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
                  City Podium Awaiting Registered Gyms in {selectedCity}
                </b>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  Gyms in {selectedCity} are ranked based on verified member reviews and active presence. Be the first to claim the <b>#1 Podium Spot</b>!
                </p>
              </div>
            </div>
          )}

          {/* B. Search & Filter Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                  placeholder={`Search by gym name, area, owner, or PIN code…`}
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

          {/* C. City Leaderboard List (All gyms show their rank; clicking opens Minimal Profile) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {loading ? (
              <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>⏳</span>
                <span>Loading registered gyms in {selectedCity}…</span>
              </div>
            ) : filteredGyms.length === 0 ? (
              /* Clean Empty State */
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
                  More gyms will appear here as gym owners join Gym Manager in {selectedCity}.
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
                const rankNum = g.rank || 1

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
                    onClick={() => handleOpenGymProfile(g)}
                    role="button"
                    tabIndex={0}
                    style={{
                      padding: '14px 18px',
                      borderRadius: '16px',
                      background: isMine ? 'rgba(20, 92, 67, 0.04)' : 'var(--card)',
                      border: isMine ? '2px solid #145C43' : '1px solid var(--border)',
                      boxShadow: isMine ? '0 4px 16px rgba(20, 92, 67, 0.08)' : '0 2px 6px rgba(0,0,0,0.02)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.16s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.borderColor = '#145C43'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.borderColor = isMine ? '#145C43' : 'var(--border)'
                    }}
                  >
                    {/* Left: Rank Badge + Gym Photo Thumbnail + Name + Location */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '220px' }}>
                      {/* Rank Indicator */}
                      <div
                        style={{
                          minWidth: '40px',
                          height: '40px',
                          padding: '0 8px',
                          borderRadius: '10px',
                          background: rankBadgeBg,
                          color: rankBadgeColor,
                          border: rankBorder,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '14px',
                          flexShrink: 0,
                          textAlign: 'center',
                        }}
                      >
                        #{rankNum}
                      </div>

                      {/* Gym Thumbnail */}
                      <img
                        src={getGymCoverImage(g.gym_id || g.gym_name)}
                        alt={g.gym_name}
                        style={{
                          width: '46px',
                          height: '46px',
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
                          {g.owner_name && (
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.85 }}>
                              • {g.owner_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Rating & View Profile Button */}
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
                            New Gym (0 reviews)
                          </span>
                        )}
                        <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', display: 'block', marginTop: '1px' }}>
                          {g.has_reviews ? 'Verified Score' : 'Awaiting Reviews'}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="btn sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenGymProfile(g)
                        }}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          borderRadius: '8px',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>View Profile</span>
                        <ChevronRight size={14} />
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
                  background: 'rgba(214, 180, 106, 0.15)',
                  color: '#92400E',
                  border: '1px solid #D6B46A',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: '999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                🏆 #{myGym.rank || 1} in {selectedCity}
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
                    New Gym
                  </div>
                )}
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', opacity: 0.8, display: 'block', marginTop: '2px' }}>
                  {myHasReviews ? 'Out of 5.0' : '0 reviews yet'}
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

            {/* Status Note */}
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
                <b>📌 Claim the #1 Spot:</b>
                <p style={{ margin: '4px 0 0', opacity: 0.9 }}>
                  Gym Manager calculates rankings based on <b>verified member reviews</b>. Ask your active members to review your gym on the member app to rise to the top!
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
                  Aapka gym {selectedCity} leaderboard me <b>#{myGym.rank} position</b> par hai. High ratings rank ko maintain karti hain.
                </p>
              </div>
            )}

            {/* View My Gym Profile Button */}
            <button
              type="button"
              className="btn full"
              onClick={() => handleOpenGymProfile(myGym)}
              style={{
                background: '#145C43',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '13px',
                padding: '10px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span>⭐ View My Gym Profile</span>
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
                <b>All Gyms Ranked:</b> Every registered gym in {selectedCity} has a transparent rank on the leaderboard.
              </li>
              <li>
                <b>100% Genuine Reviews:</b> Only authenticated members connected through your unique 6-digit Gym Code can review.
              </li>
              <li>
                <b>Minimal Profile:</b> Click any gym on the podium or list to inspect its facilities, batch hours, location, and verified reviews.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ==============================================================
          3. COMPREHENSIVE MINIMAL GYM PROFILE MODAL
          Opens on clicking ANY gym (podium or leaderboard row)
      ============================================================== */}
      {selectedProfileGym && (
        <Modal
          title={`Gym Profile • ${selectedProfileGym.gym_name}`}
          onClose={() => {
            setSelectedProfileGym(null)
            setGymReviews(null)
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '520px', margin: '0 auto' }}>
            {/* A. Hero Banner with Image & Rank Badge */}
            <div
              style={{
                position: 'relative',
                borderRadius: '16px',
                overflow: 'hidden',
                height: '160px',
                background: '#16241D',
              }}
            >
              <img
                src={getGymCoverImage(selectedProfileGym.gym_id || selectedProfileGym.gym_name)}
                alt={selectedProfileGym.gym_name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: 0.85,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(15,26,20,0.92) 100%)',
                }}
              />

              {/* Rank Pill over Cover */}
              <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px' }}>
                <span
                  style={{
                    background: selectedProfileGym.rank === 1
                      ? 'linear-gradient(135deg, #FACC15, #D6B46A)'
                      : selectedProfileGym.rank === 2
                      ? 'linear-gradient(135deg, #E2E8F0, #94A3B8)'
                      : selectedProfileGym.rank === 3
                      ? 'linear-gradient(135deg, #F472B6, #DB2777)'
                      : '#145C43',
                    color: selectedProfileGym.rank === 1 ? '#18231E' : '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '11.5px',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  }}
                >
                  🏆 Rank #{selectedProfileGym.rank || 1} in {selectedProfileGym.city || selectedCity}
                </span>

                {selectedProfileGym.is_my_gym && (
                  <span
                    style={{
                      background: 'rgba(255, 255, 255, 0.25)',
                      backdropFilter: 'blur(4px)',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '11px',
                      padding: '4px 8px',
                      borderRadius: '999px',
                    }}
                  >
                    Your Gym
                  </span>
                )}
              </div>

              {/* Gym Name & Verified Platform Badge */}
              <div style={{ position: 'absolute', bottom: '14px', left: '14px', right: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.3px' }}>
                    {selectedProfileGym.gym_name}
                  </h2>
                  <ShieldCheck size={18} color="#35B982" />
                </div>
                <span style={{ fontSize: '11.5px', color: '#E2E8F0', opacity: 0.9 }}>
                  Verified Fitness Partner on Gym Manager
                </span>
              </div>
            </div>

            {/* B. Location & Management Bar */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '14px',
                background: 'var(--card-subtle)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <MapPin size={17} color="#145C43" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.4 }}>
                  <b>Location:</b> {selectedProfileGym.area || 'City Center'}, {selectedProfileGym.city || selectedCity}, {selectedProfileGym.state || 'Rajasthan'} {selectedProfileGym.pincode ? `(${selectedProfileGym.pincode})` : ''}
                </div>
              </div>

              {selectedProfileGym.owner_name && (
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', paddingLeft: '25px' }}>
                  <b>Owner / Manager:</b> {selectedProfileGym.owner_name}
                </div>
              )}
            </div>

            {/* C. Key Stats Row (Rank, Rating, Verified Reviews) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div
                style={{
                  padding: '12px 8px',
                  borderRadius: '12px',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', display: 'block' }}>City Rank</span>
                <b style={{ fontSize: '18px', color: '#145C43' }}>#{selectedProfileGym.rank || 1}</b>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block' }}>in {selectedProfileGym.city || selectedCity}</span>
              </div>

              <div
                style={{
                  padding: '12px 8px',
                  borderRadius: '12px',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', display: 'block' }}>Member Rating</span>
                <b style={{ fontSize: '18px', color: '#F59E0B' }}>
                  {selectedProfileGym.has_reviews ? `★ ${Number(selectedProfileGym.rating).toFixed(1)}` : '★ New'}
                </b>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block' }}>
                  {selectedProfileGym.has_reviews ? 'out of 5.0' : '0 reviews'}
                </span>
              </div>

              <div
                style={{
                  padding: '12px 8px',
                  borderRadius: '12px',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', display: 'block' }}>Verified Reviews</span>
                <b style={{ fontSize: '18px', color: 'var(--text)' }}>
                  {selectedProfileGym.total_reviews || 0}
                </b>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block' }}>real members</span>
              </div>
            </div>

            {/* D. Action Buttons: Direct Call & WhatsApp Contact & Share */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {selectedProfileGym.phone && (
                <>
                  <a
                    href={`tel:${selectedProfileGym.phone}`}
                    className="btn sm"
                    style={{
                      flex: '1',
                      minWidth: '120px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      background: 'var(--card)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    <Phone size={14} color="#145C43" />
                    <span>Call: {selectedProfileGym.phone}</span>
                  </a>

                  <a
                    href={`https://wa.me/91${selectedProfileGym.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi! I saw ${selectedProfileGym.gym_name} on Gym Manager.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn sm"
                    style={{
                      flex: '1',
                      minWidth: '130px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      background: '#25D366',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    <MessageSquare size={14} />
                    <span>WhatsApp Inquiry</span>
                  </a>
                </>
              )}

              <button
                type="button"
                className="btn sm"
                onClick={() => handleShareGym(selectedProfileGym)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--card)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {copiedShare ? <Check size={14} color="#35B982" /> : <Share2 size={14} />}
                <span>{copiedShare ? 'Copied!' : 'Share'}</span>
              </button>
            </div>

            {/* E. Facilities Checklist */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '14px',
                background: 'var(--card)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <Dumbbell size={16} color="#145C43" />
                <b style={{ fontSize: '13px', color: 'var(--text)' }}>Available Facilities & Training</b>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(selectedProfileGym.facilities && selectedProfileGym.facilities.length > 0
                  ? selectedProfileGym.facilities
                  : [
                      'Cardio Zone (Treadmill, Cycles)',
                      'Strength & Heavy Free Weights',
                      'Personal Training Coaches',
                      'CrossFit & Functional Rig',
                      'Steam Bath & Lockers',
                    ]
                ).map((fac, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: 'var(--card-subtle)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      fontSize: '11.5px',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontWeight: 500,
                    }}
                  >
                    ✓ {fac}
                  </span>
                ))}
              </div>
            </div>

            {/* F. Batch Timings */}
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '14px',
                background: 'var(--card-subtle)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <Clock size={18} color="#145C43" />
              <div style={{ fontSize: '12px', color: 'var(--text)', lineHeight: 1.4 }}>
                <b>Standard Batch Hours:</b> Morning 06:00 AM – 11:30 AM &nbsp;|&nbsp; Evening 04:00 PM – 10:00 PM (Mon–Sat)
              </div>
            </div>

            {/* G. Verified Member Reviews Section */}
            <div
              style={{
                padding: '16px',
                borderRadius: '16px',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b style={{ fontSize: '13.5px', color: 'var(--text)' }}>
                  ⭐ Genuine Member Reviews ({gymReviews?.total_reviews || selectedProfileGym.total_reviews || 0})
                </b>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Verified Active Members
                </span>
              </div>

              {loadingReviews ? (
                <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                  Loading genuine reviews…
                </div>
              ) : gymReviews?.reviews && gymReviews.reviews.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                  {gymReviews.reviews.map((r, i) => (
                    <div
                      key={r.id || i}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: 'var(--card-subtle)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                        <b style={{ fontSize: '12.5px' }}>{r.reviewer_name || 'Verified Member'}</b>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#F59E0B', fontSize: '12px' }}>
                          {'★'.repeat(r.rating || 5)}
                          {'☆'.repeat(5 - (r.rating || 5))}
                        </div>
                      </div>
                      {r.review_text && (
                        <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text)', lineHeight: 1.4 }}>
                          &ldquo;{r.review_text}&rdquo;
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                        <span>🏋️ Equip: {r.aspect_equipment || 5}★</span>
                        <span>🧼 Clean: {r.aspect_cleanliness || 5}★</span>
                        <span>🧑‍🏫 Trainer: {r.aspect_trainer || 5}★</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                  Abhi is gym ke liye koi text review submit nahi hua hai. Members apne app se review dekar ranking badha sakte hain.
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              className="btn full"
              onClick={() => {
                setSelectedProfileGym(null)
                setGymReviews(null)
              }}
              style={{
                padding: '10px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              Close Profile
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
