import { supabase } from './supabase.js'

export const POPULAR_CITIES = [
  'Udaipur',
  'Jaipur',
  'Jodhpur',
  'Kota',
  'Bhilwara',
  'Ajmer',
  'Ahmedabad',
  'Delhi NCR',
  'Mumbai',
  'Bengaluru',
  'Pune',
  'Indore',
]

export const STANDARD_FACILITIES = [
  { id: 'cardio', label: 'Cardio Zone (Treadmill, Cycles, Steppers)' },
  { id: 'strength', label: 'Strength & Heavy Free Weights' },
  { id: 'pt', label: 'Personal Training (Certified Coaches)' },
  { id: 'crossfit', label: 'CrossFit & Functional Rig' },
  { id: 'zumba', label: 'Zumba & Aerobics Studio' },
  { id: 'yoga', label: 'Yoga & Pilates Dedicated Hall' },
  { id: 'steam', label: 'Steam Bath & Sauna' },
  { id: 'lockers', label: 'VIP Lockers & Changing Showers' },
  { id: 'diet', label: 'Nutrition & Diet Consultation' },
]

/**
 * Calculates local ranking score fallback
 * Weighs Genuine Member Reviews as the primary deciding factor (50% Weightage)
 */
export function calculateLocalGymScore({ members = [], facilities: _facilities = [], rating = 5.0, reviewCount = 0 }) {
  const active = members.filter((m) => {
    if (!m.end_date) return true
    const end = new Date(m.end_date)
    return end >= new Date(new Date().toDateString())
  }).length

  const safeRating = Math.max(1, Math.min(5, Number(rating) || 5.0))
  const safeReviews = Number(reviewCount) || 0

  // 1. Member Rating (50 pts max): rating * 10
  const reputationScore = Math.min(50, Number((safeRating * 10).toFixed(1)))

  // 2. Member Review Volume (25 pts max)
  const reviewScore = Math.min(25, Number((safeReviews * 2.5).toFixed(1)))

  // 3. Active Members (25 pts max)
  const memberScore = Math.min(25, Number((active * 1.0).toFixed(1)))

  const totalScore = Number((reputationScore + reviewScore + memberScore).toFixed(1))

  let tier = 'Gold Club'
  let percentile = 'Top 15%'
  if (totalScore >= 80) {
    tier = 'Platinum Elite'
    percentile = 'Top 5%'
  } else if (totalScore >= 65) {
    tier = 'Gold Club'
    percentile = 'Top 15%'
  } else if (totalScore >= 50) {
    tier = 'Silver Pro'
    percentile = 'Top 30%'
  } else {
    tier = 'Bronze Active'
    percentile = 'Top 50%'
  }

  return {
    score: totalScore,
    tier,
    percentile,
    memberScore,
    reputationScore,
    reviewScore,
  }
}

/**
 * Normalizes and ranks registered gyms.
 * RULE: Never show 5.0 rating or #1 rank when there are zero verified reviews!
 * Gyms without verified reviews receive 'Not Ranked Yet'.
 */
export function normalizeGymRankingData(gymsList = [], activeGymId = null) {
  const processed = gymsList.map((g) => {
    const totalReviews = Number(g.total_reviews) || 0
    // CRITICAL: Never show a 5.0 rating when there are zero reviews
    const rating = totalReviews > 0 ? Number(g.rating) || 0 : 0
    const isMyGym = Boolean(g.is_my_gym || (activeGymId && (g.gym_id === activeGymId || g.id === activeGymId)))
    const hasReviews = totalReviews > 0

    return {
      ...g,
      gym_id: g.gym_id || g.id,
      gym_name: g.gym_name || 'Fitness Club',
      city: g.city || '',
      state: g.state || 'Rajasthan',
      pincode: g.pincode || '',
      area: g.area || 'City Center',
      rating,
      total_reviews: totalReviews,
      has_reviews: hasReviews,
      is_my_gym: isMyGym,
    }
  })

  // Separate ranked gyms (hasReviews === true) and unranked gyms (hasReviews === false)
  const ranked = processed.filter((g) => g.has_reviews)
  const unranked = processed.filter((g) => !g.has_reviews)

  // Sort ranked gyms by rating desc, then total_reviews desc, then score desc
  ranked.sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating
    if (b.total_reviews !== a.total_reviews) return b.total_reviews - a.total_reviews
    return (b.score || 0) - (a.score || 0)
  })

  // Assign sequential ranks ONLY to gyms with genuine reviews
  ranked.forEach((g, idx) => {
    g.rank = idx + 1
    g.rank_display = `#${idx + 1}`
    g.is_ranked = true
  })

  // Unranked gyms have no artificial rank
  unranked.forEach((g) => {
    g.rank = null
    g.rank_display = 'Not Ranked Yet'
    g.is_ranked = false
  })

  const combined = [...ranked, ...unranked]

  // Find my gym status
  const myGym = combined.find((g) => g.is_my_gym)
  const myRank = myGym && myGym.is_ranked ? myGym.rank : null
  const myRankDisplay = myGym && myGym.is_ranked ? `#${myGym.rank}` : 'Not Ranked Yet'

  return {
    gyms: combined,
    rankedGyms: ranked,
    unrankedGyms: unranked,
    myRank,
    myRankDisplay,
    totalRegistered: combined.length,
  }
}

