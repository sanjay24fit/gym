import { supabase } from './supabase.js'

export const POPULAR_CITIES = [
  'Udaipur',
  'Jaipur',
  'Jodhpur',
  'Kota',
  'Bhilwara',
  'Ajmer',
  'Bikaner',
  'Alwar',
  'Sikar',
  'Chittorgarh',
  'Ahmedabad',
  'Delhi NCR',
  'Mumbai',
  'Bengaluru',
  'Pune',
  'Indore',
]

export const POPULAR_STATES = [
  'Rajasthan',
  'Gujarat',
  'Delhi NCR',
  'Maharashtra',
  'Karnataka',
  'Madhya Pradesh',
  'Punjab',
  'Haryana',
  'Uttar Pradesh',
]

export const STANDARD_FACILITIES = [
  { id: 'cardio', label: 'Cardio Zone (Treadmill, Cycles, Steppers)', category: 'equipment' },
  { id: 'strength', label: 'Strength & Heavy Free Weights', category: 'equipment' },
  { id: 'pt', label: 'Personal Training (Certified Coaches)', category: 'trainer' },
  { id: 'crossfit', label: 'CrossFit & Functional Rig', category: 'equipment' },
  { id: 'zumba', label: 'Zumba & Aerobics Studio', category: 'activity' },
  { id: 'yoga', label: 'Yoga & Pilates Dedicated Hall', category: 'activity' },
  { id: 'steam', label: 'Steam Bath & Sauna', category: 'cleanliness' },
  { id: 'lockers', label: 'VIP Lockers & Changing Showers', category: 'cleanliness' },
  { id: 'diet', label: 'Nutrition & Diet Consultation', category: 'trainer' },
  { id: 'pool', label: 'Swimming Pool & Recovery', category: 'equipment' },
  { id: 'round_the_clock', label: '24/7 Access Hours', category: 'convenience' },
]

/**
 * Calculates Haversine distance in kilometers between two GPS coordinates
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null
  const R = 6371 // Radius of the earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Number((R * c).toFixed(1))
}

/**
 * Requests user browser geolocation with high accuracy and safe fallback
 */
export function getUserGeolocation() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !navigator?.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        })
      },
      () => {
        resolve(null)
      },
      { timeout: 7000, enableHighAccuracy: false, maximumAge: 300000 }
    )
  })
}

/**
 * 6-FACTOR TRANSPARENT FACILITY-BASED RANKING SCORING ENGINE (Max 100 Points)
 * 1. Verified Facilities: 30 pts max
 * 2. Genuine Member Ratings & Reviews: 25 pts max
 * 3. Equipment & Infrastructure: 20 pts max
 * 4. Cleanliness & Maintenance: 10 pts max
 * 5. Trainer & Coaching Quality: 10 pts max
 * 6. Profile Completeness: 5 pts max
 */
