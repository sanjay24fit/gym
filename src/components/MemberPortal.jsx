import { useState, useEffect } from 'react'
import GymLogo from './GymLogo'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'
import MemberHomeTab from './member/MemberHomeTab'
import MemberAttendanceTab from './member/MemberAttendanceTab'
import MemberWorkoutTab from './member/MemberWorkoutTab'
import MemberPaymentsTab from './member/MemberPaymentsTab'
import MemberProfileTab from './member/MemberProfileTab'
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            className="btn sm"
            onClick={handleRefresh}
            title="Refresh Data"
            style={{ fontSize: '13px', padding: '6px 8px', borderRadius: '8px' }}
          >
            <span
              style={{
                display: 'inline-block',
                transform: refreshing ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.5s ease',
              }}
            >
              🔄
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
          }}
        >
          👁️ Previewing Member Pass for <b>{member.name}</b> (Live Member Dashboard)
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
          />
        )}
      </main>

      {/* 3. Fixed Bottom Navigation Dock (5 Sections) */}
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
          gridTemplateColumns: 'repeat(5, 1fr)',
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
            gap: '2px',
            padding: '6px 2px',
            color: activeTab === 'home' ? 'var(--accent, #4f46e5)' : 'var(--muted)',
            cursor: 'pointer',
            fontWeight: activeTab === 'home' ? 700 : 500,
            fontSize: '11px',
            transition: 'color 0.15s ease',
          }}
        >
          <span style={{ fontSize: '18px' }}>🏠</span>
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
            gap: '2px',
            padding: '6px 2px',
            color: activeTab === 'attendance' ? 'var(--accent, #4f46e5)' : 'var(--muted)',
            cursor: 'pointer',
            fontWeight: activeTab === 'attendance' ? 700 : 500,
            fontSize: '11px',
            transition: 'color 0.15s ease',
          }}
        >
          <span style={{ fontSize: '18px' }}>📅</span>
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
            gap: '2px',
            padding: '6px 2px',
            color: activeTab === 'workout' ? 'var(--accent, #4f46e5)' : 'var(--muted)',
            cursor: 'pointer',
            fontWeight: activeTab === 'workout' ? 700 : 500,
            fontSize: '11px',
            transition: 'color 0.15s ease',
          }}
        >
          <span style={{ fontSize: '18px' }}>💪</span>
          <span>Workout</span>
        </button>

        {/* Tab 4: Payments */}
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
            gap: '2px',
            padding: '6px 2px',
            color: activeTab === 'payments' ? 'var(--accent, #4f46e5)' : 'var(--muted)',
            cursor: 'pointer',
            fontWeight: activeTab === 'payments' ? 700 : 500,
            fontSize: '11px',
            position: 'relative',
            transition: 'color 0.15s ease',
          }}
        >
          <span style={{ fontSize: '18px', position: 'relative' }}>
            💳
            {due > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-6px',
                  width: '8px',
                  height: '8px',
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
            gap: '2px',
            padding: '6px 2px',
            color: activeTab === 'profile' ? 'var(--accent, #4f46e5)' : 'var(--muted)',
            cursor: 'pointer',
            fontWeight: activeTab === 'profile' ? 700 : 500,
            fontSize: '11px',
            transition: 'color 0.15s ease',
          }}
        >
          <span style={{ fontSize: '18px' }}>👤</span>
          <span>Profile</span>
        </button>
      </nav>
    </div>
  )
}
