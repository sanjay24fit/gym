import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { today } from './lib/utils'
import { canUseGym as hasGymAccess } from './lib/access'
import { updateMemberPayment } from './lib/payments'
import { getStoredMemberSession, setStoredMemberSession, clearMemberSession, lookupMemberPortal } from './lib/memberPortal'
import Auth from './components/Auth'
import AccessBlocked from './components/AccessBlocked'
import Dashboard from './components/Dashboard'
import Members from './components/Members'
import Payments from './components/Payments'
import GymProfile from './components/GymProfile'
import Admin from './components/Admin'
import PaymentForm from './components/PaymentForm'
import SetupNotice from './components/SetupNotice'
import GymLogo from './components/GymLogo'
import DownloadAppModal from './components/DownloadAppModal'
import ResetPassword from './components/ResetPassword'
import MemberPortal from './components/MemberPortal'
import GymMemberRequests from './components/GymMemberRequests'
import MemberPendingApproval from './components/MemberPendingApproval'
import MemberRejected from './components/MemberRejected'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [loadedAccount, setAccount] = useState(null) // { userId, gym, isAdmin }
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => {
    if (typeof window === 'undefined') return false
    return (
      window.location.hash.includes('type=recovery') ||
      new URLSearchParams(window.location.search).get('type') === 'recovery'
    )
  })
  const [members, setMembers] = useState([])
  const [tab, setTab] = useState('dashboard')
  const [filter, setFilter] = useState('all')
  const [refreshKey, setRefreshKey] = useState(0)
  const [loadError, setLoadError] = useState('')
  const [membersInitialDialog, setMembersInitialDialog] = useState(null)
  const [paymentDialogMember, setPaymentDialogMember] = useState(null)
  const [showDownloadApp, setShowDownloadApp] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [memberSession, setMemberSession] = useState(() => getStoredMemberSession())
  const [memberPreview, setMemberPreview] = useState(null)
  const [authMemberData, setAuthMemberData] = useState(null)
  const [urlPhone] = useState(() => {
    if (typeof window === 'undefined') return ''
    return new URLSearchParams(window.location.search).get('phone') || ''
  })
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    const stored = localStorage.getItem('gym_app_installed') === 'true'
    return Boolean(standalone || stored)
  })

  useEffect(() => {
    const handlePrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    const handleInstalled = () => {
      setIsInstalled(true)
      localStorage.setItem('gym_app_installed', 'true')
      setDeferredPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', handlePrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  // Auto-login member if phone param is present in URL
  useEffect(() => {
    if (urlPhone && !memberSession && !session) {
      lookupMemberPortal(urlPhone).then((res) => {
        if (res.success && res.memberships?.[0]) {
          setStoredMemberSession(res.memberships[0])
          setMemberSession(res.memberships[0])
        }
      })
    }
  }, [urlPhone, memberSession, session])

  const handleDownloadApp = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
          setIsInstalled(true)
          localStorage.setItem('gym_app_installed', 'true')
          setDeferredPrompt(null)
          return
        }
      } catch (err) {
        console.warn('Install prompt error:', err)
      }
    }
    setShowDownloadApp(true)
  }

  useEffect(() => {
    if (!isSupabaseConfigured) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true)
      }
    })
    return () => data?.subscription?.unsubscribe()
  }, [])

  const userId = session?.user?.id
  const account = loadedAccount?.userId === userId ? loadedAccount : null

  useEffect(() => {
    if (!userId) {
      setAccount(null)
      setAuthMemberData(null)
      return
    }
    let cancelled = false
    Promise.all([
      supabase.from('gyms').select('*').eq('id', userId).maybeSingle(),
      supabase.rpc('is_admin'),
      supabase.rpc('get_authenticated_member_data'),
    ]).then(([gymRes, adminRes, memberRes]) => {
      if (cancelled) return

      const isAdmin = adminRes.data === true
      const gymData = gymRes.data

      // If user is not an owner or admin, but has member data
      if (!isAdmin && !gymData && memberRes.data && memberRes.data.success) {
        setAuthMemberData(memberRes.data)
        setAccount({ userId, role: 'member', memberData: memberRes.data })
        return
      }

      if (gymRes.error && !gymRes.error.message?.includes('0 rows')) {
        if (!memberRes.data?.success) {
          setLoadError(gymRes.error.message)
          return
        }
      }

      setAccount({
        userId,
        gym: gymData,
        isAdmin,
        role: isAdmin ? 'admin' : (gymData ? 'owner' : (memberRes.data?.success ? 'member' : 'unknown')),
      })
      setTab(isAdmin ? 'admin' : 'dashboard')
    })
    return () => {
      cancelled = true
    }
  }, [userId, refreshKey])

  const gym = account?.gym
  // Frontend access gate — shared predicate mirroring SQL is_usable() (D1).
  const canUseGym = hasGymAccess(gym, today())

  const loadMembers = useCallback(async () => {
    const PAGE = 1000
    const all = []
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('end_date')
        .order('id')
        .range(from, from + PAGE - 1)
      if (error) {
        alert('Could not load members: ' + error.message)
        return
      }
      all.push(...data)
      if (data.length < PAGE) break
    }
    setMembers(all)
  }, [])

  useEffect(() => {
    if (canUseGym) loadMembers()
  }, [canUseGym, loadMembers])

  const logout = () => {
    setMembers([])
    setLoadError('')
    supabase.auth.signOut()
  }

  const refresh = () => {
    setLoadError('')
    setAccount(null)
    setRefreshKey((k) => k + 1)
  }

  // Handle Quick Actions from Dashboard
  function handleDashboardAction(action, data = null) {
    if (action === 'add') {
      setMembersInitialDialog({ type: 'add' })
      setTab('members')
    } else if (action === 'scan') {
      setMembersInitialDialog({ type: 'scan' })
      setTab('members')
    } else if (action === 'payments') {
      setTab('payments')
    } else if (action === 'download') {
      handleDownloadApp()
    } else if (action === 'pay' && data) {
      setPaymentDialogMember(data)
    }
  }

  // Handle payment save (shared single-column update — T01 S1)
  async function handlePaymentSave(values) {
    if (!paymentDialogMember) return
    const errMsg = await updateMemberPayment(paymentDialogMember.id, values.paid_amount)
    if (errMsg) return errMsg
    setPaymentDialogMember(null)
    await loadMembers()
  }

  if (!isSupabaseConfigured) {
    return <SetupNotice />
  }

  if (isPasswordRecovery) {
    return (
      <ResetPassword
        onComplete={() => {
          setIsPasswordRecovery(false)
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', window.location.pathname)
          }
          refresh()
        }}
        onCancel={() => {
          setIsPasswordRecovery(false)
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', window.location.pathname)
          }
          logout()
        }}
      />
    )
  }

  if (session && loadError) {
    return (
      <div className="center-page">
        <div className="card auth-card">
          <h2>Connection problem</h2>
          <p className="muted">Could not load your account. Please check your internet and try again.</p>
          <p className="muted small">{loadError}</p>
          <button className="btn primary full" onClick={refresh}>Try again</button>
          <button className="btn full" onClick={logout}>Logout</button>
        </div>
      </div>
    )
  }

  // Member Portal Session (Direct Phone-Based Access)
  if (memberSession) {
    return (
      <MemberPortal
        member={memberSession.member}
        gym={memberSession.gym}
        onLogout={() => {
          clearMemberSession()
          setMemberSession(null)
          if (typeof window !== 'undefined' && window.location.search.includes('phone')) {
            window.history.replaceState(null, '', window.location.pathname)
          }
        }}
        onRefresh={async () => {
          const res = await lookupMemberPortal(memberSession.member?.phone)
          if (res.success && res.memberships?.[0]) {
            setStoredMemberSession(res.memberships[0])
            setMemberSession(res.memberships[0])
          }
        }}
      />
    )
  }

  if (session === undefined || (session && !account)) {
    return <div className="center-page muted">Loading…</div>
  }

  if (!session) {
    return (
      <>
        <Auth
          onDownloadApp={handleDownloadApp}
          isInstalled={isInstalled}
          initialPhone={urlPhone}
          onMemberLogin={(data) => {
            setStoredMemberSession(data)
            setMemberSession(data)
          }}
        />
        <DownloadAppModal
          isOpen={showDownloadApp}
          onClose={() => setShowDownloadApp(false)}
          deferredPrompt={deferredPrompt}
          onInstalled={() => {
            setIsInstalled(true)
            localStorage.setItem('gym_app_installed', 'true')
            setDeferredPrompt(null)
          }}
        />
      </>
    )
  }

  // Authenticated Member Routing
  if (account?.role === 'member' || authMemberData) {
    const memData = authMemberData || account?.memberData
    if (memData?.status === 'pending') {
      return (
        <MemberPendingApproval
          gym={memData.gym}
          request={memData.request}
          onRefresh={refresh}
          onLogout={logout}
        />
      )
    }
    if (memData?.status === 'rejected') {
      return (
        <MemberRejected
          gym={memData.gym}
          notes={memData.notes}
          onRetry={refresh}
          onLogout={logout}
        />
      )
    }
    if (memData?.status === 'approved' && memData.member) {
      return (
        <MemberPortal
          member={memData.member}
          gym={memData.gym}
          onLogout={logout}
          onRefresh={refresh}
        />
      )
    }
  }

  if (!account.isAdmin && !canUseGym) {
    return <AccessBlocked gym={gym} userEmail={session.user.email} onLogout={logout} onRefresh={refresh} />
  }

  const tabs = [
    ...(canUseGym
      ? [
        {
          key: 'dashboard',
          label: 'Home',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          ),
        },
        {
          key: 'members',
          label: 'Members',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          ),
        },
        {
          key: 'payments',
          label: 'Payments',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          ),
        },
        {
          key: 'requests',
          label: 'Requests',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          ),
        },
        {
          key: 'gym',
          label: 'Gym',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M3 21h18" />
              <path d="M5 21V7l8-4v18" />
              <path d="M19 21V11l-6-3" />
            </svg>
          ),
        },
      ]
      : []),
    ...(account.isAdmin
      ? [
        {
          key: 'admin',
          label: 'Admin Panel',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          ),
        },
      ]
      : []),
  ]

  return (
    <div className="app">
      {/* Redesigned Minimalist Modern Dashboard Header */}
      <header className="topbar">
        <div className="brand">
          <GymLogo size={38} />
          <div className="brand-details">
            <span className="brand-gym-title">
              {account.isAdmin && tab === 'admin' ? 'Gym Manager – Admin' : gym?.gym_name || 'Gym Manager'}
            </span>
            <span className="muted small brand-email">{session.user.email}</span>
          </div>
        </div>

        {/* Primary Desktop Navigation (Centered) */}
        <nav className="nav-desktop" aria-label="Primary Navigation">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              className={tab === t.key ? 'active' : ''}
              onClick={() => {
                setMembersInitialDialog(null)
                setTab(t.key)
              }}
            >
              <span className="nav-icon" style={{ width: 16, height: 16, display: 'inline-flex' }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="content">
        {tab === 'dashboard' && canUseGym && (
          <Dashboard
            members={members}
            gymName={gym?.gym_name}
            onOpen={(f) => {
              setFilter(f)
              setMembersInitialDialog(null)
              setTab('members')
            }}
            onAction={handleDashboardAction}
          />
        )}

        {tab === 'members' && canUseGym && (
          <Members
            members={members}
            filter={filter}
            setFilter={setFilter}
            reload={loadMembers}
            initialDialog={membersInitialDialog}
            onPreviewMemberPass={(m) => setMemberPreview({ member: m, gym })}
          />
        )}

        {tab === 'payments' && canUseGym && (
          <Payments
            members={members}
            onCollectPayment={(m) => setPaymentDialogMember(m)}
            onEditMember={(m) => {
              setMembersInitialDialog({ type: 'edit', member: m })
              setTab('members')
            }}
          />
        )}

        {tab === 'requests' && canUseGym && (
          <GymMemberRequests
            gym={gym}
            existingMembers={members}
            reloadGym={refresh}
            reloadMembers={loadMembers}
          />
        )}

        {tab === 'gym' && canUseGym && (
          <GymProfile
            gym={gym}
            userEmail={session.user.email}
            onLogout={logout}
            isInstalled={isInstalled}
            onDownloadApp={handleDownloadApp}
            onRefresh={refresh}
          />
        )}

        {tab === 'admin' && account.isAdmin && <Admin adminId={userId} />}
      </main>

      {/* Standalone Payment Modal when triggered from Payments tab or Dashboard */}
      {paymentDialogMember && (
        <PaymentForm
          member={paymentDialogMember}
          onSave={handlePaymentSave}
          onClose={() => setPaymentDialogMember(null)}
        />
      )}

      {/* Download App Modal */}
      <DownloadAppModal
        isOpen={showDownloadApp}
        onClose={() => setShowDownloadApp(false)}
        deferredPrompt={deferredPrompt}
        onInstalled={() => {
          setIsInstalled(true)
          localStorage.setItem('gym_app_installed', 'true')
          setDeferredPrompt(null)
        }}
      />

      {/* Live Member Pass Preview Overlay for Gym Owners */}
      {memberPreview && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'var(--bg)', overflowY: 'auto' }}>
          <MemberPortal
            member={memberPreview.member}
            gym={memberPreview.gym}
            isOwnerPreview={true}
            onClosePreview={() => setMemberPreview(null)}
          />
        </div>
      )}

      {/* Mobile Floating Bottom Navigation Dock */}
      <nav className="bottom-nav" aria-label="Quick Navigation Dock">
        <div className="bottom-nav-inner">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`bottom-nav-item ${tab === t.key ? 'active' : ''}`}
              onClick={() => {
                setMembersInitialDialog(null)
                setTab(t.key)
              }}
              title={t.label}
              aria-label={t.label}
            >
              <span style={{ display: 'inline-flex', width: 19, height: 19, alignItems: 'center', justifyContent: 'center' }}>
                {t.icon}
              </span>
              {tab === t.key && <span style={{ marginLeft: 2, fontSize: 12 }}>{t.label}</span>}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