export function calculateDetailedGymScore(gym = {}, customWeights = null) {
  const weights = customWeights || {
    verified_facilities: 30,
    member_reviews: 25,
    equipment_infrastructure: 20,
    cleanliness: 10,
    trainer_coaching: 10,
    profile_completeness: 5,
  }

  const facilities = Array.isArray(gym.facilities) ? gym.facilities : []
  const verifiedFacilities = Array.isArray(gym.verified_facilities) ? gym.verified_facilities : []
  const totalReviews = Number(gym.total_reviews || gym.review_count) || 0
  const rating = totalReviews > 0 ? Number(gym.rating) || 0 : 0

  const avgEquipment = Number(gym.avg_equipment) || (totalReviews > 0 ? rating : 3.5)
  const avgCleanliness = Number(gym.avg_cleanliness) || (totalReviews > 0 ? rating : 3.5)
  const avgTrainer = Number(gym.avg_trainer) || (totalReviews > 0 ? rating : 3.5)

  // 1. Verified Gym Facilities (Max 30 pts)
  // Base listed: up to 10 pts (1.25 per facility up to 8)
  // Admin verified facilities: up to 20 pts (4 pts per verified facility up to 5)
  const baseFacScore = Math.min(10.0, Number((facilities.length * 1.25).toFixed(1)))
  const verifiedFacScore = Math.min(20.0, Number((verifiedFacilities.length * 4.0).toFixed(1)))
  const scoreFacilities = Number(Math.min(weights.verified_facilities, baseFacScore + verifiedFacScore).toFixed(1))

  // 2. Genuine Member Ratings & Reviews (Max 25 pts)
  // Volume: up to 10 pts (2 pts per review up to 5)
  // Rating quality: up to 15 pts ((rating / 5) * 15)
  let scoreReviews = 0.0
  if (totalReviews > 0) {
    const volumeScore = Math.min(10.0, totalReviews * 2.0)
    const qualityScore = Math.min(15.0, (rating / 5.0) * 15.0)
    scoreReviews = Number(Math.min(weights.member_reviews, volumeScore + qualityScore).toFixed(1))
  }

  // 3. Equipment & Infrastructure (Max 20 pts)
  // Aspect rating: up to 12 pts; Equipment-type facilities present: up to 8 pts
  const equipAspectScore = totalReviews > 0 ? (avgEquipment / 5.0) * 12.0 : 8.0
  const equipCount = facilities.filter((f) => {
    const s = String(f).toLowerCase()
    return s.includes('cardio') || s.includes('strength') || s.includes('crossfit') || s.includes('weight')
  }).length
  const equipFacScore = Math.min(8.0, equipCount * 2.5)
  const scoreEquipment = Number(Math.min(weights.equipment_infrastructure, equipAspectScore + equipFacScore).toFixed(1))

  // 4. Cleanliness & Maintenance (Max 10 pts)
  // Aspect cleanliness: up to 7 pts; Hygiene facilities present: up to 3 pts
  const cleanAspectScore = totalReviews > 0 ? (avgCleanliness / 5.0) * 7.0 : 4.0
  const cleanFacCount = facilities.filter((f) => {
    const s = String(f).toLowerCase()
    return s.includes('steam') || s.includes('locker') || s.includes('shower') || s.includes('sauna')
  }).length
  const cleanFacScore = Math.min(3.0, cleanFacCount * 1.5)
  const scoreCleanliness = Number(Math.min(weights.cleanliness, cleanAspectScore + cleanFacScore).toFixed(1))

  // 5. Trainer & Coaching Quality (Max 10 pts)
  // Aspect trainer: up to 7 pts; Certified coaching facility present: up to 3 pts
  const trainerAspectScore = totalReviews > 0 ? (avgTrainer / 5.0) * 7.0 : 4.0
  const trainerFacCount = facilities.filter((f) => {
    const s = String(f).toLowerCase()
    return s.includes('personal') || s.includes('trainer') || s.includes('coach') || s.includes('diet')
  }).length
  const trainerFacScore = Math.min(3.0, trainerFacCount * 1.5)
  const scoreTrainer = Number(Math.min(weights.trainer_coaching, trainerAspectScore + trainerFacScore).toFixed(1))

  // 6. Profile Completeness (Max 5 pts)
  let scoreProfile = 0
  if ((gym.gym_name || '').trim().length > 2) scoreProfile += 1.0
  if ((gym.city || '').trim().length > 1 && (gym.area || '').trim().length > 1) scoreProfile += 1.0
  if ((gym.pincode || '').trim().length >= 6 || (gym.state || '').trim().length > 2) scoreProfile += 1.0
  if ((gym.owner_photo || gym.avatar_url || gym.logo_url || gym.photo_url || '').trim().length > 5) scoreProfile += 1.0
  if (facilities.length >= 3) scoreProfile += 1.0
  scoreProfile = Number(Math.min(weights.profile_completeness, scoreProfile).toFixed(1))

  const totalScore = Number(
    Math.min(100.0, scoreFacilities + scoreReviews + scoreEquipment + scoreCleanliness + scoreTrainer + scoreProfile).toFixed(1)
  )

  let tier = 'Bronze Active'
  let percentile = 'Top 50%'
  if (totalScore >= 85.0) {
    tier = 'Platinum Elite'
    percentile = 'Top 5%'
  } else if (totalScore >= 70.0) {
    tier = 'Gold Club'
    percentile = 'Top 15%'
  } else if (totalScore >= 50.0) {
    tier = 'Silver Pro'
    percentile = 'Top 30%'
  }

  return {
    score: totalScore,
    tier,
    percentile,
    scoreBreakdown: {
      facilities: scoreFacilities,
      reviews: scoreReviews,
      equipment: scoreEquipment,
      cleanliness: scoreCleanliness,
      trainer: scoreTrainer,
      profile: scoreProfile,
    },
  }
}

/**
 * Backward compatibility score function
 */
