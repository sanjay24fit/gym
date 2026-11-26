import { useState, useRef } from 'react'
import { formatDate, daysLeft } from '../lib/utils'
import { supabase } from '../lib/supabase'
import WhatsAppSupport from './WhatsAppSupport'
import Modal from './Modal'
import { useTheme } from '../lib/theme'
import LanguageToggle from './LanguageToggle'
import { getRazorpayMeUrl } from '../lib/razorpay'
import { updateGymLocation } from '../lib/ranking'
import SubscriptionPricingModal from './SubscriptionPricingModal'

function compressImage(file, maxWidth = 500, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxWidth) {
            width = Math.round((width * maxWidth) / height)
            height = maxWidth
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(dataUrl)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

const STANDARD_FACILITIES_METADATA = [
  {
    id: 'cardio',
    label: 'Cardio Zone (Treadmill, Cycles, Steppers)',
    title: 'Cardio Zone',
    sub: '(Treadmill, Cycles, Steppers)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    id: 'strength',
    label: 'Strength & Heavy Free Weights',
    title: 'Strength & Heavy',
    sub: 'Free Weights',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 5v14M18 5v14M2 9v6M22 9v6M6 12h12" />
      </svg>
    ),
  },
  {
    id: 'pt',
    label: 'Personal Training (Certified Coaches)',
    title: 'Personal Training',
    sub: '(Certified Coaches)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    id: 'crossfit',
    label: 'CrossFit & Functional Rig',
    title: 'CrossFit & Functional Rig',
    sub: '',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    id: 'zumba',
    label: 'Zumba & Aerobics Studio',
    title: 'Zumba & Aerobics Studio',
    sub: '',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="2" />
        <path d="m9 20 3-6 3 6" />
        <path d="m6 8 6 2 6-2" />
        <path d="M12 10v4" />
      </svg>
    ),
  },
  {
    id: 'yoga',
    label: 'Yoga & Pilates Dedicated Hall',
    title: 'Yoga & Pilates',
    sub: 'Dedicated Hall',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="4" r="2" />
        <path d="M15 8h-6l-2 5 4 1v6" />
        <path d="m14 14 3-1 2 5" />
      </svg>
    ),
  },
  {
    id: 'steam',
    label: 'Steam Bath & Sauna',
    title: 'Steam Bath & Sauna',
    sub: '',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 4v4M8 6v4M16 6v4" />
        <path d="M4 14a8 8 0 0 0 16 0H4z" />
      </svg>
    ),
  },
  {
    id: 'lockers',
    label: 'VIP Lockers & Changing Showers',
    title: 'VIP Lockers & Changing Showers',
    sub: '',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3c0 .8.4 1.5 1 2l-7 7.5a2 2 0 0 0 1.4 3.5H19.6a2 2 0 0 0 1.4-3.5L14 7c.6-.5 1-1.2 1-2a3 3 0 0 0-3-3z" />
      </svg>
    ),
  },
  {
    id: 'diet',
    label: 'Nutrition & Diet Consultation',
    title: 'Nutrition & Diet Consultation',
    sub: '',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a4 4 0 0 1 4 4c0 .8-.2 1.5-.6 2.1C17.8 9.2 20 11.8 20 15a7 7 0 0 1-14 0c0-3.2 2.2-5.8 4.6-6.9A4 4 0 0 1 12 2z" />
        <path d="M12 6a2 2 0 0 0-2 2" />
      </svg>
    ),
  },
]

