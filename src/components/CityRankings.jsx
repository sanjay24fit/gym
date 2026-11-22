import { useState, useEffect, useCallback } from 'react'
import { fetchRegisteredCityGyms, POPULAR_CITIES } from '../lib/ranking'
import { fetchGymReviews } from '../lib/reviews'
import { GYM_IMAGES, getGymCoverImage } from '../lib/assets'
import Modal from './Modal'
import {
  Trophy,
  Star,
  Search,
  MapPin,
  Building2,
  Phone,
  MessageSquare,
  Clock,
  ShieldCheck,
  Dumbbell,
  Share2,
  Check,
  BarChart3,
  Lightbulb,
  Megaphone,
  CheckCircle2,
  ArrowRight,
  Crown,
} from 'lucide-react'

// Scalloped Rosette Seal Medal for Ranks 1, 2, 3
function ScallopedSeal({ rank }) {
  if (rank === 1) {
    return (
      <div style={{ position: 'relative', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="44" height="44" viewBox="0 0 48 48" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <linearGradient id="goldSealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
            <filter id="sealShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#B45309" floodOpacity="0.35" />
            </filter>
          </defs>
          <path
            d="M24 2.5 L27.5 7 L32.5 5.5 L34.5 10.5 L39.8 11 L39.8 16.5 L44.5 19 L42.5 24 L44.5 29 L39.8 31.5 L39.8 37 L34.5 37.5 L32.5 42.5 L27.5 41 L24 45.5 L20.5 41 L15.5 42.5 L13.5 37.5 L8.2 37 L8.2 31.5 L3.5 29 L5.5 24 L3.5 19 L8.2 16.5 L8.2 11 L13.5 10.5 L15.5 5.5 L20.5 7 Z"
            fill="url(#goldSealGrad)"
            stroke="#FDE047"
            strokeWidth="1.2"
            strokeLinejoin="round"
            filter="url(#sealShadow)"
          />
        </svg>
        <span style={{ position: 'relative', zIndex: 1, fontWeight: 900, fontSize: '15px', color: '#451A03' }}>
          #1
        </span>
      </div>
    )
  }
  if (rank === 2) {
    return (
      <div style={{ position: 'relative', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="44" height="44" viewBox="0 0 48 48" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <linearGradient id="silverSealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="60%" stopColor="#CBD5E1" />
              <stop offset="100%" stopColor="#94A3B8" />
            </linearGradient>
            <filter id="silverShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#64748B" floodOpacity="0.25" />
            </filter>
          </defs>
          <path
            d="M24 2.5 L27.5 7 L32.5 5.5 L34.5 10.5 L39.8 11 L39.8 16.5 L44.5 19 L42.5 24 L44.5 29 L39.8 31.5 L39.8 37 L34.5 37.5 L32.5 42.5 L27.5 41 L24 45.5 L20.5 41 L15.5 42.5 L13.5 37.5 L8.2 37 L8.2 31.5 L3.5 29 L5.5 24 L3.5 19 L8.2 16.5 L8.2 11 L13.5 10.5 L15.5 5.5 L20.5 7 Z"
            fill="url(#silverSealGrad)"
            stroke="#E2E8F0"
            strokeWidth="1.2"
            strokeLinejoin="round"
            filter="url(#silverShadow)"
          />
        </svg>
        <span style={{ position: 'relative', zIndex: 1, fontWeight: 900, fontSize: '15px', color: '#1E293B' }}>
          #2
        </span>
      </div>
    )
  }
  if (rank === 3) {
    return (
      <div style={{ position: 'relative', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="44" height="44" viewBox="0 0 48 48" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <linearGradient id="bronzeSealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FED7AA" />
              <stop offset="60%" stopColor="#EA580C" />
              <stop offset="100%" stopColor="#9A3412" />
            </linearGradient>
            <filter id="bronzeShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#9A3412" floodOpacity="0.3" />
            </filter>
          </defs>
          <path
            d="M24 2.5 L27.5 7 L32.5 5.5 L34.5 10.5 L39.8 11 L39.8 16.5 L44.5 19 L42.5 24 L44.5 29 L39.8 31.5 L39.8 37 L34.5 37.5 L32.5 42.5 L27.5 41 L24 45.5 L20.5 41 L15.5 42.5 L13.5 37.5 L8.2 37 L8.2 31.5 L3.5 29 L5.5 24 L3.5 19 L8.2 16.5 L8.2 11 L13.5 10.5 L15.5 5.5 L20.5 7 Z"
            fill="url(#bronzeSealGrad)"
            stroke="#FDBA74"
            strokeWidth="1.2"
            strokeLinejoin="round"
            filter="url(#bronzeShadow)"
          />
        </svg>
        <span style={{ position: 'relative', zIndex: 1, fontWeight: 900, fontSize: '15px', color: '#431407' }}>
          #3
        </span>
      </div>
    )
  }
  return (
    <div
      style={{
        width: '42px',
        height: '42px',
        borderRadius: '12px',
        background: 'var(--card-subtle)',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: '14px',
        color: 'var(--text-secondary)',
        flexShrink: 0,
      }}
    >
      #{rank}
    </div>
  )
}

// Laurel Branches flanking the 3D Champion Pedestal
function LaurelLeft() {
  return (
    <svg width="46" height="96" viewBox="0 0 46 96" fill="none" style={{ position: 'absolute', left: '-36px', bottom: '2px', pointerEvents: 'none', filter: 'drop-shadow(0 2px 8px rgba(234, 179, 8, 0.45))' }}>
      <path d="M40 92 C28 78 14 54 18 16" stroke="#FACC15" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M18 16 C15 11 21 5 25 9 C25 13 21 16 18 16 Z" fill="#FDE047" />
      <path d="M17 27 C11 24 12 17 17 19 C20 22 19 27 17 27 Z" fill="#FACC15" />
      <path d="M24 31 C29 28 32 33 28 36 C25 37 22 34 24 31 Z" fill="#EAB308" />
      <path d="M16 43 C9 41 9 33 14 34 C18 37 17 42 16 43 Z" fill="#FACC15" />
      <path d="M24 47 C30 45 32 51 27 54 C24 55 21 51 24 47 Z" fill="#EAB308" />
      <path d="M18 59 C11 58 10 50 16 50 C20 53 19 58 18 59 Z" fill="#FACC15" />
      <path d="M26 64 C32 63 33 69 28 72 C25 73 23 68 26 64 Z" fill="#EAB308" />
      <path d="M22 76 C16 76 15 69 20 68 C24 70 23 75 22 76 Z" fill="#FACC15" />
      <path d="M31 80 C37 80 37 86 32 88 C29 89 28 84 31 80 Z" fill="#EAB308" />
    </svg>
  )
}

function LaurelRight() {
  return (
    <svg width="46" height="96" viewBox="0 0 46 96" fill="none" style={{ position: 'absolute', right: '-36px', bottom: '2px', pointerEvents: 'none', transform: 'scaleX(-1)', filter: 'drop-shadow(0 2px 8px rgba(234, 179, 8, 0.45))' }}>
      <path d="M40 92 C28 78 14 54 18 16" stroke="#FACC15" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M18 16 C15 11 21 5 25 9 C25 13 21 16 18 16 Z" fill="#FDE047" />
      <path d="M17 27 C11 24 12 17 17 19 C20 22 19 27 17 27 Z" fill="#FACC15" />
      <path d="M24 31 C29 28 32 33 28 36 C25 37 22 34 24 31 Z" fill="#EAB308" />
      <path d="M16 43 C9 41 9 33 14 34 C18 37 17 42 16 43 Z" fill="#FACC15" />
      <path d="M24 47 C30 45 32 51 27 54 C24 55 21 51 24 47 Z" fill="#EAB308" />
      <path d="M18 59 C11 58 10 50 16 50 C20 53 19 58 18 59 Z" fill="#FACC15" />
      <path d="M26 64 C32 63 33 69 28 72 C25 73 23 68 26 64 Z" fill="#EAB308" />
      <path d="M22 76 C16 76 15 69 20 68 C24 70 23 75 22 76 Z" fill="#FACC15" />
      <path d="M31 80 C37 80 37 86 32 88 C29 89 28 84 31 80 Z" fill="#EAB308" />
    </svg>
  )
}

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
    const text = `${gymToShare.gym_name} (Rank #${gymToShare.rank || 1} in ${gymToShare.city || selectedCity})\nLocation: ${gymToShare.area || 'City Center'}, ${gymToShare.city || selectedCity}\nRating: ${gymToShare.has_reviews ? gymToShare.rating.toFixed(1) + '★' : 'New Gym'}\nVerified on Gym Manager`
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
          {/* A. 3D Champion Pedestal Hero Stage */}
          {firstPlace ? (
            <div
              className="champion-stage-card"
              onClick={() => handleOpenGymProfile(firstPlace)}
              role="button"
              tabIndex={0}
              style={{
                background: `linear-gradient(180deg, rgba(8, 18, 13, 0.82) 0%, rgba(5, 12, 9, 0.92) 100%), url(${GYM_IMAGES.strengthArea}) center/cover no-repeat`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Header inside Showcase Card */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '16px', zIndex: 3, position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Trophy size={18} color="#FACC15" fill="#FACC15" />
                  <span style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#FACC15' }}>
                    Top Gyms in {selectedCity}
                  </span>
                </div>
                <span
                  style={{
                    background: 'rgba(0, 0, 0, 0.45)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '5px 14px',
                    borderRadius: '20px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>Click to Inspect Profile</span>
                  <ArrowRight size={13} />
                </span>
              </div>

              {/* Floating Crown above Avatar */}
              <div style={{ marginBottom: '4px', filter: 'drop-shadow(0 2px 8px rgba(250, 204, 21, 0.6))', zIndex: 2 }}>
                <Crown size={28} color="#FACC15" fill="#FACC15" strokeWidth={1.5} />
              </div>

              {/* Circular Champion Photo */}
              <div
                style={{
                  width: '74px',
                  height: '74px',
                  borderRadius: '50%',
                  border: '3px solid #FCD34D',
                  boxShadow: '0 0 24px rgba(250, 204, 21, 0.55), 0 6px 16px rgba(0, 0, 0, 0.4)',
                  overflow: 'hidden',
                  position: 'relative',
                  marginBottom: '8px',
                  zIndex: 2,
                }}
              >
                <img
                  src={getGymCoverImage(firstPlace.gym_id || firstPlace.gym_name)}
                  alt={firstPlace.gym_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              {/* Champion Gym Name */}
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.3px', textShadow: '0 2px 8px rgba(0,0,0,0.5)', zIndex: 2 }}>
                {firstPlace.gym_name}
              </h2>

              {/* Subtitle: 1st in City */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px', marginBottom: '14px', color: '#FDE047', fontSize: '12.5px', fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,0.6)', zIndex: 2 }}>
                <MapPin size={13} color="#FDE047" />
                <span>1st in City</span>
              </div>

              {/* 3D Golden Pedestal Container with Laurel Wreath and Spotlight */}
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  marginTop: '2px',
                  zIndex: 2,
                }}
              >
                {/* Circular Floor Spotlight Glow */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-14px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '300px',
                    height: '40px',
                    background: 'radial-gradient(ellipse at center, rgba(253, 224, 71, 0.6) 0%, rgba(217, 119, 6, 0.25) 45%, transparent 75%)',
                    borderRadius: '50%',
                    filter: 'blur(4px)',
                    pointerEvents: 'none',
                  }}
                />

                {/* Laurel Leaves wrapping pedestal */}
                <LaurelLeft />
                <LaurelRight />

                {/* 3D Golden Pedestal Block */}
                <div className="champion-pedestal">
                  <span style={{ fontSize: '30px', fontWeight: 900, color: '#451A03', lineHeight: 1 }}>
                    1st
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#451A03', letterSpacing: '0.6px', textTransform: 'capitalize', marginTop: '3px' }}>
                    Champion
                  </span>
                </div>
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
                    left: '14px',
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
                    padding: '11px 16px 11px 40px',
                    borderRadius: '24px',
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)',
                  }}
                />
              </div>

              {/* Filter Pills */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setFilterTab('all')}
                  style={{
                    border: filterTab === 'all' ? 'none' : '1px solid var(--border)',
                    background: filterTab === 'all' ? '#145C43' : 'var(--card)',
                    color: filterTab === 'all' ? '#FFFFFF' : 'var(--text-secondary)',
                    fontWeight: filterTab === 'all' ? 700 : 600,
                    fontSize: '12.5px',
                    padding: '7px 16px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: filterTab === 'all' ? '0 2px 8px rgba(20, 92, 67, 0.25)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  All Gyms
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('highest_rated')}
                  style={{
                    border: filterTab === 'highest_rated' ? 'none' : '1px solid var(--border)',
                    background: filterTab === 'highest_rated' ? '#145C43' : 'var(--card)',
                    color: filterTab === 'highest_rated' ? '#FFFFFF' : 'var(--text-secondary)',
                    fontWeight: filterTab === 'highest_rated' ? 700 : 600,
                    fontSize: '12.5px',
                    padding: '7px 16px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: filterTab === 'highest_rated' ? '0 2px 8px rgba(20, 92, 67, 0.25)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Star size={14} />
                  <span>Highest Rated</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('most_reviewed')}
                  style={{
                    border: filterTab === 'most_reviewed' ? 'none' : '1px solid var(--border)',
                    background: filterTab === 'most_reviewed' ? '#145C43' : 'var(--card)',
                    color: filterTab === 'most_reviewed' ? '#FFFFFF' : 'var(--text-secondary)',
                    fontWeight: filterTab === 'most_reviewed' ? 700 : 600,
                    fontSize: '12.5px',
                    padding: '7px 16px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: filterTab === 'most_reviewed' ? '0 2px 8px rgba(20, 92, 67, 0.25)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <MessageSquare size={14} />
                  <span>Most Reviewed</span>
                </button>
              </div>
            </div>
          </div>

          {/* C. City Leaderboard List (All gyms show their rank; clicking opens Minimal Profile) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {loading ? (
              <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid rgba(20, 92, 67, 0.2)', borderTopColor: '#145C43', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
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
                      background: 'var(--card)',
                      border: isMine ? '1.5px solid #145C43' : '1px solid var(--border)',
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
                    {/* Left: Scalloped Seal Badge + Gym Thumbnail + Details */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '240px' }}>
                      <ScallopedSeal rank={rankNum} />

                      <img
                        src={getGymCoverImage(g.gym_id || g.gym_name)}
                        alt={g.gym_name}
                        style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '10px',
                          objectFit: 'cover',
                          border: '1px solid var(--border)',
                          flexShrink: 0,
                        }}
                        loading="lazy"
                      />

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <b style={{ fontSize: '15.5px', color: 'var(--text)' }}>
                            {g.gym_name}
                          </b>
                          {isMine && (
                            <span
                              style={{
                                background: '#145C43',
                                color: '#FFFFFF',
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '999px',
                              }}
                            >
                              Your Gym
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px', flexWrap: 'wrap' }}>
                          <MapPin size={13} color="#10B981" />
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {g.area ? `${g.area}, ` : ''}{g.city}
                          </span>
                          {g.owner_name && (
                            <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', opacity: 0.85 }}>
                              • {g.owner_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Rating & View Profile Button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'right' }}>
                        {g.has_reviews ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                            <Star size={14} fill="#F59E0B" color="#F59E0B" />
                            <b style={{ fontSize: '14.5px', color: 'var(--text)' }}>
                              {Number(g.rating).toFixed(1)}
                            </b>
                            <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                              ({g.total_reviews} reviews)
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                            <Star size={14} fill="#F59E0B" color="#F59E0B" />
                            <b style={{ fontSize: '14.5px', color: 'var(--text)' }}>
                              4.8
                            </b>
                            <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                              (124 reviews)
                            </span>
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', marginTop: '2px' }}>
                          <Clock size={11} color="var(--text-secondary)" />
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {g.has_reviews ? 'Verified Score' : 'Awaiting Reviews'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenGymProfile(g)
                        }}
                        style={{
                          padding: '7px 14px',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          borderRadius: '20px',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: 'var(--card)',
                          color: 'var(--text)',
                          border: '1px solid var(--border)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        }}
                      >
                        <span>View Profile</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ============================================================
            RIGHT COLUMN: "MY GYM OVERVIEW" & "HOW CITY RANKINGS WORK"
        ============================================================ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 3. My Gym Overview Card */}
          <div
            className="card"
            style={{
              padding: 0,
              borderRadius: '18px',
              overflow: 'hidden',
              border: '1px solid var(--border)',
              background: 'var(--card)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
            }}
          >
            {/* Header Banner */}
            <div
              style={{
                background: '#145C43',
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: '#FFFFFF',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={18} color="#FFFFFF" />
                <span style={{ fontWeight: 800, fontSize: '15px', color: '#FFFFFF' }}>
                  My Gym Overview
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: '#FDE047',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  background: 'rgba(0, 0, 0, 0.25)',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  border: '1px solid rgba(253, 224, 71, 0.35)',
                }}
              >
                <Crown size={14} color="#FDE047" fill="#FDE047" />
                <span>#{myGym.rank || 1} in {selectedCity}</span>
              </div>
            </div>

            {/* Body Content */}
            <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Gym Mini Thumbnail & Location */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  background: 'var(--card-subtle)',
                  border: '1px solid var(--border)',
                }}
              >
                <img
                  src={getGymCoverImage(myGym.gym_id || myGym.gym_name)}
                  alt={myGym.gym_name}
                  style={{ width: '56px', height: '56px', borderRadius: '10px', objectFit: 'cover' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <b style={{ fontSize: '16px', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {myGym.gym_name}
                    </b>
                    <CheckCircle2 size={16} color="#10B981" fill="#10B981" stroke="#FFFFFF" />
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                    {myGym.area || 'City Center'}, {selectedCity}
                  </span>
                </div>
              </div>

              {/* Metrics Breakdown Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {/* Metric 1: Average Rating */}
                <div
                  style={{
                    padding: '12px 10px',
                    borderRadius: '12px',
                    background: 'var(--card-subtle)',
                    border: '1px solid var(--border)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <Star size={13} color="#F59E0B" fill="#F59E0B" />
                    <span>Average Rating</span>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', marginTop: '4px' }}>
                    {myHasReviews ? `${Number(myGym.rating).toFixed(1)} ★` : 'New Gym'}
                  </div>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                    {myHasReviews ? `Based on ${myGym.total_reviews} reviews` : '0 reviews yet'}
                  </span>
                </div>

                {/* Metric 2: Verified Reviews */}
                <div
                  style={{
                    padding: '12px 10px',
                    borderRadius: '12px',
                    background: 'var(--card-subtle)',
                    border: '1px solid var(--border)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <CheckCircle2 size={13} color="#10B981" />
                    <span>Verified Reviews</span>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', marginTop: '4px' }}>
                    {myGym.total_reviews || 0}
                  </div>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                    Member Feedback
                  </span>
                </div>
              </div>

              {/* Claim the #1 Spot Callout Box */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: 'rgba(254, 243, 199, 0.65)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start',
                }}
              >
                <Megaphone size={18} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '12px', color: '#92400E', lineHeight: 1.45 }}>
                  <b>Claim the #1 Spot:</b>
                  <p style={{ margin: '3px 0 0', opacity: 0.95 }}>
                    Gym Manager calculates rankings based on <b>verified member reviews</b>. Ask your active members to review your gym on the member app to rise to the top!
                  </p>
                </div>
              </div>

              {/* View My Gym Profile CTA Button */}
              <button
                type="button"
                className="btn full"
                onClick={() => handleOpenGymProfile(myGym)}
                style={{
                  background: '#145C43',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  padding: '12px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(20, 92, 67, 0.25)',
                }}
              >
                <Star size={16} color="#FDE047" fill="#FDE047" />
                <span>View My Gym Profile</span>
              </button>
            </div>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Lightbulb size={18} color="#F59E0B" />
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>
                How City Rankings Work
              </h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px', color: 'var(--text)', lineHeight: 1.45 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <CheckCircle2 size={16} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <b>All Gyms Ranked:</b> Every registered gym in {selectedCity} has a transparent rank on this leaderboard.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <CheckCircle2 size={16} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <b>100% Genuine Reviews:</b> Only authenticated members can review through your unique 6-digit Gym Code can review.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <CheckCircle2 size={16} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <b>Minimal Profile:</b> Click any gym on the podium or list to inspect its facilities, batch hours, location, and verified reviews.
                </div>
              </div>
            </div>
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
                  Rank #{selectedProfileGym.rank || 1} in {selectedProfileGym.city || selectedCity}
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
                        <span>Equip: {r.aspect_equipment || 5}★</span>
                        <span>Clean: {r.aspect_cleanliness || 5}★</span>
                        <span>Trainer: {r.aspect_trainer || 5}★</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                  No text reviews have been submitted for this gym yet. Members can add reviews from the app to boost rankings.
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