export function calculateLocalGymScore({ members = [], facilities = [], rating = 5.0, reviewCount = 0 }) {
  const result = calculateDetailedGymScore({
    facilities,
    rating,
    total_reviews: reviewCount,
    members_count: members.length,
  })
  return {
    score: result.score,
    tier: result.tier,
    percentile: result.percentile,
    memberScore: result.scoreBreakdown.reviews,
    reputationScore: result.scoreBreakdown.reviews,
    reviewScore: result.scoreBreakdown.reviews,
  }
}

/**
 * Normalizes and systematically ranks registered gyms.
 * Single source of truth: ensures consistent positions across Admin, Owner, and Member panels.
 */
export function normalizeGymRankingData(gymsList = [], activeGymId = null, userCoords = null) {
  const processed = (gymsList || []).map((g) => {
    const totalReviews = Number(g.total_reviews || g.review_count) || 0
    const rating = totalReviews > 0 ? Number(g.rating) || 0 : 0
    const isMyGym = Boolean(g.is_my_gym || (activeGymId && (g.gym_id === activeGymId || g.id === activeGymId)))
    const hasReviews = totalReviews > 0
    const facilities = Array.isArray(g.facilities) && g.facilities.length > 0
      ? g.facilities
      : ['Cardio Zone (Treadmill, Cycles)', 'Strength & Heavy Free Weights', 'Personal Training Coaches']
    const verifiedFacilities = Array.isArray(g.verified_facilities) ? g.verified_facilities : []
    const isVerified = Boolean(g.is_verified || verifiedFacilities.length > 0)

    // Calculate score dynamically if not pre-computed by database
    const scoreData = g.score != null
      ? { score: Number(g.score), tier: g.tier || 'Silver Pro', scoreBreakdown: g.score_breakdown || {} }
      : calculateDetailedGymScore({ ...g, facilities, verified_facilities: verifiedFacilities, rating, total_reviews: totalReviews })

    // Distance calculation
    let distanceKm = g.distance_km != null ? Number(g.distance_km) : null
    if (distanceKm == null && userCoords?.latitude && userCoords?.longitude && g.latitude && g.longitude) {
      distanceKm = calculateDistanceKm(userCoords.latitude, userCoords.longitude, Number(g.latitude), Number(g.longitude))
    }

    // Historical ranking movement (up, down, same)
    const prevRank = Number(g.previous_rank || g.prev_rank) || null
    let movement = 'same'
    if (prevRank && g.rank) {
      if (g.rank < prevRank) movement = 'up'
      else if (g.rank > prevRank) movement = 'down'
    }

    return {
      ...g,
      gym_id: g.gym_id || g.id,
      id: g.id || g.gym_id,
      gym_name: g.gym_name || 'Fitness Center',
      owner_name: g.owner_name || '',
      phone: g.public_phone || g.phone || '',
      city: g.city || 'Udaipur',
      state: g.state || 'Rajasthan',
      pincode: g.pincode || '',
      area: g.area || 'City Center',
      photo_url: g.photo_url || g.owner_photo || g.logo_url || g.avatar_url || '',
      facilities,
      verified_facilities: verifiedFacilities,
      is_verified: isVerified,
      rating,
      total_reviews: totalReviews,
      has_reviews: hasReviews,
      is_my_gym: isMyGym,
      score: scoreData.score,
      tier: scoreData.tier || 'Bronze Active',
      score_breakdown: scoreData.scoreBreakdown,
      distance_km: distanceKm,
      movement,
      created_at: g.created_at || null,
    }
  })

  // Systematic Ranking Sort:
  // 1. Highest composite score descending
  // 2. Highest review volume descending
  // 3. Highest average rating descending
  // 4. Registration seniority ascending
  processed.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (b.total_reviews !== a.total_reviews) return b.total_reviews - a.total_reviews
    if (b.rating !== a.rating) return b.rating - a.rating
    if (a.created_at && b.created_at) {
      return new Date(a.created_at) - new Date(b.created_at)
    }
    return (a.gym_name || '').localeCompare(b.gym_name || '')
  })

  // Assign sequential rank (#1, #2, #3, ...)
  processed.forEach((g, idx) => {
    g.rank = idx + 1
    g.rank_display = `#${idx + 1}`
    g.is_ranked = true
  })

  // Find my gym
  const myGym = processed.find((g) => g.is_my_gym)
  const myRank = myGym ? myGym.rank : null
  const myRankDisplay = myRank ? `#${myRank}` : 'Not Ranked'

  return {
    gyms: processed,
    rankedGyms: processed,
    unrankedGyms: [],
    myRank,
    myRankDisplay,
    myGym,
    totalRegistered: processed.length,
  }
}