/**
 * Fetches ACTUAL registered gyms in the specified city from Supabase.
 * Strictly queries real gyms and orders them by real member reviews/ratings.
 * Zero placeholder fake gyms.
 */
export async function fetchRegisteredCityGyms(city = 'Udaipur', gymId = null) {
  const cleanCity = (city || 'Udaipur').trim()
  let activeId = gymId
  if (!activeId) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      activeId = userData?.user?.id || null
    } catch (_uErr) {
      // Continue
    }
  }

  // 1. Try secure RPC function
  try {
    const { data, error } = await supabase.rpc('get_registered_city_gyms', {
      p_city: cleanCity,
      p_gym_id: activeId || null,
    })

    if (!error && data?.success && Array.isArray(data?.gyms)) {
      const normalized = normalizeGymRankingData(data.gyms, activeId)
      return {
        success: true,
        city: cleanCity,
        total_registered: normalized.totalRegistered,
        my_rank: normalized.myRank,
        my_rank_display: normalized.myRankDisplay,
        gyms: normalized.gyms,
        ranked_gyms: normalized.rankedGyms,
      }
    }
  } catch (_e) {
    // Continue to direct table query fallback
  }

  // 2. Direct table query fallback for active gyms in this city
  try {
    const { data: gyms, error: gymErr } = await supabase
      .from('gyms')
      .select('id, gym_name, city, state, pincode, area, rating, total_reviews, created_at')
      .neq('status', 'blocked')

    if (!gymErr && gyms && gyms.length > 0) {
      const cityLower = cleanCity.toLowerCase()
      const filtered = gyms.filter(
        (g) => (g.city || 'Udaipur').trim().toLowerCase() === cityLower
      )

      const normalized = normalizeGymRankingData(filtered, activeId)

      return {
        success: true,
        city: cleanCity,
        total_registered: normalized.totalRegistered,
        my_rank: normalized.myRank,
        my_rank_display: normalized.myRankDisplay,
        gyms: normalized.gyms,
        ranked_gyms: normalized.rankedGyms,
      }
    }
  } catch (_err) {
    // Table query failed
  }

  // Fallback: If no other gyms in city, return clean empty list
  return {
    success: true,
    city: cleanCity,
    total_registered: 0,
    my_rank: null,
    my_rank_display: 'Not Ranked Yet',
    gyms: [],
    ranked_gyms: [],
  }
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
export async function updateGymLocation({ gymName, city, state, pincode, area, facilities = [] }) {
  try {
    const { data: userRes } = await supabase.auth.getUser()
    const uid = userRes?.user?.id
    if (!uid) return { success: false, error: 'User not authenticated' }

    // 1. Try RPC update_gym_details
    try {
      const { data, error } = await supabase.rpc('update_gym_details', {
        p_gym_name: gymName || null,
        p_city: city || 'Udaipur',
        p_state: state || 'Rajasthan',
        p_pincode: pincode || '',
        p_area: area || 'City Center',
      })

      if (!error && data?.success) {
        return { success: true }
      }
    } catch (_rpcErr) {
      // Continue to direct update
    }

    // 2. Direct table update fallback
    const updatePayload = {
      city: city || 'Udaipur',
      state: state || 'Rajasthan',
      pincode: pincode || '',
      area: area || 'City Center',
    }
    if (gymName) updatePayload.gym_name = gymName
    if (facilities && facilities.length > 0) updatePayload.facilities = facilities

    const { error: updateErr } = await supabase
      .from('gyms')
      .update(updatePayload)
      .eq('id', uid)

    if (updateErr) {
      return { success: false, error: updateErr.message }
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message || 'Failed to update gym details.' }
  }
}
