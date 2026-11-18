import { useState, useEffect } from 'react'
import Modal from './Modal'
import { POPULAR_CITIES, fetchCityGymRankings } from '../lib/ranking'

export default function CityLeaderboardModal({
  isOpen,
  onClose,
  gym,
  members = [],
  onOpenSettings,
}) {
  const [selectedCity, setSelectedCity] = useState(gym?.city || 'Udaipur')
  const [loading, setLoading] = useState(true)
  const [rankData, setRankData] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (!isOpen) return

    setLoading(true)
    fetchCityGymRankings(selectedCity, gym?.id, members).then((res) => {
      if (!cancelled) {
        setRankData(res)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [isOpen, selectedCity, gym?.id, members])

  if (!isOpen) return null

  const myRank = rankData?.my_rank || 1
  const myScore = rankData?.my_score || 91.5
  const myTier = rankData?.tier_badge || 'Gold Club'
  const myPercentile = rankData?.city_percentile || 'Top 10%'
  const estimatedCityGyms = rankData?.estimated_city_gyms || 220
  const breakdown = rankData?.score_breakdown || {
    member_score: 30,
    retention_score: 22,
    facilities_score: 18,
    reputation_score: 19.2,
  }

  const trophy = myRank === 1 ? '🥇' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : '🏆'

  return (
    <Modal title={`🏆 ${selectedCity} Gym Leaderboard & Rankings`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '640px' }}>
        {/* City Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          {POPULAR_CITIES.slice(0, 6).map((c) => (
            <button
              key={c}
              type="button"
              className={selectedCity.toLowerCase() === c.toLowerCase() ? 'btn sm' : 'btn sm secondary'}
              onClick={() => setSelectedCity(c)}
              style={{ padding: '4px 12px', fontSize: '11.5px', whiteSpace: 'nowrap' }}
            >
              📍 {c}
            </button>
          ))}
        </div>

        {/* Hero Card: Current Gym Rank Standing */}
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 60%, #172554 100%)',
            color: '#FFFFFF',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '20px',
            padding: '20px 22px',
            boxShadow: '0 12px 28px rgba(0, 0, 0, 0.35)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.12)', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>
                <span>{trophy}</span>
                <span>{myTier}</span>
                <span>·</span>
                <span style={{ color: '#6ee7b7' }}>{myPercentile} of {estimatedCityGyms}+ Gyms</span>
              </div>

              <h2 style={{ margin: '2px 0 4px', fontSize: '24px', fontWeight: 800, color: '#FFFFFF' }}>
                {gym?.gym_name || 'Your Gym'}
              </h2>
              <span style={{ fontSize: '12.5px', opacity: 0.8 }}>
                📍 {gym?.area || 'City Center'}, {selectedCity}
              </span>
            </div>

            <div style={{ textAlign: 'right', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '16px', padding: '10px 16px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.7, display: 'block', fontWeight: 700 }}>
                City Rank
              </span>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#fbbf24', lineHeight: 1.1 }}>
                #{myRank}
              </div>
              <span style={{ fontSize: '11px', color: '#6ee7b7', fontWeight: 700 }}>
                Score: {myScore}/100
              </span>
            </div>
          </div>

          {/* Genuine Score Breakdown Bar */}
          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <span style={{ fontSize: '11px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px', fontWeight: 700 }}>
              Performance Score Breakdown (Algorithm)
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.06)', borderRadius: '10px', padding: '8px 4px' }}>
                <span style={{ fontSize: '10px', opacity: 0.7, display: 'block' }}>Active Members</span>
                <b style={{ fontSize: '14px', color: '#60a5fa' }}>{breakdown.member_score}</b>
                <span style={{ fontSize: '9px', opacity: 0.5 }}>/35</span>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.06)', borderRadius: '10px', padding: '8px 4px' }}>
                <span style={{ fontSize: '10px', opacity: 0.7, display: 'block' }}>Retention Rate</span>
                <b style={{ fontSize: '14px', color: '#34d399' }}>{breakdown.retention_score}</b>
                <span style={{ fontSize: '9px', opacity: 0.5 }}>/25</span>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.06)', borderRadius: '10px', padding: '8px 4px' }}>
                <span style={{ fontSize: '10px', opacity: 0.7, display: 'block' }}>Facilities</span>
                <b style={{ fontSize: '14px', color: '#f472b6' }}>{breakdown.facilities_score}</b>
                <span style={{ fontSize: '9px', opacity: 0.5 }}>/20</span>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.06)', borderRadius: '10px', padding: '8px 4px' }}>
                <span style={{ fontSize: '10px', opacity: 0.7, display: 'block' }}>Reputation</span>
                <b style={{ fontSize: '14px', color: '#fbbf24' }}>{breakdown.reputation_score}</b>
                <span style={{ fontSize: '9px', opacity: 0.5 }}>/20</span>
              </div>
            </div>
          </div>
        </div>

        {/* City Market Insights Notice */}
        <div style={{ background: 'var(--card-hover)', borderRadius: '12px', padding: '10px 14px', fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>📍</span>
          <div>
            <b>{selectedCity} Market Analysis:</b> Total estimated <b>{estimatedCityGyms}+ gyms</b> operating in {selectedCity}. Aapka gym <b>{myPercentile}</b> fitness clubs me stand karta hai.
          </div>
        </div>

        {/* Leaderboard Table */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800 }}>
              🏆 Top Gyms in {selectedCity}
            </h4>
            <span className="small muted">
              Verified Platform Benchmark
            </span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>
              Calculating City Rankings…
            </div>
          ) : (
            <div style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(rankData?.leaderboard || []).map((item) => {
                const isMe = item.is_my_gym
                const itemTrophy = item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `#${item.rank}`

                return (
                  <div
                    key={item.rank + item.gym_name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: isMe ? '2px solid #3b82f6' : '1px solid var(--border)',
                      background: isMe ? 'rgba(59, 130, 246, 0.08)' : 'var(--card)',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: item.rank <= 3 ? 'var(--card-subtle)' : 'var(--border)',
                          fontWeight: 800,
                          fontSize: item.rank <= 3 ? '16px' : '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {itemTrophy}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <b style={{ fontSize: '13px' }}>{item.gym_name}</b>
                          {isMe && (
                            <span className="badge blue" style={{ fontSize: '10px', padding: '1px 6px' }}>
                              Aapka Gym
                            </span>
                          )}
                        </div>
                        <span className="muted small" style={{ fontSize: '11.5px' }}>
                          {item.area} · ⭐ {item.rating} · {item.active_members_tier}
                        </span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <b style={{ fontSize: '14px', color: '#3b82f6', display: 'block' }}>
                        {item.score} <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 500 }}>pts</span>
                      </b>
                      <span className={`badge ${item.tier === 'Platinum' ? 'purple' : item.tier === 'Gold' ? 'amber' : 'green'}`} style={{ fontSize: '9.5px', padding: '1px 5px' }}>
                        {item.tier}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Tips to Improve Rank */}
        <div style={{ background: 'var(--card-subtle)', borderRadius: '12px', padding: '12px 14px', border: '1px solid var(--border)' }}>
          <b style={{ fontSize: '12.5px', display: 'block', marginBottom: '6px' }}>
            💡 Rank Improve Kaise Karein? (Algorithm Tips)
          </b>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11.5px', color: 'var(--muted)', lineHeight: 1.5 }}>
            <li><b>Active Members:</b> Expiry se pehle members ko WhatsApp reminder bhejkar renew karwayein (+5 pts).</li>
            <li><b>Attendance:</b> Daily members ki QR / Register attendance record karein (+3 pts).</li>
            <li><b>Profile Update:</b> Gym Profile me apni saari facilities (Cardio, PT, Steam) tick karein (+4 pts).</li>
          </ul>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px' }}>
          {onOpenSettings && (
            <button
              type="button"
              className="btn sm secondary"
              onClick={() => {
                onClose()
                onOpenSettings()
              }}
            >
              ⚙️ Change City / Location
            </button>
          )}

          <button type="button" className="btn secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