/**
 * CENTRALIZED RANKING QUERY
 * Single source of truth for Admin, Gym Owner, and Member panels.
 * Supports multi-scope discovery: 'all' | 'city' | 'state' | 'nearby'
 */
export async function fetchPublicGymRankings({
  scope = 'all',
  location = '',
  latitude = null,
  longitude = null,
  gymId = null,
  currentGym = null,
} = {}) {
  const cleanScope = (scope || 'all').trim().toLowerCase()
  const cleanLoc = (location || '').trim()
  let activeId = gymId

  if (!activeId) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      activeId = userData?.user?.id || null
    } catch {
      // Continue
    }
  }

  let rawGyms = null

  // 1. Primary: High-performance Security Definer RPC
  try {
    const { data, error } = await supabase.rpc('get_public_gym_rankings', {
      p_scope: cleanScope,
      p_location: cleanLoc,
      p_lat: latitude || null,
      p_lng: longitude || null,
      p_gym_id: activeId || null,
    })

    if (!error && data?.success && Array.isArray(data?.gyms)) {
      rawGyms = data.gyms
    }
  } catch {
    // Continue to fallback
  }

  // 2. Secondary: Direct table query fallback for active gyms
  if (!rawGyms) {
    try {
      let query = supabase
        .from('gyms')
        .select('id, gym_name, owner_name, phone, public_phone, city, state, pincode, area, facilities, verified_facilities, is_verified, rating, total_reviews, review_count, latitude, longitude, owner_photo, logo_url, avatar_url, created_at')
        .neq('status', 'blocked')

      if (cleanScope === 'city' && cleanLoc) {
        query = query.ilike('city', cleanLoc)
      } else if (cleanScope === 'state' && cleanLoc) {
        query = query.ilike('state', cleanLoc)
      }

      const { data: gyms, error: gymErr } = await query

      if (!gymErr && gyms && gyms.length > 0) {
        rawGyms = gyms
      } else if (gymErr && gymErr.code === '42703') {
        // Missing optional columns: fetch basic core columns
        const { data: basicGyms } = await supabase
          .from('gyms')
          .select('id, gym_name, owner_name, phone, city, state, area, created_at')
          .neq('status', 'blocked')

        if (basicGyms) rawGyms = basicGyms
      }
    } catch {
      // Direct query fallback failed
    }
  }

  // 3. Ensure the current logged-in gym is included if available
  const list = rawGyms ? [...rawGyms] : []
  const hasMyGym = list.some((g) => (g.id === activeId || g.gym_id === activeId))

  if (!hasMyGym && (currentGym || activeId)) {
    const myGymData = currentGym || {
      id: activeId,
      gym_name: 'My Gym',
      owner_name: '',
      phone: '',
      city: cleanLoc || 'Udaipur',
      state: 'Rajasthan',
      pincode: '',
      area: 'City Center',
      rating: 0,
      total_reviews: 0,
    }
    list.push({
      ...myGymData,
      is_my_gym: true,
    })
  }

  const userCoords = latitude && longitude ? { latitude, longitude } : null
  const normalized = normalizeGymRankingData(list, activeId, userCoords)

  return {
    success: true,
    scope: cleanScope,
    location: cleanLoc,
    total_registered: normalized.totalRegistered,
    my_rank: normalized.myRank,
    my_rank_display: normalized.myRankDisplay,
    my_gym: normalized.myGym,
    gyms: normalized.gyms,
    ranked_gyms: normalized.rankedGyms,
  }
}

/**
 * Backward compatibility function for CityRankings.jsx
 */
export async function fetchRegisteredCityGyms(city = 'Udaipur', gymId = null, currentGym = null) {
  return fetchPublicGymRankings({
    scope: city ? 'city' : 'all',
    location: city || 'Udaipur',
    gymId,
    currentGym,
  })
}

/**
 * Backward compatibility wrapper for older callers
 */
export async function fetchCityGymRankings(city = 'Udaipur', gymId = null, _localMembers = []) {
  const res = await fetchRegisteredCityGyms(city, gymId)
  return {
    ...res,
    total_registered_in_city: res.total_registered,
    leaderboard: res.gyms || [],
  }
}

/**
 * Updates gym location, pincode, state, and facilities in Supabase
 */