export default function GymProfile({
  gym,
  userEmail,
  onLogout,
  onRefresh,
  isInstalled = false,
  onDownloadApp,
  onGymUpdated = null,
}) {
  const { theme, setTheme } = useTheme()
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  const [payError, setPayError] = useState('')
  const [paySuccess, setPaySuccess] = useState('')
  const [showPricingModal, setShowPricingModal] = useState(false)

  // Gym Owner Profile Photo state & upload
  const [ownerPhoto, setOwnerPhoto] = useState(() => {
    try {
      return (
        gym?.owner_photo ||
        gym?.avatar_url ||
        gym?.logo_url ||
        localStorage.getItem(`gym_owner_photo_${gym?.id}`) ||
        localStorage.getItem('gym_owner_photo_current') ||
        ''
      )
    } catch {
      return ''
    }
  })
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [photoSuccess, setPhotoSuccess] = useState('')
  const fileInputRef = useRef(null)

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image file (JPG, PNG, WEBP).')
      return
    }
    setUploadingPhoto(true)
    setPhotoError('')
    setPhotoSuccess('')

    try {
      const compressedDataUrl = await compressImage(file, 500, 0.85)
      setOwnerPhoto(compressedDataUrl)

      // 1. Cache locally for instant persistence
      if (gym?.id) {
        try {
          localStorage.setItem(`gym_owner_photo_${gym.id}`, compressedDataUrl)
        } catch {}
      }
      try {
        localStorage.setItem('gym_owner_photo_current', compressedDataUrl)
      } catch {}

      // 2. Save to auth user metadata
      try {
        await supabase.auth.updateUser({
          data: {
            owner_photo: compressedDataUrl,
            avatar_url: compressedDataUrl,
          },
        })
      } catch {}

      // 3. Save to gyms table in Supabase
      if (gym?.id) {
        try {
          await supabase
            .from('gyms')
            .update({
              owner_photo: compressedDataUrl,
              logo_url: compressedDataUrl,
            })
            .eq('id', gym.id)
        } catch (dbErr) {
          try {
            await supabase
              .from('gyms')
              .update({ logo_url: compressedDataUrl })
              .eq('id', gym.id)
          } catch {}
        }
      }

      setPhotoSuccess('Profile photo updated successfully!')
      if (onGymUpdated) {
        onGymUpdated({ owner_photo: compressedDataUrl, logo_url: compressedDataUrl })
      }
      if (onRefresh) {
        onRefresh()
      }
    } catch (err) {
      setPhotoError(err.message || 'Failed to upload photo.')
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemovePhoto = async () => {
    setOwnerPhoto('')
    setPhotoSuccess('Profile photo removed.')
    if (gym?.id) {
      try {
        localStorage.removeItem(`gym_owner_photo_${gym.id}`)
      } catch {}
    }
    try {
      localStorage.removeItem('gym_owner_photo_current')
    } catch {}

    try {
      await supabase.auth.updateUser({
        data: {
          owner_photo: null,
          avatar_url: null,
        },
      })
    } catch {}

    if (gym?.id) {
      try {
        await supabase
          .from('gyms')
          .update({ owner_photo: null, logo_url: null })
          .eq('id', gym.id)
      } catch {}
    }

    if (onGymUpdated) {
      onGymUpdated({ owner_photo: null, logo_url: null })
    }
  }

  const localSaved = (() => {
    try {
      const raw = localStorage.getItem(`gym_location_${gym?.id}`)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })()

  const [selectedCity, setSelectedCity] = useState(localSaved?.city || gym?.city || 'Udaipur')
  const [selectedState, setSelectedState] = useState(localSaved?.state || gym?.state || 'Rajasthan')
  const [selectedPincode, setSelectedPincode] = useState(localSaved?.pincode || gym?.pincode || '')
  const [selectedArea, setSelectedArea] = useState(localSaved?.area || gym?.area || 'City Center')
  const [gymFacilities, setGymFacilities] = useState(() => {
    if (Array.isArray(localSaved?.facilities) && localSaved.facilities.length > 0) return localSaved.facilities
    if (Array.isArray(gym?.facilities) && gym.facilities.length > 0) return gym.facilities
    return ['Cardio Zone (Treadmill, Cycles, Steppers)', 'Strength & Heavy Free Weights', 'Personal Training (Certified Coaches)']
  })

  // Custom facility list state (allows gym owners to add their own facilities)
  const [customFacilityList, setCustomFacilityList] = useState(() => {
    try {
      const raw = localStorage.getItem(`gym_custom_facilities_${gym?.id}`)
      const saved = raw ? JSON.parse(raw) : []
      const standardLabels = STANDARD_FACILITIES_METADATA.map((f) => f.label)
      const existingFromGym = (gymFacilities || []).filter((f) => !standardLabels.includes(f))
      return Array.from(new Set([...saved, ...existingFromGym]))
    } catch {
      return []
    }
  })
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [newCustomFacilityName, setNewCustomFacilityName] = useState('')

  const handleAddCustomFacility = (e) => {
    if (e) e.preventDefault()
    const trimmed = newCustomFacilityName.trim()
    if (!trimmed) return
    if (!customFacilityList.includes(trimmed)) {
      const updated = [...customFacilityList, trimmed]
      setCustomFacilityList(updated)
      try {
        localStorage.setItem(`gym_custom_facilities_${gym?.id}`, JSON.stringify(updated))
      } catch {}
    }
    if (!gymFacilities.includes(trimmed)) {
      setGymFacilities((prev) => [...prev, trimmed])
    }
    setNewCustomFacilityName('')
    setShowCustomInput(false)
  }

  const handleRemoveCustomFacility = (facilityName) => {
    const updated = customFacilityList.filter((f) => f !== facilityName)
    setCustomFacilityList(updated)
    setGymFacilities((prev) => prev.filter((f) => f !== facilityName))
    try {
      localStorage.setItem(`gym_custom_facilities_${gym?.id}`, JSON.stringify(updated))
    } catch {}
  }
  const [savingLocation, setSavingLocation] = useState(false)
  const [locationSuccess, setLocationSuccess] = useState('')
  const [locationError, setLocationError] = useState('')

  async function handleSaveLocation(e) {
    e.preventDefault()
    setSavingLocation(true)
    setLocationError('')
    setLocationSuccess('')

    // Immediately cache in localStorage for instant persistence
    const savedPayload = {
      city: selectedCity,
      state: selectedState,
      pincode: selectedPincode,
      area: selectedArea,
      facilities: gymFacilities,
    }
    if (gym?.id) {
      try {
        localStorage.setItem(`gym_location_${gym.id}`, JSON.stringify(savedPayload))
      } catch {
        // Non-blocking
      }
    }

    const res = await updateGymLocation({
      city: selectedCity,
      state: selectedState,
      pincode: selectedPincode,
      area: selectedArea,
      facilities: gymFacilities,
    })
    setSavingLocation(false)
    if (res.success) {
      setLocationSuccess(res.notice || 'Gym location and facilities saved! City leaderboard rank updated.')
      if (onRefresh) onRefresh()
    } else {
      setLocationError(res.error || 'Failed to update location.')
    }
  }

  const validUntil = gym?.valid_until
  const daysRemaining = validUntil ? daysLeft(validUntil) : null
  // D3: explicit backend field — 'trial' until the first verified payment
  // (verify-payment.js sets 'active'); missing field = not a trial.
  const isTrial = gym?.subscription_status === 'trial'

  async function handlePasswordSubmit(e) {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (!currentPassword) {
      setPasswordError('Please enter your current password.')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }

    setPasswordLoading(true)

    // Verify current password first via Supabase auth
    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword,
    })

    if (verifyErr) {
      setPasswordLoading(false)
      setPasswordError('Incorrect current password. Please try again.')
      return
    }

    // Current password verified -> proceed to update password
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordLoading(false)

    if (updateErr) {
      setPasswordError(updateErr.message)
    } else {
      setPasswordSuccess('Password successfully updated!')
      setTimeout(() => {
        setShowPasswordModal(false)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setPasswordSuccess('')
      }, 1500)
    }
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div className="section-head" style={{ marginBottom: '16px' }}>
        <div>
          <h2>Gym & Account Settings</h2>
          <span className="muted small">Manage your gym profile and subscription status</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Gym Owner Profile & Photo Identity Card */}
        <div className="card owner-profile-card">
          <div className="owner-profile-header">
            {/* Clickable Profile Avatar with Camera Icon Overlay */}
            <div
              className="owner-avatar-container"
              onClick={() => fileInputRef.current?.click()}
              title="Click to upload or change profile photo"
            >
              {ownerPhoto ? (
                <img
                  src={ownerPhoto}
                  alt={gym?.owner_name || 'Gym Owner'}
                  className="owner-avatar-img"
                />
              ) : (
                <div className="owner-avatar-fallback">
                  {gym?.owner_name ? gym.owner_name.slice(0, 2).toUpperCase() : (gym?.gym_name ? gym.gym_name.slice(0, 2).toUpperCase() : 'GM')}
                </div>
              )}
              <div className="owner-avatar-camera-badge" title="Upload/Change Photo">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handlePhotoSelect}
              />
            </div>

            {/* Owner Details & Upload / Remove Controls */}
            <div className="owner-profile-details">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: 'var(--text)' }}>
                  {gym?.owner_name || 'Gym Owner'}
                </h3>
                <span className="owner-verified-pill" title="Verified Gym Owner Profile">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m9 12 2 2 4-4" stroke="#ffffff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Verified Gym Owner</span>
                </span>
              </div>

              <span className="muted small" style={{ marginTop: '2px', display: 'block', fontWeight: 600 }}>
                {gym?.gym_name || 'Gym Manager'}
              </span>

              <div className="owner-photo-actions-row">
                <button
                  type="button"
                  className="btn-upload-photo"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span>{uploadingPhoto ? 'Uploading…' : ownerPhoto ? 'Change Photo' : 'Upload Profile Photo'}</span>
                </button>
                {ownerPhoto && (
                  <button
                    type="button"
                    className="btn-remove-photo"
                    onClick={handleRemovePhoto}
                    title="Remove profile photo"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {photoSuccess && <div className="alert success small" style={{ marginTop: '12px' }}>✓ {photoSuccess}</div>}
          {photoError && <div className="alert error small" style={{ marginTop: '12px' }}>✕ {photoError}</div>}

          <div className="row" style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', marginTop: '14px' }}>
            <div>
              <span className="small muted block">Login Email:</span>
              <b>{userEmail || gym?.email}</b>
            </div>
            <div>
              <span className="small muted block">Contact Phone:</span>
              <b>{gym?.phone || 'Not provided'}</b>
            </div>
          </div>
        </div>

        {/* Gym Location & City Leaderboard Settings */}
        <form className="card" onSubmit={handleSaveLocation}>
          <div className="section-head" style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>Gym City & Ranking Location</span>
              </h4>
              <span className="muted small">Set your city and area for the City Leaderboard & Market Ranking</span>
            </div>
            <span className="badge purple" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
              </svg>
              <span>Leaderboard Active</span>
            </span>
          </div>

          <p className="small muted" style={{ marginBottom: '14px' }}>
            Aapka gym kis city me operate karta hai? City select karne par aapka gym us city ke total gyms (e.g. Udaipur 200+ Gyms) me rank hoga.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>
                City (Ranking Region) *
              </label>
              <input
                type="text"
                placeholder="e.g. Udaipur"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                required
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--input-bg, var(--card))', color: 'var(--text)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>
                State *
              </label>
              <input
                type="text"
                placeholder="e.g. Rajasthan"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                required
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--input-bg, var(--card))', color: 'var(--text)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>
                PIN Code *
              </label>
              <input
                type="text"
                placeholder="e.g. 313001"
                maxLength={6}
                value={selectedPincode}
                onChange={(e) => setSelectedPincode(e.target.value)}
                required
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--input-bg, var(--card))', color: 'var(--text)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>
                Area / Locality *
              </label>
              <input
                type="text"
                placeholder="e.g. Hiran Magri / City Center"
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                required
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--input-bg, var(--card))', color: 'var(--text)' }}
              />
            </div>
          </div>

          {/* Plan Features / Facilities Card (Matching User's Screenshot) */}
          <div className="plan-features-card">
            {/* Dark green header banner with gold star */}
            <div className="plan-features-header">
              <span className="plan-features-star" role="img" aria-label="Features">⭐</span>
              <div className="plan-features-header-text">
                <h3>Choose Your Plan Features</h3>
                <p>Select the features you want to activate</p>
              </div>
            </div>

            {/* List of features */}
            <div className="plan-features-list">
              {STANDARD_FACILITIES_METADATA.map((f) => {
                const checked = gymFacilities.includes(f.label)
                return (
                  <div
                    key={f.id}
                    className="plan-feature-row"
                    onClick={() => {
                      if (checked) {
                        setGymFacilities(gymFacilities.filter((x) => x !== f.label))
                      } else {
                        setGymFacilities([...gymFacilities, f.label])
                      }
                    }}
                  >
                    <div className="plan-feature-left">
                      <div className="plan-feature-icon-wrap">
                        {f.icon}
                      </div>
                      <div className="plan-feature-text">
                        <span className="plan-feature-title">{f.title}</span>
                        {f.sub && <span className="plan-feature-sub">{f.sub}</span>}
                      </div>
                    </div>
                    <div className="plan-feature-right">
                      <div className={`plan-feature-checkbox ${checked ? 'checked' : ''}`}>
                        {checked && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Custom Facilities Added by Gym Owner */}
              {customFacilityList.map((customName) => {
                const checked = gymFacilities.includes(customName)
                return (
                  <div
                    key={customName}
                    className="plan-feature-row custom"
                    onClick={() => {
                      if (checked) {
                        setGymFacilities(gymFacilities.filter((x) => x !== customName))
                      } else {
                        setGymFacilities([...gymFacilities, customName])
                      }
                    }}
                  >
                    <div className="plan-feature-left">
                      <div className="plan-feature-icon-wrap custom-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      </div>
                      <div className="plan-feature-text">
                        <span className="plan-feature-title">{customName}</span>
                        <span className="plan-feature-sub custom-tag">Custom Facility · Owner Added</span>
                      </div>
                    </div>
                    <div className="plan-feature-right">
                      <button
                        type="button"
                        className="plan-feature-remove-btn"
                        title="Delete custom facility"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveCustomFacility(customName)
                        }}
                      >
                        ✕
                      </button>
                      <div className={`plan-feature-checkbox ${checked ? 'checked' : ''}`}>
                        {checked && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Custom Facility Addition Section */}
            <div className="custom-facility-section">
              {!showCustomInput ? (
                <button
                  type="button"
                  className="custom-facility-toggle-btn"
                  onClick={() => setShowCustomInput(true)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>+ Add Custom Facility</span>
                </button>
              ) : (
                <div className="custom-facility-input-row">
                  <input
                    type="text"
                    className="custom-facility-input"
                    placeholder="e.g. Swimming Pool, MMA Ring, Juice Bar..."
                    value={newCustomFacilityName}
                    onChange={(e) => setNewCustomFacilityName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddCustomFacility()
                      }
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="custom-facility-add-btn"
                    onClick={handleAddCustomFacility}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    className="custom-facility-cancel-btn"
                    onClick={() => {
                      setShowCustomInput(false)
                      setNewCustomFacilityName('')
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {locationSuccess && <div className="alert success small" style={{ marginBottom: '12px' }}>✓ {locationSuccess}</div>}
          {locationError && <div className="alert error small" style={{ marginBottom: '12px' }}>✕ {locationError}</div>}

          {/* Full-width Save City & Facilities Button with Disk Icon and Arrow */}
          <button
            type="submit"
            className="btn-save-facilities-full"
            disabled={savingLocation}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            <span>{savingLocation ? 'Updating Location & Facilities…' : 'Save City & Facilities'}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </form>

        {/* Redesigned Premium Subscription & Validity Card */}
        <div className="sub-status-card">
          <div className="sub-status-card-glow" aria-hidden="true" />

          <div className="sub-status-header">
            <div className="sub-status-title-group">
              <div className="sub-status-crown-badge" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
                </svg>
              </div>
              <div>
                <h4 className="sub-status-title">Subscription Status</h4>
                <span className="small muted block" style={{ fontSize: '12px' }}>
                  Professional Gym Management SaaS
                </span>
              </div>
            </div>

            <div className={`sub-status-badge ${daysRemaining !== null && daysRemaining <= 0 ? 'expired' : isTrial ? 'trial' : 'active'}`}>
              <span className="sub-pulse-dot" />
              <span>{daysRemaining !== null && daysRemaining <= 0 ? 'Expired' : isTrial ? 'Free Trial' : 'Active Plan'}</span>
            </div>
          </div>

          <p className="sub-status-desc">
            Your Gym Manager {isTrial ? '21-day free trial' : 'subscription'} gives you unlimited members, paper register scanning, automated dues tracking, and instant member passes.
          </p>

          {/* Metric Tiles Grid */}
          <div className="sub-metrics-grid">
            <div className="sub-metric-tile">
              <div className="sub-metric-label-row">
                <svg className="sub-metric-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>{isTrial ? 'Trial Valid Until' : 'Plan Valid Until'}</span>
              </div>
              <span className="sub-metric-value">
                {validUntil ? formatDate(validUntil) : 'Unlimited Access'}
              </span>
            </div>

            <div className="sub-metric-tile">
              <div className="sub-metric-label-row">
                <svg className="sub-metric-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Remaining Days</span>
              </div>
              <span className={`sub-metric-value ${daysRemaining !== null ? (daysRemaining <= 0 ? 'highlight-red' : daysRemaining <= 7 ? 'highlight-red' : 'highlight-green') : 'highlight-green'}`}>
                {daysRemaining !== null ? (daysRemaining >= 0 ? `${daysRemaining} days remaining` : 'Expired') : 'No expiry limit'}
              </span>
            </div>

            <div className="sub-metric-tile">
              <div className="sub-metric-label-row">
                <svg className="sub-metric-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Included Access</span>
              </div>
              <span className="sub-metric-value highlight-green">
                All Pro Features Active
              </span>
            </div>
          </div>

          {payError && <div className="alert error small" style={{ marginBottom: '14px' }}>{payError}</div>}
          {paySuccess && <div className="alert success small" style={{ marginBottom: '14px' }}>{paySuccess}</div>}

          {/* Action Buttons */}
          <div className="sub-status-actions">
            <button
              type="button"
              className="sub-renew-btn"
              onClick={() => {
                setPayError('')
                setPaySuccess('')
                setShowPricingModal(true)
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              <span>Renew / Upgrade Plan</span>
            </button>

            <a
              href={getRazorpayMeUrl(499)}
              target="_blank"
              rel="noopener noreferrer"
              className="sub-upi-btn"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <span>Direct UPI / QR (Gym Manager)</span>
            </a>
          </div>

          <div className="sub-trust-note">
            <span>🔒 Secure 256-bit encrypted checkout via Razorpay & UPI · Instant automatic renewal</span>
          </div>
        </div>

        {/* Subscription Renewal Pricing Offers Modal */}
        {showPricingModal && (
          <SubscriptionPricingModal
            gym={gym}
            userEmail={userEmail}
            onClose={() => setShowPricingModal(false)}
            onSuccess={(data) => {
              setPaySuccess(data.message || 'Payment confirmed! Subscription extended.')
              if (onRefresh) onRefresh()
            }}
          />
        )}

        {/* Theme & Appearance */}
        <div className="card settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <b>Theme & Appearance / थीम</b>
            <span className="small muted block">
              {theme === 'dark' ? 'Forest Charcoal (Dark Mode active)' : 'Off-White Emerald (Light Mode active)'}
            </span>
          </div>

          <div
            className="theme-segmented-toggle"
            role="radiogroup"
            aria-label="Theme Selection"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'var(--card-subtle, rgba(0, 0, 0, 0.06))',
              border: '1.5px solid var(--border)',
              borderRadius: '999px',
              padding: '3px',
              gap: '4px',
              userSelect: 'none',
            }}
          >
            {/* Light Mode Option with Sun SVG Icon */}
            <button
              type="button"
              role="radio"
              aria-checked={theme === 'light'}
              onClick={() => setTheme('light')}
              title="Switch to Light Mode"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '999px',
                border: theme === 'light' ? '1px solid var(--border)' : '1px solid transparent',
                background: theme === 'light' ? 'var(--card, #FFFFFF)' : 'transparent',
                color: theme === 'light' ? 'var(--primary, #FF6200)' : 'var(--text-secondary, #718096)',
                fontWeight: theme === 'light' ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: theme === 'light' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.18s ease',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: theme === 'light' ? '#D97706' : 'currentColor' }}
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
              <span>Light Mode</span>
            </button>

            {/* Dark Mode Option with Half Moon SVG Icon */}
            <button
              type="button"
              role="radio"
              aria-checked={theme === 'dark'}
              onClick={() => setTheme('dark')}
              title="Switch to Dark Mode"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '999px',
                border: theme === 'dark' ? '1px solid var(--border)' : '1px solid transparent',
                background: theme === 'dark' ? 'var(--card, #151821)' : 'transparent',
                color: theme === 'dark' ? 'var(--accent, #FF6200)' : 'var(--text-secondary, #718096)',
                fontWeight: theme === 'dark' ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: theme === 'dark' ? '0 2px 6px rgba(0,0,0,0.18)' : 'none',
                transition: 'all 0.18s ease',
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill={theme === 'dark' ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: theme === 'dark' ? 'var(--accent, #FF6200)' : 'currentColor' }}
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
              <span>Dark Mode</span>
            </button>
          </div>
        </div>

        {/* Language & Regional Settings Card */}
        <div className="card settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <b>App Language / भाषा</b>
            <span className="small muted block">Choose your preferred language (हिन्दी, English, मराठी, etc.)</span>
          </div>
          <LanguageToggle />
        </div>

        {/* Password & Security */}
        <div className="card settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <b>Password & Security</b>
            <span className="small muted block">Update your login password</span>
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setPasswordError('')
              setPasswordSuccess('')
              setShowPasswordModal(true)
            }}
          >
            Change Password
          </button>
        </div>

        {/* Download App (PWA) */}
        {!isInstalled && onDownloadApp && (
          <div className="card settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <b>Install Mobile App (iOS / Android)</b>
              <span className="small muted block">Install Gym Manager directly onto your iPhone or Android phone for fast full-screen access</span>
            </div>
            <button
              type="button"
              className="btn accent"
              onClick={onDownloadApp}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Install App</span>
            </button>
          </div>
        )}

        {/* Customer Support Card */}
        <div className="card">
          <div className="section-head" style={{ marginBottom: '8px' }}>
            <h4>Help & Technical Support</h4>
          </div>
          <p className="small muted" style={{ marginBottom: '14px' }}>
            Need help? Contact support.
          </p>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <WhatsAppSupport />
          </div>
        </div>

        {/* Account Actions */}
        <div className="card settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <b>Sign Out</b>
            <span className="small muted block">Log out of your gym owner account on this device</span>
          </div>
          <button
            type="button"
            className="btn danger"
            onClick={() => setShowLogoutModal(true)}
          >
            Logout
          </button>
        </div>
      </div>

      {showPasswordModal && (
        <Modal
          title="Change Password"
          onClose={() => {
            setShowPasswordModal(false)
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
            setPasswordError('')
          }}
        >
          <form onSubmit={handlePasswordSubmit}>
            <label>
              Current Password *
              <div style={{ position: 'relative' }}>
                <input
                  required
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    padding: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showCurrentPassword ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </label>

            <label style={{ marginTop: '12px' }}>
              New Password *
              <div style={{ position: 'relative' }}>
                <input
                  required
                  type={showNewPassword ? 'text' : 'password'}
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    padding: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showNewPassword ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </label>

            <label style={{ marginTop: '12px' }}>
              Confirm New Password *
              <input
                required
                type={showNewPassword ? 'text' : 'password'}
                minLength={6}
                placeholder="Re-enter new password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>

            {passwordError && <div className="alert error" style={{ marginTop: '12px' }}>{passwordError}</div>}
            {passwordSuccess && <div className="alert success" style={{ marginTop: '12px' }}>{passwordSuccess}</div>}

            <div className="dialog-actions" style={{ marginTop: '18px' }}>
              <button
                type="button"
                className="btn"
                disabled={passwordLoading}
                onClick={() => {
                  setShowPasswordModal(false)
                  setCurrentPassword('')
                  setNewPassword('')
                  setConfirmPassword('')
                  setPasswordError('')
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn primary"
                disabled={passwordLoading || !!passwordSuccess}
              >
                {passwordLoading ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showLogoutModal && (
        <Modal title="Confirm Sign Out" onClose={() => setShowLogoutModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.5, color: 'var(--text)' }}>
              Are you sure you want to log out?
            </p>
            <div className="modal-actions" style={{ marginTop: '16px' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn danger-solid"
                onClick={() => {
                  setShowLogoutModal(false)
                  onLogout()
                }}
              >
                Log Out
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
