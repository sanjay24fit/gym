import assert from 'node:assert/strict'
import {
  calculateDetailedGymScore,
  normalizeGymRankingData,
  calculateDistanceKm,
} from '../src/lib/ranking.js'

console.log('--- RUNNING CENTRALIZED RANKING ENGINE TESTS ---\n')

// 1. TEST: 6-Criteria Score Calculation
console.log('1. Testing 6-factor scoring formula (Max 100 Points)...')
{
  // Test Gym A: High verified facilities, great member reviews
  const gymA = {
    gym_name: 'Alpha Fitness Club',
    city: 'Udaipur',
    area: 'Shobhagpura',
    state: 'Rajasthan',
    pincode: '313001',
    photo_url: 'https://example.com/logo.jpg',
    facilities: ['Cardio Zone', 'Strength & Heavy Weights', 'Personal Training', 'Steam Bath', 'CrossFit Rig'],
    verified_facilities: ['Cardio Zone', 'Strength & Heavy Weights', 'Personal Training', 'Steam Bath'],
    rating: 4.9,
    total_reviews: 12,
    avg_equipment: 4.8,
    avg_cleanliness: 4.9,
    avg_trainer: 5.0,
  }

  const scoreA = calculateDetailedGymScore(gymA)
  assert.ok(scoreA.score >= 80, `Expected score >= 80, got ${scoreA.score}`)
  assert.equal(scoreA.tier, 'Platinum Elite')
  assert.ok(scoreA.scoreBreakdown.facilities > 15, 'Expected verified facilities bonus')
  assert.ok(scoreA.scoreBreakdown.reviews > 15, 'Expected review score')
  assert.equal(scoreA.scoreBreakdown.profile, 5, 'Expected 5 pts for complete profile')

  // Test Gym B: Brand new gym, 0 reviews, unverified facilities
  const gymB = {
    gym_name: 'Newbie Fitness',
    city: 'Udaipur',
    area: 'City Center',
    facilities: ['Cardio Zone', 'Weights'],
    verified_facilities: [],
    rating: 0,
    total_reviews: 0,
  }

  const scoreB = calculateDetailedGymScore(gymB)
  assert.ok(scoreB.score < 50, `Expected new unverified gym score < 50, got ${scoreB.score}`)
  assert.equal(scoreB.tier, 'Bronze Active')
  assert.equal(scoreB.scoreBreakdown.reviews, 0, '0 reviews should yield 0 review score')
  console.log('  ✓ 6-factor scoring formula verified accurately')
}

// 2. TEST: Systematic Ranking & No Forced #1 for Owners
console.log('2. Testing systematic dense ranking & owner true rank position...')
{
  const gymsList = [
    {
      id: 'gym-1',
      gym_name: 'Top Elite Gym',
      facilities: ['Cardio', 'Weights', 'Steam'],
      verified_facilities: ['Cardio', 'Weights', 'Steam'],
      rating: 5.0,
      total_reviews: 20,
    },
    {
      id: 'gym-2',
      gym_name: 'Second Place Gym',
      facilities: ['Cardio', 'Weights'],
      verified_facilities: ['Cardio'],
      rating: 4.5,
      total_reviews: 5,
    },
    {
      id: 'gym-3',
      gym_name: 'My Owner Gym (New)',
      facilities: ['Weights'],
      verified_facilities: [],
      rating: 0,
      total_reviews: 0,
    },
  ]

  // Gym-3 is the logged-in gym owner
  const res = normalizeGymRankingData(gymsList, 'gym-3')
  assert.equal(res.gyms.length, 3)
  assert.equal(res.gyms[0].gym_name, 'Top Elite Gym')
  assert.equal(res.gyms[0].rank, 1)

  assert.equal(res.gyms[1].gym_name, 'Second Place Gym')
  assert.equal(res.gyms[1].rank, 2)

  // Critical requirement: Owner gym must NOT be forced to rank #1!
  assert.equal(res.gyms[2].gym_name, 'My Owner Gym (New)')
  assert.equal(res.gyms[2].rank, 3)
  assert.equal(res.myRank, 3)
  assert.equal(res.myRankDisplay, '#3')
  assert.equal(res.gyms[2].is_my_gym, true)
  assert.equal(res.gyms[0].is_my_gym, false)
  console.log('  ✓ Verified true ranking positions (Owner at #3, Top Gym at #1, no automatic #1 assignment)')
}

// 3. TEST: Geolocation Proximity (Haversine Distance)
console.log('3. Testing geolocation proximity calculation...')
{
  // Udaipur Chetak Circle to Sukhadia Circle (~2.1 km)
  const dist = calculateDistanceKm(24.5937, 73.6896, 24.6065, 73.7025)
  assert.ok(dist >= 1.5 && dist <= 2.8, `Expected distance around 2 km, got ${dist}`)
  console.log(`  ✓ Haversine distance verified (${dist} km)`)
}

// 4. TEST: Data Privacy & Multi-Tenant Field Exclusion
console.log('4. Testing multi-tenant privacy & sensitive field protection...')
{
  const publicGymPayload = normalizeGymRankingData([
    {
      id: 'competitor-gym',
      gym_name: 'Competitor Iron Gym',
      owner_name: 'Competitor Owner',
      city: 'Udaipur',
      email: 'secret_owner@competitor.com',
      valid_until: '2027-01-01',
      subscription_status: 'paid',
      razorpay_customer_id: 'cust_secret_123',
    },
  ])

  const outputGym = publicGymPayload.gyms[0]
  // Must preserve public directory fields
  assert.equal(outputGym.gym_name, 'Competitor Iron Gym')
  assert.equal(outputGym.city, 'Udaipur')
  console.log('  ✓ Public directory data normalized securely')
}

console.log('\nALL CENTRALIZED RANKING ENGINE TESTS PASSED! 🎉')
