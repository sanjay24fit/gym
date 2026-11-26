import { useState, useEffect } from 'react'
import GymLogo from './GymLogo'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'
import MemberHomeTab from './member/MemberHomeTab'
import MemberAttendanceTab from './member/MemberAttendanceTab'
import MemberWorkoutTab from './member/MemberWorkoutTab'
import MemberPaymentsTab from './member/MemberPaymentsTab'
import MemberProfileTab from './member/MemberProfileTab'
import MemberExploreGyms from './member/MemberExploreGyms'
import MemberReviewModal from './MemberReviewModal'
import { getStoredMemberReview } from '../lib/reviews'
import { fetchEliteMemberData } from '../lib/eliteMember'
import { dueAmount } from '../lib/utils'

export default function MemberPortal({
  member: initialMember,
  gym: initialGym,
  onLogout,
  onRefresh = null,
  isOwnerPreview = false,
  onClosePreview = null,
}) {
  const [activeTab, setActiveTab] = useState('home') // 'home' | 'attendance' | 'workout' | 'payments' | 'profile'
  const [refreshing, setRefreshing] = useState(false)

  // Live elite data state
  const [eliteData, setEliteData] = useState(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [currentReview, setCurrentReview] = useState(null)

  // Load elite data on mount
  useEffect(() => {
    let cancelled = false
    fetchEliteMemberData().then((res) => {
      if (!cancelled && res && res.success) {
        setEliteData(res)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Sync member review state
  useEffect(() => {
    const gymId = eliteData?.gym?.id || initialGym?.id
    const memberId = eliteData?.member?.id || initialMember?.id
    if (gymId) {
      const stored = getStoredMemberReview(gymId, memberId)
      if (stored) setCurrentReview(stored)
    }
  }, [eliteData?.gym?.id, eliteData?.member?.id, initialGym?.id, initialMember?.id])

  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      if (onRefresh) {
        await onRefresh()
      }
      const res = await fetchEliteMemberData()
      if (res && res.success) {
        setEliteData(res)
      }
    } finally {
      setTimeout(() => setRefreshing(false), 600)
    }
  }

  // Authoritative data resolution: Elite RPC > Props
  const member = eliteData?.member || initialMember || {}
  const gym = eliteData?.gym || initialGym || {}
  const attendance = eliteData?.attendance || []
  const workouts = eliteData?.workouts || []
  const diet = eliteData?.diet || []
  const announcements = eliteData?.announcements || []
  const notifications = eliteData?.notifications || []
  const paymentHistory = eliteData?.payment_history || []

  const due = dueAmount(member)

  return (
    <div
      className="member-portal-app"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
        color: 'var(--text)',
        paddingBottom: '80px', // Space for fixed bottom navigation
      }}
    >
      {/* 1. Top Header */}
      <header
        className="topbar"
        style={{
          borderBottom: '1px solid var(--border)',
          background: 'var(--card)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <GymLogo size={34} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', fontWeight: 800 }}>
                {gym?.gym_name || 'Fitness Club'}
              </span>
              <span
                className="badge blue"
                style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '2px 6px' }}
              >
                Member
              </span>
            </div>
            <span className="muted small" style={{ fontSize: '12px' }}>{member.name || 'Member'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('explore')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: activeTab === 'explore' ? '#FF6200' : 'rgba(255, 98, 0, 0.1)',
              color: activeTab === 'explore' ? '#FFFFFF' : '#FF6200',
              border: '1px solid rgba(255, 98, 0, 0.3)',
              padding: '5px 11px',
              borderRadius: '999px',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
            <span>Explore Gyms</span>
          </button>

          <button
            type="button"
            className="btn sm"
            onClick={handleRefresh}
            title="Refresh Data"
            style={{ fontSize: '13px', padding: '6px 8px', borderRadius: '8px' }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: refreshing ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.5s ease',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21h5v-5" />
              </svg>
            </span>
          </button>
          <LanguageToggle size="sm" />
          <ThemeToggle size="sm" />

          {isOwnerPreview ? (
            <button
              type="button"
              className="btn sm"
              onClick={onClosePreview}
              style={{ fontSize: '12px', padding: '6px 10px', borderRadius: '8px' }}
            >
              ✕ Close
            </button>
          ) : (
            <button
              type="button"
              className="btn sm"
              onClick={onLogout}
              title="Sign Out"
              style={{
                fontSize: '12px',
                padding: '6px 10px',
                borderRadius: '8px',
                color: 'var(--danger, #ef4444)',
                border: '1px solid var(--border)',
              }}
            >
              Exit
            </button>
          )}
        </div>
      </header>

      {/* Owner Live Preview Banner */}
      {isOwnerPreview && (
        <div
          style={{
            background: 'var(--accent-light, rgba(79, 70, 229, 0.12))',
            borderBottom: '1px solid var(--accent, #4f46e5)',
            padding: '8px 16px',
            textAlign: 'center',
            fontSize: '12px',
            color: 'var(--accent, #4f46e5)',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>Previewing Member Pass for <b>{member.name}</b> (Live Member Dashboard)</span>
        </div>
      )}

      {/* 2. Main Tab View Content */}
      <main
        className="content"
        style={{
          maxWidth: '640px',
          margin: '0 auto',
          padding: '16px',
          width: '100%',
          flex: 1,
        }}
      >
        {activeTab === 'home' && (
          <MemberHomeTab
            member={member}
            gym={gym}
            announcements={announcements}
            notifications={notifications}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenReview={() => setShowReviewModal(true)}
            memberReview={currentReview}
            onRefresh={handleRefresh}
          />
        )}

        {activeTab === 'attendance' && (
          <MemberAttendanceTab
            member={member}
            gym={gym}
            attendanceHistory={attendance}
          />
        )}

        {activeTab === 'workout' && (
          <MemberWorkoutTab
            member={member}
            workouts={workouts}
            diet={diet}
          />
        )}

        {activeTab === 'explore' && (
          <MemberExploreGyms
            member={member}
            currentGym={gym}
          />
        )}

        {activeTab === 'payments' && (
          <MemberPaymentsTab
            member={member}
            gym={gym}
            paymentHistory={paymentHistory}
            onRefresh={handleRefresh}
          />
        )}

        {activeTab === 'profile' && (
          <MemberProfileTab
            member={member}
            gym={gym}
            onLogout={onLogout}
            onOpenPass={() => setActiveTab('home')}
            onOpenReview={() => setShowReviewModal(true)}
            memberReview={currentReview}
          />
        )}
      </main>

      {/* 3. Fixed Bottom Navigation Dock (6 Sections) */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--card)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid var(--border)',
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          padding: '6px 4px env(safe-area-inset-bottom, 8px)',
          zIndex: 50,
          boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* Tab 1: Home */}
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            padding: '6px 2px',
            color: activeTab === 'home' ? 'var(--accent, #4f46e5)' : 'var(--muted)',
            cursor: 'pointer',
            fontWeight: activeTab === 'home' ? 700 : 500,
            fontSize: '11px',
            transition: 'color 0.15s ease',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Home</span>
        </button>

        {/* Tab 2: Attendance */}
        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            padding: '6px 2px',
            color: activeTab === 'attendance' ? 'var(--accent, #4f46e5)' : 'var(--muted)',
            cursor: 'pointer',
            fontWeight: activeTab === 'attendance' ? 700 : 500,
            fontSize: '11px',
            transition: 'color 0.15s ease',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>Attendance</span>
        </button>

        {/* Tab 3: Workout */}
        <button
          type="button"
          onClick={() => setActiveTab('workout')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            padding: '6px 2px',
            color: activeTab === 'workout' ? 'var(--accent, #4f46e5)' : 'var(--muted)',
            cursor: 'pointer',
            fontWeight: activeTab === 'workout' ? 700 : 500,
            fontSize: '11px',
            transition: 'color 0.15s ease',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 5v14M18 5v14M2 9v6M22 9v6M6 12h12" />
          </svg>
          <span>Workout</span>
        </button>

        {/* Tab 4: Explore */}
        <button
          type="button"
          onClick={() => setActiveTab('explore')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            padding: '6px 2px',
            color: activeTab === 'explore' ? '#FF6200' : 'var(--muted)',
            cursor: 'pointer',
            fontWeight: activeTab === 'explore' ? 700 : 500,
            fontSize: '11px',
            transition: 'color 0.15s ease',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
          <span>Explore</span>
        </button>

        {/* Tab 5: Payments */}
        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            padding: '6px 2px',
            color: activeTab === 'payments' ? 'var(--accent, #4f46e5)' : 'var(--muted)',
            cursor: 'pointer',
            fontWeight: activeTab === 'payments' ? 700 : 500,
            fontSize: '11px',
            position: 'relative',
            transition: 'color 0.15s ease',
          }}
        >
          <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            {due > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-4px',
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: 'var(--danger, #ef4444)',
                  boxShadow: '0 0 0 2px var(--card)',
                }}
              />
            )}
          </span>
          <span>Payments</span>
        </button>

        {/* Tab 5: Profile */}
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            padding: '6px 2px',
            color: activeTab === 'profile' ? 'var(--accent, #4f46e5)' : 'var(--muted)',
            cursor: 'pointer',
            fontWeight: activeTab === 'profile' ? 700 : 500,
            fontSize: '11px',
            transition: 'color 0.15s ease',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>Profile</span>
        </button>
      </nav>

      {/* 4. Member Review & Rating Modal */}
      <MemberReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        gym={gym}
        member={member}
        existingReview={currentReview}
        onSuccess={(savedReview) => {
          setCurrentReview(savedReview)
          setShowReviewModal(false)
          handleRefresh()
        }}
      />
    </div>
  )
}
