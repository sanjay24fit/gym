import { useState, useEffect } from 'react'
import ThemeToggle from '../ThemeToggle'
import LanguageToggle from '../LanguageToggle'
import { formatDate } from '../../lib/utils'
import { normalizePhone } from '../../lib/memberPortal'
import { supabase } from '../../lib/supabase'
import MemberReviewModal from '../MemberReviewModal'
import { getStoredMemberReview } from '../../lib/reviews'

export default function MemberProfileTab({
  member,
  gym,
  onLogout,
  onOpenPass = null,
  onOpenReview = null,
  memberReview = null,
}) {
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passLoading, setPassLoading] = useState(false)
  const [passError, setPassError] = useState('')
  const [passSuccess, setPassSuccess] = useState('')

  const [showReviewModal, setShowReviewModal] = useState(false)
  const [existingReview, setExistingReview] = useState(null)

  useEffect(() => {
    if (memberReview) {
      setExistingReview(memberReview)
    } else if (gym?.id) {
      const stored = getStoredMemberReview(gym.id, member?.id)
      if (stored) setExistingReview(stored)
    }
  }, [gym?.id, member?.id, memberReview])

  const gymPhone = gym?.phone || ''
  const cleanGymPhone = normalizePhone(gymPhone)
  const memberPhone = member?.phone || ''

  const handleCallGym = () => {
    if (cleanGymPhone) {
      window.location.href = `tel:+91${cleanGymPhone}`
    } else {
      alert('Gym contact number is not available.')
    }
  }

  const handleWhatsAppGym = () => {
    const text = `Hello ${gym?.owner_name || 'Gym Manager'}, I am ${member?.name || 'a member'} (ID: ${member?.id?.slice(0, 8) || 'N/A'}). I have a question regarding my membership at ${gym?.gym_name || 'the gym'}.`
    const url = cleanGymPhone
      ? `https://wa.me/91${cleanGymPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPassError('')
    setPassSuccess('')

    if (newPassword.length < 6) {
      setPassError('Password must be at least 6 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPassError('Passwords do not match.')
      return
    }

    setPassLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        setPassError(error.message || 'Failed to update password.')
      } else {
        setPassSuccess('Password updated successfully! You can now use your new password.')
        setNewPassword('')
        setConfirmPassword('')
        setTimeout(() => setShowPasswordModal(false), 2000)
      }
    } catch (err) {
      setPassError(err.message || 'An unexpected error occurred.')
    } finally {
      setPassLoading(false)
    }
  }

  return (
    <div className="member-profile-tab" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header Profile Card */}
      <div
        className="card"
        style={{
          padding: '24px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(20, 92, 67, 0.08) 0%, rgba(53, 185, 130, 0.05) 100%)',
          border: '1px solid rgba(20, 92, 67, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #145C43 0%, #35B982 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            fontWeight: 800,
            boxShadow: '0 8px 24px rgba(20, 92, 67, 0.35)',
            marginBottom: '14px',
          }}
        >
          {member?.name ? member.name.charAt(0).toUpperCase() : 'M'}
        </div>

        <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 800 }}>
          {member?.name || 'Gym Member'}
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span className="badge blue" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {member?.plan || 'Standard'} Member
          </span>
          <span className="badge gray" style={{ fontSize: '11px', fontFamily: 'monospace' }}>
            ID: {member?.id?.slice(0, 8).toUpperCase() || 'MEM-001'}
          </span>
        </div>

        {/* Member Quick Info Grid */}
        <div
          style={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '10px',
            marginTop: '8px',
          }}
        >
          <div
            style={{
              padding: '10px',
              borderRadius: '12px',
              background: 'var(--card, #fff)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="muted small" style={{ fontSize: '11px' }}>Mobile Number</div>
            <div style={{ fontWeight: 700, fontSize: '13px', marginTop: '2px' }}>
              +91 {memberPhone || 'N/A'}
            </div>
          </div>

          <div
            style={{
              padding: '10px',
              borderRadius: '12px',
              background: 'var(--card, #fff)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="muted small" style={{ fontSize: '11px' }}>Joined On</div>
            <div style={{ fontWeight: 700, fontSize: '13px', marginTop: '2px' }}>
              {member?.start_date ? formatDate(member.start_date) : 'Active'}
            </div>
          </div>
        </div>

        {onOpenPass && (
          <button
            type="button"
            className="btn full"
            onClick={onOpenPass}
            style={{
              marginTop: '16px',
              background: 'var(--card)',
              border: '1px solid var(--primary, #145C43)',
              color: 'var(--primary, #145C43)',
              fontWeight: 700,
              fontSize: '13px',
            }}
          >
            💳 View Digital VIP Membership Card
          </button>
        )}
      </div>

      {/* 2. Connected Gym Details Card */}
      <div className="card" style={{ padding: '20px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 2px', fontSize: '16px', fontWeight: 800 }}>
              🏢 {gym?.gym_name || 'Fitness Club'}
            </h3>
            <p className="muted small" style={{ margin: 0 }}>
              Managed by {gym?.owner_name || 'Gym Owner'}
            </p>
          </div>
          <span className="badge green" style={{ fontSize: '11px' }}>Connected</span>
        </div>

        {/* Timings & Facility Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'var(--hover)', border: '1px solid var(--border)' }}>
            <div className="muted small" style={{ fontSize: '11px' }}>🌅 Morning Batch</div>
            <div style={{ fontWeight: 700, fontSize: '13px', marginTop: '3px' }}>6:00 AM – 11:00 AM</div>
          </div>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'var(--hover)', border: '1px solid var(--border)' }}>
            <div className="muted small" style={{ fontSize: '11px' }}>🌆 Evening Batch</div>
            <div style={{ fontWeight: 700, fontSize: '13px', marginTop: '3px' }}>4:00 PM – 10:00 PM</div>
          </div>
        </div>

        {/* Contact Gym Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            type="button"
            className="btn"
            onClick={handleCallGym}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '11px',
              fontWeight: 700,
              fontSize: '13px',
              background: 'var(--card)',
              border: '1px solid var(--border)',
            }}
          >
            <span>📞</span> Call Gym
          </button>

          <button
            type="button"
            className="btn"
            onClick={handleWhatsAppGym}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '11px',
              fontWeight: 700,
              fontSize: '13px',
              background: '#25D366',
              color: '#fff',
              border: 'none',
            }}
          >
            <span>💬</span> WhatsApp
          </button>
        </div>
      </div>

      {/* ⭐ Rate & Review Your Gym (Decides City Leaderboard Ranking) */}
      <div
        className="card"
        style={{
          padding: '20px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.04) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '18px' }}>⭐</span>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                Rate & Review {gym?.gym_name || 'Your Gym'}
              </h3>
            </div>
            <p className="muted small" style={{ margin: '4px 0 0', lineHeight: 1.45 }}>
              Aapka genuine feedback is gym ki city leaderboard ranking (e.g. Udaipur 200+ Gyms) me <b>35% weightage</b> rakhta hai!
            </p>
          </div>

          <button
            type="button"
            className="btn sm"
            onClick={() => (onOpenReview ? onOpenReview() : setShowReviewModal(true))}
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#FFFFFF',
              border: 'none',
              padding: '6px 14px',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
            }}
          >
            {existingReview ? '✏️ Edit Review' : '⭐ Write Review'}
          </button>
        </div>

        {existingReview ? (
          <div style={{ background: 'var(--card)', borderRadius: '10px', padding: '10px 14px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ color: '#fbbf24', fontSize: '15px' }}>
                {'★'.repeat(existingReview.rating)}{'☆'.repeat(5 - existingReview.rating)}
              </span>
              <b style={{ fontSize: '12.5px' }}>{existingReview.rating} / 5 Stars</b>
              <span className="badge green" style={{ fontSize: '10px', padding: '1px 6px' }}>Verified Member Review</span>
            </div>
            {existingReview.reviewText && (
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text)', fontStyle: 'italic', opacity: 0.9 }}>
                "{existingReview.reviewText}"
              </p>
            )}
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: 'var(--muted)', background: 'var(--card)', padding: '8px 12px', borderRadius: '8px', border: '1px dashed var(--border)' }}>
            Machinery, cleanliness, aur trainers ke baare me apna review dein taaki aapka gym rank me aage badhe.
          </div>
        )}
      </div>

      {/* 3. Gym Rules & Etiquette Card */}
      <div className="card" style={{ padding: '20px', borderRadius: '16px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700 }}>
          📋 Gym Etiquette & Guidelines
        </h3>
        <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--muted)' }}>
          <li>Always bring an individual towel and water bottle during workouts.</li>
          <li>Re-rack all dumbbells, barbells, and weight plates after your sets.</li>
          <li>Wipe down machine benches and sweat grips after use.</li>
          <li>Wear proper athletic shoes and sportswear on the gym floor.</li>
          <li>Show your QR pass or digital membership card at the check-in desk.</li>
        </ul>
      </div>

      {/* 4. App & Account Settings */}
      <div className="card" style={{ padding: '20px', borderRadius: '16px' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 700 }}>
          ⚙️ App Settings & Preferences
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Theme Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>Theme Appearance</div>
              <div className="muted small">Switch between Dark and Light mode</div>
            </div>
            <ThemeToggle size="sm" />
          </div>

          {/* Language Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>App Language</div>
              <div className="muted small">English / Hinglish interface</div>
            </div>
            <LanguageToggle size="sm" />
          </div>

          {/* Change Password Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>Security & Password</div>
              <div className="muted small">Update your account login password</div>
            </div>
            <button
              type="button"
              className="btn sm"
              onClick={() => {
                setPassError('')
                setPassSuccess('')
                setShowPasswordModal(true)
              }}
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              🔒 Change
            </button>
          </div>
        </div>
      </div>

      {/* 5. Logout & Version Card */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px', marginBottom: '20px' }}>
        <button
          type="button"
          className="btn danger full"
          onClick={onLogout}
          style={{
            padding: '12px',
            fontWeight: 700,
            fontSize: '14px',
            borderRadius: '12px',
          }}
        >
          🚪 Sign Out from Member Account
        </button>

        <p className="muted small" style={{ textAlign: 'center', margin: '4px 0 0', fontSize: '11px' }}>
          Gym Manager v2.0 • Secured with Supabase Cloud
        </p>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '380px', width: '92%', borderRadius: '20px', padding: '24px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>🔒 Change Password</h3>
              <button
                type="button"
                className="btn sm"
                onClick={() => setShowPasswordModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                New Password
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ padding: '10px 12px', borderRadius: '10px' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                Confirm New Password
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ padding: '10px 12px', borderRadius: '10px' }}
                />
              </label>

              {passError && <div className="alert error" style={{ fontSize: '12px', padding: '8px 12px' }}>{passError}</div>}
              {passSuccess && <div className="alert success" style={{ fontSize: '12px', padding: '8px 12px' }}>{passSuccess}</div>}

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn full"
                  onClick={() => setShowPasswordModal(false)}
                  disabled={passLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn primary full"
                  disabled={passLoading}
                >
                  {passLoading ? 'Updating…' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Review & Rating Modal */}
      <MemberReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        gym={gym}
        member={member}
        onReviewSubmitted={(saved) => setExistingReview(saved)}
      />
    </div>
  )
}

