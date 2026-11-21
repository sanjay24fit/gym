import { useState, useEffect } from 'react'
import Modal from './Modal'
import { submitMemberGymReview, getStoredMemberReview } from '../lib/reviews'

export default function MemberReviewModal({
  isOpen,
  onClose,
  gym,
  member,
  existingReview = null,
  onSuccess = null,
  onReviewSubmitted = null,
}) {
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [reviewerName, setReviewerName] = useState(member?.name || 'Verified Member')
  const [equipmentRating, setEquipmentRating] = useState(5)
  const [cleanlinessRating, setCleanlinessRating] = useState(5)
  const [trainerRating, setTrainerRating] = useState(5)
  const [vibeRating, setVibeRating] = useState(5)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!isOpen || !gym?.id) return
    const stored = existingReview || getStoredMemberReview(gym.id, member?.id)
    if (stored) {
      setRating(stored.rating || 5)
      setReviewText(stored.review_text || stored.reviewText || '')
      if (stored.reviewer_name || stored.reviewerName) {
        setReviewerName(stored.reviewer_name || stored.reviewerName)
      }
      if (stored.aspects) {
        setEquipmentRating(stored.aspects.equipment || 5)
        setCleanlinessRating(stored.aspects.cleanliness || 5)
        setTrainerRating(stored.aspects.trainer || 5)
        setVibeRating(stored.aspects.vibe || 5)
      }
    }
  }, [isOpen, gym?.id, member?.id, existingReview])

  if (!isOpen) return null

  const RATING_LABELS = {
    1: '1 Star — Poor Experience',
    2: '2 Stars — Below Average',
    3: '3 Stars — Average / Good',
    4: '4 Stars — Very Good (Recommended)',
    5: '5 Stars — Excellent (Top Tier Gym)',
  }

  const activeStar = hoverRating || rating

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setSubmitting(true)

    const res = await submitMemberGymReview({
      gymId: gym.id,
      rating,
      reviewText,
      reviewerName,
      aspects: {
        equipment: equipmentRating,
        cleanliness: cleanlinessRating,
        trainer: trainerRating,
        vibe: vibeRating,
      },
      memberId: member?.id,
    })

    setSubmitting(false)

    if (res.success) {
      setSuccessMsg('Review submitted successfully! Aapka review is gym ki city leaderboard ranking me jud chuka hai.')
      if (onSuccess) {
        onSuccess(res.review)
      }
      if (onReviewSubmitted) {
        onReviewSubmitted(res.review)
      }
      setTimeout(() => {
        onClose()
      }, 1500)
    } else {
      setErrorMsg(res.error || 'Failed to submit review.')
    }
  }

  return (
    <Modal title={`⭐ Rate & Review ${gym?.gym_name || 'Your Gym'}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '520px' }}>
        {/* Transparent Impact Notice */}
        <div
          style={{
            background: 'var(--amber-subtle, #fef3c7)',
            border: '1px solid var(--amber, #f59e0b)',
            borderRadius: '12px',
            padding: '10px 14px',
            fontSize: '12.5px',
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#b45309' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
          </span>
          <div>
            <b>Genuine Member Review Impact:</b>
            <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
              Aapka diya gaya review is gym ki city ranking (e.g. Udaipur 200+ Gyms) me <b>35% weightage</b> rakhta hai.
            </div>
          </div>
        </div>

        {/* Big Star Selector */}
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '8px' }}>
            Overall Experience Rating *
          </span>

          <div style={{ display: 'inline-flex', gap: '8px', cursor: 'pointer' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                style={{
                  fontSize: '36px',
                  color: star <= activeStar ? '#fbbf24' : 'var(--border)',
                  transition: 'transform 0.15s ease, color 0.15s ease',
                  transform: star <= activeStar ? 'scale(1.15)' : 'scale(1)',
                  userSelect: 'none',
                }}
              >
                ★
              </span>
            ))}
          </div>

          <div style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', marginTop: '6px' }}>
            {RATING_LABELS[activeStar] || 'Select your rating'}
          </div>
        </div>

        {/* Detailed Aspects Rating */}
        <div style={{ background: 'var(--card-hover)', borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Aspect Breakdown (Ratings)
          </span>

          {/* Aspect 1: Equipment */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                <path d="M6 5v14M18 5v14M2 9v6M22 9v6M6 12h12" />
              </svg>
              Machinery & Free Weights
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <span
                  key={s}
                  onClick={() => setEquipmentRating(s)}
                  style={{ cursor: 'pointer', color: s <= equipmentRating ? '#fbbf24' : 'var(--border)', fontSize: '18px' }}
                >
                  ★
                </span>
              ))}
            </div>
          </div>

          {/* Aspect 2: Cleanliness */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
              Hygiene & Cleanliness
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <span
                  key={s}
                  onClick={() => setCleanlinessRating(s)}
                  style={{ cursor: 'pointer', color: s <= cleanlinessRating ? '#fbbf24' : 'var(--border)', fontSize: '18px' }}
                >
                  ★
                </span>
              ))}
            </div>
          </div>

          {/* Aspect 3: Trainer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <polyline points="16 11 18 13 22 9" />
              </svg>
              Trainer & Coach Guidance
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <span
                  key={s}
                  onClick={() => setTrainerRating(s)}
                  style={{ cursor: 'pointer', color: s <= trainerRating ? '#fbbf24' : 'var(--border)', fontSize: '18px' }}
                >
                  ★
                </span>
              ))}
            </div>
          </div>

          {/* Aspect 4: Vibe */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              Workout Music & Vibe
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <span
                  key={s}
                  onClick={() => setVibeRating(s)}
                  style={{ cursor: 'pointer', color: s <= vibeRating ? '#fbbf24' : 'var(--border)', fontSize: '18px' }}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Written Review Feedback */}
        <div>
          <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>
            Your Detailed Review (Optional but helps rank)
          </label>
          <textarea
            rows={3}
            placeholder="Please share your genuine experience (e.g. gym atmosphere, equipment quality, trainer guidance)..."
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--input-bg, var(--card))',
              color: 'var(--text)',
              fontSize: '12.5px',
              lineHeight: 1.45,
            }}
          />
        </div>

        {/* Reviewer Name */}
        <div>
          <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>
            Reviewer Name (Verified Gym Member)
          </label>
          <input
            type="text"
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--input-bg, var(--card))',
              color: 'var(--text)',
              fontSize: '12.5px',
            }}
          />
        </div>

        {successMsg && <div className="alert success small">✓ {successMsg}</div>}
        {errorMsg && <div className="alert error small">✕ {errorMsg}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '4px' }}>
          <button type="button" className="btn secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>

          <button type="submit" className="btn primary" disabled={submitting}>
            <span>{submitting ? 'Submitting Review…' : 'Submit Genuine Review'}</span>
          </button>
        </div>
      </form>
    </Modal>
  )
}
