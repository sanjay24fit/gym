import React, { useState, useEffect, useCallback } from 'react'
import {
  fetchPublicGymRankings,
  adminUpdateGymVerification,
  adminModerateReview,
  fetchRankingConfig,
  adminUpdateRankingWeights,
  POPULAR_CITIES,
  POPULAR_STATES,
  STANDARD_FACILITIES,
} from '../lib/ranking'
import { fetchGymReviews } from '../lib/reviews'
import Modal from './Modal'
import {
  Trophy,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Sliders,
  Search,
  Filter,
  Star,
  Trash2,
  Flag,
  MapPin,
  ExternalLink,
} from 'lucide-react'

export default function AdminRankingsManager() {
  const [gyms, setGyms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState('all') // 'all' | 'city' | 'state'
  const [selectedCity, setSelectedCity] = useState('Udaipur')
  const [selectedState, setSelectedState] = useState('Rajasthan')
  const [verificationFilter, setVerificationFilter] = useState('all') // 'all' | 'verified' | 'unverified'

  // Modals
  const [facilityGym, setFacilityGym] = useState(null) // Gym whose facilities are being edited
  const [facilityForm, setFacilityForm] = useState([])
  const [savingFacilities, setSavingFacilities] = useState(false)

  const [reviewGym, setReviewGym] = useState(null) // Gym whose reviews are being moderated
  const [gymReviews, setGymReviews] = useState([])
  const [loadingReviews, setLoadingReviews] = useState(false)

  const [weightsModal, setWeightsModal] = useState(false)
  const [weights, setWeights] = useState({
    verified_facilities: 30,
    member_reviews: 25,
    equipment_infrastructure: 20,
    cleanliness: 10,
    trainer_coaching: 10,
    profile_completeness: 5,
  })
  const [savingWeights, setSavingWeights] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      let loc = ''
      if (scope === 'city') loc = selectedCity
      else if (scope === 'state') loc = selectedState

      const res = await fetchPublicGymRankings({
        scope,
        location: loc,
      })
      if (res && res.success) {
        setGyms(res.gyms || [])
      }

      const cfg = await fetchRankingConfig()
      if (cfg) setWeights(cfg)
    } catch (err) {
      setError(err.message || 'Failed to load rankings')
    } finally {
      setLoading(false)
    }
  }, [scope, selectedCity, selectedState])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Toggle Gym Verified Badge
  const handleToggleVerifiedBadge = async (targetGym) => {
    const nextState = !targetGym.is_verified
    const res = await adminUpdateGymVerification(targetGym.gym_id || targetGym.id, {
      isVerified: nextState,
    })
    if (res.success) {
      setSuccessMsg(`Updated verification badge for ${targetGym.gym_name}`)
      setTimeout(() => setSuccessMsg(''), 3000)
      loadData()
    } else {
      setError(res.error || 'Failed to update verification status')
    }
  }

  // Open Facility Verification Modal
  const handleOpenFacilityModal = (g) => {
    setFacilityGym(g)
    const currentVerified = Array.isArray(g.verified_facilities) ? g.verified_facilities : []
    setFacilityForm([...currentVerified])
  }

  const handleToggleFacilityCheckbox = (fac) => {
    setFacilityForm((prev) =>
      prev.includes(fac) ? prev.filter((f) => f !== fac) : [...prev, fac]
    )
  }

  const handleSaveFacilities = async () => {
    if (!facilityGym) return
    setSavingFacilities(true)
    try {
      const res = await adminUpdateGymVerification(facilityGym.gym_id || facilityGym.id, {
        verifiedFacilities: facilityForm,
      })
      if (res.success) {
        setFacilityGym(null)
        setSuccessMsg(`Verified facilities updated for ${facilityGym.gym_name}`)
        setTimeout(() => setSuccessMsg(''), 3000)
        loadData()
      } else {
        setError(res.error || 'Failed to save facilities')
      }
    } finally {
      setSavingFacilities(false)
    }
  }

  // Open Reviews Moderation Modal
  const handleOpenReviewsModal = async (g) => {
    setReviewGym(g)
    setLoadingReviews(true)
    try {
      const data = await fetchGymReviews(g.gym_id || g.id)
      setGymReviews(data?.reviews || [])
    } finally {
      setLoadingReviews(false)
    }
  }

  const handleModerateReview = async (reviewId, action) => {
    const res = await adminModerateReview(reviewId, action)
    if (res.success) {
      setGymReviews((prev) =>
        action === 'delete'
          ? prev.filter((r) => r.id !== reviewId)
          : prev.map((r) => (r.id === reviewId ? { ...r, status: action, is_flagged: action === 'flag' } : r))
      )
      loadData()
    } else {
      alert(res.error || 'Failed to moderate review')
    }
  }

  // Save Ranking Weights
  const handleSaveWeights = async (e) => {
    e.preventDefault()
    setSavingWeights(true)
    try {
      const sum =
        Number(weights.verified_facilities) +
        Number(weights.member_reviews) +
        Number(weights.equipment_infrastructure) +
        Number(weights.cleanliness) +
        Number(weights.trainer_coaching) +
        Number(weights.profile_completeness)

      if (sum !== 100) {
        alert(`The weights must sum to exactly 100 points. Current sum: ${sum}`)
        setSavingWeights(false)
        return
      }

      const res = await adminUpdateRankingWeights(weights)
      if (res.success) {
        setWeightsModal(false)
        setSuccessMsg('Ranking weights updated successfully!')
        setTimeout(() => setSuccessMsg(''), 3000)
        loadData()
      } else {
        alert(res.error || 'Failed to update weights')
      }
    } finally {
      setSavingWeights(false)
    }
  }

  // Filter gyms
  const q = search.trim().toLowerCase()
  const filteredGyms = gyms.filter((g) => {
    if (q) {
      const matchesName = (g.gym_name || '').toLowerCase().includes(q)
      const matchesCity = (g.city || '').toLowerCase().includes(q)
      const matchesOwner = (g.owner_name || '').toLowerCase().includes(q)
      if (!matchesName && !matchesCity && !matchesOwner) return false
    }
    if (verificationFilter === 'verified' && !g.is_verified) return false
    if (verificationFilter === 'unverified' && g.is_verified) return false
    return true
  })

  // Summary Metrics
  const totalVerified = gyms.filter((g) => g.is_verified).length
  const totalReviews = gyms.reduce((acc, g) => acc + (Number(g.total_reviews) || 0), 0)
  const avgScore =
    gyms.length > 0
      ? (gyms.reduce((acc, g) => acc + (Number(g.score) || 0), 0) / gyms.length).toFixed(1)
      : '0.0'

  return (
    <div>
      {/* 1. Header & Actions */}
      <div className="section-head" style={{ marginBottom: '16px' }}>
        <div>
          <h2>Gym Rankings & Discovery Management</h2>
          <span className="muted small">
            Single source of truth for platform rankings. Verify gym facilities, moderate reviews, and configure scoring criteria.
          </span>
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => setWeightsModal(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
        >
          <Sliders size={15} />
          <span>Configure Ranking Weights</span>
        </button>
      </div>

      {successMsg && <div className="alert success" style={{ marginBottom: '14px' }}>{successMsg}</div>}
      {error && <div className="alert error" style={{ marginBottom: '14px' }}>{error}</div>}

      {/* 2. Admin Summary KPI Grid */}
      <div className="summary-grid" style={{ marginBottom: '20px' }}>
        <div className="summary-card accent">
          <div className="summary-card-head">
            <span className="summary-card-label">Ranked Directory Gyms</span>
            <Trophy size={18} color="#FF6200" />
          </div>
          <div className="summary-card-value">{gyms.length}</div>
        </div>

        <div className="summary-card success">
          <div className="summary-card-head">
            <span className="summary-card-label">Verified Badges</span>
            <CheckCircle size={18} color="#10B981" />
          </div>
          <div className="summary-card-value">{totalVerified}</div>
          <div className="summary-card-sub">Admin verified</div>
        </div>

        <div className="summary-card warning">
          <div className="summary-card-head">
            <span className="summary-card-label">Platform Reviews</span>
            <Star size={18} color="#F59E0B" />
          </div>
          <div className="summary-card-value">{totalReviews}</div>
          <div className="summary-card-sub">Real member feedback</div>
        </div>

        <div className="summary-card">
          <div className="summary-card-head">
            <span className="summary-card-label">Avg Directory Score</span>
            <ShieldCheck size={18} color="#6366F1" />
          </div>
          <div className="summary-card-value">{avgScore} <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>/ 100</span></div>
          <div className="summary-card-sub">Transparent quality benchmark</div>
        </div>
      </div>

      {/* 3. Toolbar: Scope, Filter & Search */}
      <div className="toolbar" style={{ flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
        {/* Search Input */}
        <div className="search-box" style={{ minWidth: '220px' }}>
          <span className="search-icon" aria-hidden="true">
            <Search size={15} />
          </span>
          <input
            placeholder="Search gym, owner, or city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Scope Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Scope:</span>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--card)',
              color: 'var(--text)',
              fontSize: '12.5px',
              fontWeight: 700,
            }}
          >
            <option value="all">All India / Global</option>
            <option value="city">By City</option>
            <option value="state">By State</option>
          </select>
        </div>

        {/* City Filter */}
        {scope === 'city' && (
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--card)',
              color: 'var(--text)',
              fontSize: '12.5px',
              fontWeight: 700,
            }}
          >
            {POPULAR_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}

        {/* State Filter */}
        {scope === 'state' && (
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--card)',
              color: 'var(--text)',
              fontSize: '12.5px',
              fontWeight: 700,
            }}
          >
            {POPULAR_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}

        {/* Verification Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Status:</span>
          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--card)',
              color: 'var(--text)',
              fontSize: '12.5px',
              fontWeight: 700,
            }}
          >
            <option value="all">All Gyms</option>
            <option value="verified">Verified Only</option>
            <option value="unverified">Unverified Only</option>
          </select>
        </div>
      </div>

      {/* 4. Ranked Gyms Management Table */}
      {loading ? (
        <div className="card empty">Loading platform rankings…</div>
      ) : filteredGyms.length === 0 ? (
        <div className="card empty">No registered gyms found matching criteria.</div>
      ) : (
        <div className="card table-card" style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Rank</th>
                <th>Gym & Location</th>
                <th>Score & Tier</th>
                <th>Verified Badge</th>
                <th>Facilities</th>
                <th>Member Reviews</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGyms.map((g) => {
                const verifiedCount = Array.isArray(g.verified_facilities) ? g.verified_facilities.length : 0
                const totalFacCount = Array.isArray(g.facilities) ? g.facilities.length : 0

                return (
                  <tr key={g.gym_id || g.id}>
                    <td>
                      <b style={{ fontSize: '15px', color: g.rank <= 3 ? '#FF6200' : 'var(--text)' }}>
                        #{g.rank}
                      </b>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>
                        {g.gym_name}
                      </div>
                      <div className="muted small" style={{ fontSize: '11.5px', marginTop: '2px' }}>
                        {g.area ? `${g.area}, ` : ''}{g.city}, {g.state} {g.pincode ? `(${g.pincode})` : ''}
                      </div>
                      {g.owner_name && (
                        <div className="muted small" style={{ fontSize: '11px', opacity: 0.85 }}>
                          Owner: {g.owner_name}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#FF6200' }}>
                        {g.score || 50} / 100
                      </div>
                      <span className="badge" style={{ fontSize: '10.5px', padding: '1px 6px', marginTop: '3px' }}>
                        {g.tier || 'Silver Pro'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleToggleVerifiedBadge(g)}
                        style={{
                          background: g.is_verified ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-subtle, rgba(0,0,0,0.06))',
                          color: g.is_verified ? '#10B981' : 'var(--text-secondary)',
                          border: g.is_verified ? '1px solid #10B981' : '1px solid var(--border)',
                          padding: '4px 10px',
                          borderRadius: '999px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {g.is_verified ? <CheckCircle size={12} /> : null}
                        <span>{g.is_verified ? 'Verified' : 'Unverified'}</span>
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => handleOpenFacilityModal(g)}
                        style={{ fontSize: '12px', padding: '4px 10px' }}
                      >
                        <span>{verifiedCount}/{totalFacCount} Verified</span>
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => handleOpenReviewsModal(g)}
                        style={{ fontSize: '12px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Star size={12} fill="#F59E0B" color="#F59E0B" />
                        <span>{g.has_reviews ? `${g.rating} (${g.total_reviews})` : '0 Reviews'}</span>
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => handleOpenFacilityModal(g)}
                        title="Inspect gym facilities and verification status"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. Facility Verification Modal */}
      {facilityGym && (
        <Modal
          title={`Verify Facilities • ${facilityGym.gym_name}`}
          onClose={() => setFacilityGym(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Select which facilities claimed by this gym have been verified. Verified facilities award full ranking points (up to 30 pts) in the platform directory.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
              {(facilityGym.facilities && facilityGym.facilities.length > 0
                ? facilityGym.facilities
                : STANDARD_FACILITIES.map((sf) => sf.label)
              ).map((fac, idx) => {
                const isChecked = facilityForm.includes(fac)
                return (
                  <label
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: isChecked ? 'rgba(16, 185, 129, 0.08)' : 'var(--card-subtle)',
                      border: isChecked ? '1px solid #10B981' : '1px solid var(--border)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: 'var(--text)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleFacilityCheckbox(fac)}
                    />
                    <span>{fac}</span>
                  </label>
                )
              })}
            </div>

            <div className="modal-actions" style={{ marginTop: '10px' }}>
              <button type="button" className="btn" onClick={() => setFacilityGym(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={savingFacilities}
                onClick={handleSaveFacilities}
              >
                {savingFacilities ? 'Saving…' : 'Save Verified Facilities'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 6. Review Moderation Modal */}
      {reviewGym && (
        <Modal
          title={`Member Reviews • ${reviewGym.gym_name}`}
          onClose={() => setReviewGym(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                Inspect and moderate member reviews. Delete or flag fraudulent ratings to protect ranking integrity.
              </p>
            </div>

            {loadingReviews ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>Loading reviews…</div>
            ) : gymReviews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                No reviews submitted yet for this gym.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '360px', overflowY: 'auto' }}>
                {gymReviews.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      background: 'var(--card-subtle)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <b style={{ fontSize: '13px' }}>{r.reviewer_name || 'Verified Member'}</b>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#F59E0B', fontWeight: 800, fontSize: '13px' }}>★ {r.rating}</span>
                        {r.is_flagged && <span className="badge danger" style={{ fontSize: '10px' }}>Flagged</span>}
                      </div>
                    </div>
                    <p style={{ margin: '4px 0 8px', fontSize: '12.5px', color: 'var(--text)', lineHeight: 1.4 }}>
                      "{r.review_text || 'No comment provided'}"
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => handleModerateReview(r.id, r.is_flagged ? 'approve' : 'flag')}
                        style={{ fontSize: '11px', padding: '3px 8px' }}
                      >
                        {r.is_flagged ? 'Approve' : 'Flag Suspicious'}
                      </button>
                      <button
                        type="button"
                        className="btn sm danger"
                        onClick={() => handleModerateReview(r.id, 'delete')}
                        style={{ fontSize: '11px', padding: '3px 8px' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="btn primary" onClick={() => setReviewGym(null)}>
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 7. Ranking Weights Configuration Modal */}
      {weightsModal && (
        <Modal title="Configure Platform Ranking Weights" onClose={() => setWeightsModal(false)}>
          <form className="form" onSubmit={handleSaveWeights}>
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Set point allocations for the 6 scoring categories. Total points must sum to <b>100</b>.
            </p>

            <label>
              Verified Gym Facilities (Max Points)
              <input
                type="number"
                min="0"
                max="50"
                value={weights.verified_facilities}
                onChange={(e) => setWeights({ ...weights, verified_facilities: Number(e.target.value) })}
              />
            </label>

            <label>
              Genuine Member Ratings & Reviews (Max Points)
              <input
                type="number"
                min="0"
                max="50"
                value={weights.member_reviews}
                onChange={(e) => setWeights({ ...weights, member_reviews: Number(e.target.value) })}
              />
            </label>

            <label>
              Equipment & Infrastructure (Max Points)
              <input
                type="number"
                min="0"
                max="40"
                value={weights.equipment_infrastructure}
                onChange={(e) => setWeights({ ...weights, equipment_infrastructure: Number(e.target.value) })}
              />
            </label>

            <label>
              Cleanliness & Maintenance (Max Points)
              <input
                type="number"
                min="0"
                max="25"
                value={weights.cleanliness}
                onChange={(e) => setWeights({ ...weights, cleanliness: Number(e.target.value) })}
              />
            </label>

            <label>
              Trainer & Coaching Quality (Max Points)
              <input
                type="number"
                min="0"
                max="25"
                value={weights.trainer_coaching}
                onChange={(e) => setWeights({ ...weights, trainer_coaching: Number(e.target.value) })}
              />
            </label>

            <label>
              Gym Profile Completeness (Max Points)
              <input
                type="number"
                min="0"
                max="15"
                value={weights.profile_completeness}
                onChange={(e) => setWeights({ ...weights, profile_completeness: Number(e.target.value) })}
              />
            </label>

            <div style={{ background: 'var(--card-subtle)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
              <span>Total Points:</span>
              <span style={{ color: (Number(weights.verified_facilities) + Number(weights.member_reviews) + Number(weights.equipment_infrastructure) + Number(weights.cleanliness) + Number(weights.trainer_coaching) + Number(weights.profile_completeness)) === 100 ? '#10B981' : '#EF4444' }}>
                {Number(weights.verified_facilities) + Number(weights.member_reviews) + Number(weights.equipment_infrastructure) + Number(weights.cleanliness) + Number(weights.trainer_coaching) + Number(weights.profile_completeness)} / 100
              </span>
            </div>

            <div className="modal-actions" style={{ marginTop: '12px' }}>
              <button type="button" className="btn" onClick={() => setWeightsModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn primary" disabled={savingWeights}>
                {savingWeights ? 'Saving…' : 'Save Weights'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