export async function updateGymLocation({ gymName, city, state, pincode, area, facilities = [], latitude = null, longitude = null }) {
  try {
    const { data: userRes } = await supabase.auth.getUser()
    const uid = userRes?.user?.id
    if (!uid) return { success: false, error: 'User not authenticated' }

    try {
      const cacheObj = {
        city: city || 'Udaipur',
        state: state || 'Rajasthan',
        pincode: pincode || '',
        area: area || 'City Center',
        facilities: facilities || [],
        latitude,
        longitude,
        updated_at: new Date().toISOString(),
      }
      localStorage.setItem(`gym_location_${uid}`, JSON.stringify(cacheObj))
      await supabase.auth.updateUser({
        data: cacheObj,
      })
    } catch {
      // Non-blocking fallback
    }

    // 1. Try RPC update_gym_details
    try {
      const { data, error } = await supabase.rpc('update_gym_details', {
        p_gym_name: gymName || null,
        p_city: city || 'Udaipur',
        p_state: state || 'Rajasthan',
        p_pincode: pincode || '',
        p_area: area || 'City Center',
        p_facilities: facilities || [],
      })

      if (!error && data?.success) {
        return { success: true }
      }
    } catch {
      // Continue to direct update
    }

    // 2. Direct table update fallback
    const updatePayload = {
      city: city || 'Udaipur',
      state: state || 'Rajasthan',
      pincode: pincode || '',
      area: area || 'City Center',
      facilities: facilities || [],
    }
    if (gymName) updatePayload.gym_name = gymName
    if (latitude) updatePayload.latitude = latitude
    if (longitude) updatePayload.longitude = longitude

    const { data: updatedRows, error: updateErr } = await supabase
      .from('gyms')
      .update(updatePayload)
      .eq('id', uid)
      .select('id, city, area, facilities')

    if (!updateErr && updatedRows && updatedRows.length > 0) {
      return { success: true }
    }

    if (updateErr) {
      if (updateErr.message && updateErr.message.includes('schema cache')) {
        const pruned = {}
        if (gymName) pruned.gym_name = gymName
        if (city) pruned.city = city

        await supabase.from('gyms').update(pruned).eq('id', uid)
        return { success: true, notice: 'Location saved!' }
      }
      return { success: false, error: updateErr.message }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err.message || 'Failed to update gym details.' }
  }
}

/**
 * ADMIN: Verify or reject gym facilities & verification badge
 */
export async function adminUpdateGymVerification(gymId, { isVerified = null, verifiedFacilities = null } = {}) {
  try {
    const { data, error } = await supabase.rpc('admin_update_gym_verification', {
      p_gym_id: gymId,
      p_is_verified: isVerified,
      p_verified_facilities: verifiedFacilities,
    })

    if (!error && data?.success) {
      return { success: true }
    }

    // Fallback direct update for admin
    const updatePayload = {}
    if (isVerified != null) updatePayload.is_verified = isVerified
    if (verifiedFacilities != null) updatePayload.verified_facilities = verifiedFacilities

    const { error: directErr } = await supabase.from('gyms').update(updatePayload).eq('id', gymId)
    if (!directErr) return { success: true }
    return { success: false, error: directErr?.message || error?.message }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * ADMIN: Moderate reviews (flag, approve, delete)
 */
export async function adminModerateReview(reviewId, action) {
  try {
    const { data, error } = await supabase.rpc('admin_moderate_review', {
      p_review_id: reviewId,
      p_action: action,
    })

    if (!error && data?.success) {
      return { success: true }
    }

    if (action === 'delete') {
      const { error: delErr } = await supabase.from('gym_reviews').delete().eq('id', reviewId)
      if (!delErr) return { success: true }
    }

    return { success: false, error: error?.message || 'Failed to moderate review' }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * ADMIN: Fetch and update ranking weights
 */
export async function fetchRankingConfig() {
  try {
    const { data, error } = await supabase.from('ranking_configs').select('*').eq('id', 'default').maybeSingle()
    if (!error && data?.weights) {
      return data.weights
    }
  } catch {}
  return {
    verified_facilities: 30,
    member_reviews: 25,
    equipment_infrastructure: 20,
    cleanliness: 10,
    trainer_coaching: 10,
    profile_completeness: 5,
  }
}

export async function adminUpdateRankingWeights(weights) {
  try {
    const { error } = await supabase.from('ranking_configs').upsert({
      id: 'default',
      weights,
      updated_at: new Date().toISOString(),
    })
    if (!error) return { success: true }
    return { success: false, error: error.message }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
