import React, { useState, useEffect, useCallback } from 'react'
import {
  fetchPublicGymRankings,
  POPULAR_CITIES,
  POPULAR_STATES,
  STANDARD_FACILITIES,
  getUserGeolocation,
} from '../../lib/ranking'
import { fetchGymReviews } from '../../lib/reviews'
import {
  Search,
  MapPin,
  Star,
  Trophy,
  Filter,
  CheckCircle,
  Navigation,
  ExternalLink,
  Phone,
  X,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Clock,
} from 'lucide-react'

export default function MemberExploreGyms({ member, currentGym, onSelectGym }) {
  const [scope, setScope] = useState('city') // 'nearby' | 'city' | 'state' | 'all'
  const [selectedCity, setSelectedCity] = useState(currentGym?.city || 'Udaipur')
  const [selectedState, setSelectedState] = useState(currentGym?.state || 'Rajasthan')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFacilities, setSelectedFacilities] = useState([])
  const [sortBy, setSortBy] = useState('rank') // 'rank' | 'rating' | 'reviews' | 'distance'
  const [userCoords, setUserCoords] = useState(null)
  const [requestingLoc, setRequestingLoc] = useState(false)
  const [loading, setLoading] = useState(true)
  const [gyms, setGyms] = useState([])
  const [totalCount, setTotalCount] = useState(0)

  // Profile Inspection Modal
  const [selectedGym, setSelectedGym] = useState(null)
  const [gymReviews, setGymReviews] = useState(null)
  const [loadingReviews, setLoadingReviews] = useState(false)

  // Load gyms based on scope and location
  const loadGyms = useCallback(async () => {
    setLoading(true)
    try {
      let locTarget = ''
      if (scope === 'city') locTarget = selectedCity
      else if (scope === 'state') locTarget = selectedState

      const res = await fetchPublicGymRankings({
        scope,
        location: locTarget,
        latitude: userCoords?.latitude || null,
        longitude: userCoords?.longitude || null,
        gymId: currentGym?.id || null,
      })

      if (res && res.success) {
        setGyms(res.gyms || [])
        setTotalCount(res.total_registered || 0)
      }
    } finally {
      setLoading(false)
    }
  }, [scope, selectedCity, selectedState, userCoords, currentGym?.id])

  useEffect(() => {
    loadGyms()
  }, [loadGyms])

  // Handle Nearby GPS toggle
  const handleEnableNearby = async () => {
    setRequestingLoc(true)
    try {
      const coords = await getUserGeolocation()
      if (coords) {
        setUserCoords(coords)
        setScope('nearby')
      } else {
        alert('Location access was denied or timed out. Please select your city manually.')
      }
    } finally {
      setRequestingLoc(false)
    }
  }

  // Handle facility filter toggle
  const toggleFacility = (facId) => {
    setSelectedFacilities((prev) =>
      prev.includes(facId) ? prev.filter((id) => id !== facId) : [...prev, facId]
    )
  }

  // Open Gym Details Modal & Load Real Member Reviews
  const handleOpenGym = async (g) => {
    setSelectedGym(g)
    setLoadingReviews(true)
    try {
      const data = await fetchGymReviews(g.gym_id || g.id)
      setGymReviews(data)
    } finally {
      setLoadingReviews(false)
    }
  }

  // Filter & Sort Logic
  const filteredGyms = (gyms || [])
    .filter((g) => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesName = (g.gym_name || '').toLowerCase().includes(q)
        const matchesArea = (g.area || '').toLowerCase().includes(q)
        const matchesCity = (g.city || '').toLowerCase().includes(q)
        const matchesPin = (g.pincode || '').includes(q)
        if (!matchesName && !matchesArea && !matchesCity && !matchesPin) return false
      }

      // 2. Facility Filters
      if (selectedFacilities.length > 0) {
        const gFacs = (g.facilities || []).map((f) => String(f).toLowerCase())
        const hasAllSelected = selectedFacilities.every((facId) => {
          return gFacs.some((f) => f.includes(facId))
        })
        if (!hasAllSelected) return false
      }

      return true
    })
    .sort((a, b) => {
      if (sortBy === 'distance') {
        const distA = a.distance_km != null ? a.distance_km : 9999
        const distB = b.distance_km != null ? b.distance_km : 9999
        return distA - distB
      }
      if (sortBy === 'rating') {
        if (b.rating !== a.rating) return b.rating - a.rating
        return b.total_reviews - a.total_reviews
      }
      if (sortBy === 'reviews') {
        if (b.total_reviews !== a.total_reviews) return b.total_reviews - a.total_reviews
        return b.rating - a.rating
      }
      return (a.rank || 999) - (b.rank || 999)
    })

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', padding: '16px 14px 40px' }}>
      {/* 1. Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(255, 98, 0, 0.12) 0%, rgba(255, 122, 26, 0.04) 100%)',
          border: '1px solid rgba(255, 98, 0, 0.25)',
          borderRadius: '20px',
          padding: '20px 22px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 98, 0, 0.15)', color: '#FF6200', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              <Sparkles size={12} />
              <span>Centralized Gym Discovery</span>
            </div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.3px' }}>
              Explore & Compare Top Gyms
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Discover registered fitness centers in your area with verified facilities and member reviews.
            </p>
          </div>

          <button
            type="button"
            className="btn sm"
            onClick={handleEnableNearby}
            disabled={requestingLoc}
            style={{
              background: scope === 'nearby' ? '#FF6200' : 'var(--card)',
              color: scope === 'nearby' ? '#FFFFFF' : 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
            }}
          >
            <Navigation size={15} />
            <span>{requestingLoc ? 'Locating…' : scope === 'nearby' ? 'Nearby Active' : 'Gyms Near Me'}</span>
          </button>
        </div>

        {/* Scope Selector Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
          <button
            type="button"
            onClick={() => setScope('city')}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              border: '1px solid',
              background: scope === 'city' ? '#FF6200' : 'var(--card)',
              color: scope === 'city' ? '#FFFFFF' : 'var(--text)',
              borderColor: scope === 'city' ? '#FF6200' : 'var(--border)',
            }}
          >
            In {selectedCity}
          </button>

          <button
            type="button"
            onClick={() => setScope('state')}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              border: '1px solid',
              background: scope === 'state' ? '#FF6200' : 'var(--card)',
              color: scope === 'state' ? '#FFFFFF' : 'var(--text)',
              borderColor: scope === 'state' ? '#FF6200' : 'var(--border)',
            }}
          >
            Across {selectedState}
          </button>

          <button
            type="button"
            onClick={() => setScope('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              border: '1px solid',
              background: scope === 'all' ? '#FF6200' : 'var(--card)',
              color: scope === 'all' ? '#FFFFFF' : 'var(--text)',
              borderColor: scope === 'all' ? '#FF6200' : 'var(--border)',
            }}
          >
            All Registered Gyms
          </button>

          {/* City Dropdown when City scope active */}
          {scope === 'city' && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={14} color="#FF6200" />
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  color: 'var(--text)',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  outline: 'none',
                }}
              >
                {POPULAR_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* State Dropdown when State scope active */}
          {scope === 'state' && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={14} color="#FF6200" />
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  color: 'var(--text)',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  outline: 'none',
                }}
              >
                {POPULAR_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 2. Search, Sort & Facility Filter Strip */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div
            style={{
              flex: 1,
              minWidth: '240px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search
              size={16}
              color="var(--text-secondary)"
              style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }}
            />
            <input
              type="text"
              placeholder="Search by gym name, area, or PIN…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--card)',
                color: 'var(--text)',
                fontSize: '13.5px',
                outline: 'none',
              }}
            />
          </div>

          {/* Sort Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--card)',
                color: 'var(--text)',
                fontSize: '12.5px',
                fontWeight: 700,
                outline: 'none',
              }}
            >
              <option value="rank">Leaderboard Rank</option>
              <option value="rating">Highest Rated ★</option>
              <option value="reviews">Most Reviewed 💬</option>
              {scope === 'nearby' && <option value="distance">Nearest Distance 📍</option>}
            </select>
          </div>
        </div>

        {/* Facility Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0, fontWeight: 700 }}>
            <Filter size={12} /> Facilities:
          </span>
          {STANDARD_FACILITIES.map((fac) => {
            const active = selectedFacilities.includes(fac.id)
            return (
              <button
                key={fac.id}
                type="button"
                onClick={() => toggleFacility(fac.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '999px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  border: '1px solid',
                  background: active ? 'rgba(255, 98, 0, 0.15)' : 'var(--card)',
                  color: active ? '#FF6200' : 'var(--text)',
                  borderColor: active ? '#FF6200' : 'var(--border)',
                  flexShrink: 0,
                }}
              >
                {active && '✓ '}
                {fac.label.split('(')[0].trim()}
              </button>
            )
          })}
          {selectedFacilities.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedFacilities([])}
              style={{
                padding: '5px 10px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 700,
                background: 'none',
                border: 'none',
                color: '#EF4444',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 3. Gym Discovery Cards List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          <div style={{ width: '28px', height: '28px', border: '3px solid rgba(255,98,0,0.2)', borderTopColor: '#FF6200', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <span>Searching registered gyms…</span>
        </div>
      ) : filteredGyms.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', borderRadius: '18px' }}>
          <Trophy size={36} color="var(--muted)" style={{ margin: '0 auto 10px', opacity: 0.5 }} />
          <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: 'var(--text)' }}>No gyms found matching criteria</h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            Try clearing filters or switching cities to explore gyms.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredGyms.map((g) => {
            const isCurrent = currentGym && (g.gym_id === currentGym.id || g.id === currentGym.id)
            const hasReviews = (g.total_reviews || 0) > 0
            const verifiedCount = Array.isArray(g.verified_facilities) ? g.verified_facilities.length : 0

            return (
              <div
                key={g.gym_id || g.id}
                className="card"
                onClick={() => handleOpenGym(g)}
                style={{
                  borderRadius: '16px',
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap',
                  cursor: 'pointer',
                  border: isCurrent ? '2px solid #FF6200' : '1px solid var(--border)',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Left: Rank + Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {/* Rank Badge */}
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background:
                        g.rank === 1
                          ? 'linear-gradient(135deg, #F59E0B, #D97706)'
                          : g.rank === 2
                          ? 'linear-gradient(135deg, #94A3B8, #64748B)'
                          : g.rank === 3
                          ? 'linear-gradient(135deg, #D97706, #B45309)'
                          : 'var(--bg-subtle, rgba(0,0,0,0.06))',
                      color: g.rank <= 3 ? '#FFFFFF' : 'var(--text)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '15px',
                      flexShrink: 0,
                    }}
                  >
                    <span>#{g.rank}</span>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <b style={{ fontSize: '16px', color: 'var(--text)' }}>{g.gym_name}</b>
                      {g.is_verified && (
                        <span title="Verified by Gym Manager Admin" style={{ display: 'inline-flex', alignItems: 'center', color: '#10B981' }}>
                          <CheckCircle size={15} />
                        </span>
                      )}
                      {isCurrent && (
                        <span style={{ background: '#FF6200', color: '#FFF', fontSize: '10.5px', fontWeight: 800, padding: '2px 8px', borderRadius: '999px' }}>
                          Your Gym
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <MapPin size={12} color="#FF6200" />
                        {g.area ? `${g.area}, ` : ''}{g.city}
                      </span>

                      {g.distance_km != null && (
                        <span style={{ fontSize: '11.5px', color: '#10B981', fontWeight: 700 }}>
                          • {g.distance_km} km away
                        </span>
                      )}

                      {verifiedCount > 0 && (
                        <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          ✓ {verifiedCount} Verified Facilities
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Score, Stars & Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                      {hasReviews ? (
                        <>
                          <Star size={14} fill="#F59E0B" color="#F59E0B" />
                          <b style={{ fontSize: '14.5px', color: 'var(--text)' }}>{Number(g.rating).toFixed(1)}</b>
                          <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                            ({g.total_reviews})
                          </span>
                        </>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          New Gym · 0 Reviews
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', marginTop: '3px' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#FF6200' }}>
                        Score: {g.score || 50}/100
                      </span>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                        ({g.tier || 'Silver Pro'})
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenGym(g)
                    }}
                    style={{
                      borderRadius: '999px',
                      padding: '7px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>View Profile</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 4. Gym Profile & Verified Reviews Modal */}
      {selectedGym && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            overflowY: 'auto',
          }}
          onClick={() => setSelectedGym(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: '560px',
              width: '100%',
              borderRadius: '22px',
              padding: '24px',
              background: 'var(--card)',
              position: 'relative',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedGym(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--bg-subtle, rgba(0,0,0,0.06))',
                border: 'none',
                color: 'var(--text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>

            {/* Gym Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '16px',
                  background: '#FF6200',
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '20px',
                  flexShrink: 0,
                }}
              >
                {selectedGym.gym_name.slice(0, 2).toUpperCase()}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: 'var(--text)' }}>
                    {selectedGym.gym_name}
                  </h2>
                  {selectedGym.is_verified && <CheckCircle size={16} color="#10B981" />}
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {selectedGym.area ? `${selectedGym.area}, ` : ''}{selectedGym.city}, {selectedGym.state}
                </div>
              </div>
            </div>

            {/* Key Badges Strip */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
              <span className="badge" style={{ background: '#FF6200', color: '#FFF', fontWeight: 800, padding: '4px 10px', borderRadius: '8px' }}>
                Rank #{selectedGym.rank}
              </span>
              <span className="badge" style={{ background: 'rgba(255, 98, 0, 0.1)', color: '#FF6200', fontWeight: 800, padding: '4px 10px', borderRadius: '8px' }}>
                Score: {selectedGym.score || 50}/100 ({selectedGym.tier || 'Silver Pro'})
              </span>
              <span className="badge" style={{ background: 'var(--bg-subtle, rgba(0,0,0,0.06))', color: 'var(--text)', fontWeight: 700, padding: '4px 10px', borderRadius: '8px' }}>
                {selectedGym.has_reviews ? `★ ${selectedGym.rating} (${selectedGym.total_reviews} reviews)` : 'New Gym'}
              </span>
            </div>

            {/* Verified & Available Facilities */}
            <div style={{ marginBottom: '20px' }}>
              <b style={{ fontSize: '13px', display: 'block', marginBottom: '8px', color: 'var(--text)' }}>
                Gym Facilities:
              </b>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(selectedGym.facilities || []).map((fac, idx) => {
                  const isVer = (selectedGym.verified_facilities || []).some(
                    (vf) => String(fac).toLowerCase().includes(String(vf).toLowerCase())
                  )
                  return (
                    <span
                      key={idx}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        background: isVer ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-subtle, rgba(0,0,0,0.06))',
                        color: isVer ? '#10B981' : 'var(--text)',
                        border: isVer ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {isVer && <CheckCircle size={11} color="#10B981" />}
                      {fac}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Member Reviews & Testimonials Section */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <b style={{ fontSize: '13px', color: 'var(--text)' }}>
                  Verified Member Reviews ({gymReviews?.total_reviews || selectedGym.total_reviews || 0})
                </b>
              </div>

              {loadingReviews ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                  Loading reviews…
                </div>
              ) : !gymReviews || !gymReviews.reviews || gymReviews.reviews.length === 0 ? (
                <div style={{ background: 'var(--bg-subtle, rgba(0,0,0,0.04))', padding: '14px', borderRadius: '12px', textAlign: 'center', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  No written reviews yet for this gym. Active members can rate & review from the Member Pass!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto' }}>
                  {gymReviews.reviews.map((r, idx) => (
                    <div
                      key={r.id || idx}
                      style={{
                        padding: '12px',
                        borderRadius: '12px',
                        background: 'var(--bg-subtle, rgba(0,0,0,0.04))',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--text)' }}>
                          {r.reviewer_name || 'Verified Member'}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#F59E0B' }}>
                          <Star size={12} fill="#F59E0B" />
                          <b style={{ fontSize: '12px' }}>{r.rating}</b>
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        "{r.review_text || 'Great gym with clean equipment and good coaches.'}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Public Contact If Available */}
            {selectedGym.phone && (
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  Public Contact: <b>{selectedGym.phone}</b>
                </span>
                <a
                  href={`tel:${selectedGym.phone}`}
                  className="btn sm"
                  style={{
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 700,
                  }}
                >
                  <Phone size={13} />
                  <span>Call Gym</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
