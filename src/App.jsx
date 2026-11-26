import { useCallback, useEffect, useState, lazy, Suspense } from 'react'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { today } from './lib/utils'
import { canUseGym as hasGymAccess } from './lib/access'
import { updateMemberPayment } from './lib/payments'
import { getStoredMemberSession, setStoredMemberSession, clearMemberSession, lookupMemberPortal } from './lib/memberPortal'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import SetupNotice from './components/SetupNotice'
import GymLogo from './components/GymLogo'
import SplashScreen from './components/SplashScreen'

// Lazy-loaded components for fast mobile initial load and minimal initial bundle size
const Members = lazy(() => import('./components/Members'))
const Payments = lazy(() => import('./components/Payments'))
const GymProfile = lazy(() => import('./components/GymProfile'))
const Admin = lazy(() => import('./components/Admin'))
const PaymentForm = lazy(() => import('./components/PaymentForm'))
const DownloadAppModal = lazy(() => import('./components/DownloadAppModal'))
const ResetPassword = lazy(() => import('./components/ResetPassword'))
const MemberPortal = lazy(() => import('./components/MemberPortal'))
const GymMemberRequests = lazy(() => import('./components/GymMemberRequests'))
const MemberPendingApproval = lazy(() => import('./components/MemberPendingApproval'))
const MemberRejected = lazy(() => import('./components/MemberRejected'))
const CityRankings = lazy(() => import('./components/CityRankings'))
const AccessBlocked = lazy(() => import('./components/AccessBlocked'))

function TabFallback() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '260px', padding: '32px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '28px', height: '28px', border: '3px solid rgba(53, 185, 130, 0.2)', borderTopColor: '#35B982', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: '13px', color: 'var(--muted, #96A39C)' }}>Loading…</span>
      </div>
    </div>
  )
}

function isValidUUID(str) {
  return (
    typeof str === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str)
  )
}

function getInitialCachedAccount() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('gym_cached_account')
    const parsed = raw ? JSON.parse(raw) : null
    if (parsed && parsed.userId && !isValidUUID(parsed.userId)) {
      localStorage.removeItem('gym_cached_account')
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function getInitialCachedMembers() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('gym_cached_members')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function hasStoredSupabaseToken() {
  if (typeof window === 'undefined') return false
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        return true
      }
    }
  } catch {}
  return false
}

export default function App() {
  const [session, setSession] = useState(undefined)
  const [loadedAccount, setAccount] = useState(() => getInitialCachedAccount()) // { userId, gym, isAdmin }
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => {
    if (typeof window === 'undefined') return false
    return (
      window.location.hash.includes('type=recovery') ||
      new URLSearchParams(window.location.search).get('type') === 'recovery'
    )
  })
  const [members, setMembers] = useState(() => getInitialCachedMembers())
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
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const [urlPhone] = useState(() => {
    if (typeof window === 'undefined') return ''
    return new URLSearchParams(window.location.search).get('phone') || ''
  })
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false
    return Boolean(
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    )
  })

  useEffect(() => {
    // Clear any legacy stored flag so browsers on mobile are never permanently blocked from seeing the install button
    try {
      localStorage.removeItem('gym_app_installed')
    } catch {}

    const handlePrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    const handleInstalled = () => {
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
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!data.session) {
        try {
          localStorage.removeItem('gym_cached_account')
        } catch {}
        setAccount(null)
      }
    })
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'SIGNED_OUT') {
        try {
          localStorage.removeItem('gym_cached_account')
        } catch {}
        setAccount(null)
      }
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true)
      }
    })
    return () => data?.subscription?.unsubscribe()
  }, [])

  const userId =
    session?.user?.id && isValidUUID(session.user.id)
      ? session.user.id
      : (session === undefined && isValidUUID(loadedAccount?.userId) ? loadedAccount.userId : null)
  const account = (loadedAccount && (!userId || loadedAccount.userId === userId)) ? loadedAccount : null

  useEffect(() => {
    if (!userId) {
      setAccount(null)
      setAuthMemberData(null)
      try {
        localStorage.removeItem('gym_cached_account')
      } catch {}
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

      // Fallback: If user signed up as a member in user_metadata, preserve member portal routing
      if (!isAdmin && !gymData && session?.user?.user_metadata?.role === 'member') {
        const fallbackMember = {
          success: true,
          status: 'pending',
          gym: { gym_name: 'Connected Gym', owner_name: 'Gym Owner' },
          request: {
            full_name: session.user.user_metadata.full_name || 'Member',
            phone: session.user.user_metadata.phone || '',
            gym_code_used: session.user.user_metadata.gym_code || '',
            created_at: session.user.created_at,
          },
        }
        setAuthMemberData(fallbackMember)
        setAccount({ userId, role: 'member', memberData: fallbackMember })
        return
      }

      if (gymRes.error && !gymRes.error.message?.includes('0 rows')) {
        const isAuthOrBadReq =
          gymRes.error.code === '22P02' ||
          gymRes.error.code === 'PGRST301' ||
          gymRes.error.message?.toLowerCase().includes('bad request') ||
          gymRes.error.message?.toLowerCase().includes('jwt') ||
          gymRes.error.message?.toLowerCase().includes('permission denied')

        if (isAuthOrBadReq) {
          try {
            localStorage.removeItem('gym_cached_account')
          } catch {}
          setAccount(null)
          supabase.auth.signOut().catch(() => {})
          return
        }

        if (!memberRes.data?.success) {
          setLoadError(gymRes.error.message)
          return
        }
      }

      const freshAcc = {
        userId,
        gym: gymData,
        isAdmin,
        role: isAdmin ? 'admin' : (gymData ? 'owner' : (memberRes.data?.success ? 'member' : 'unknown')),
      }
      setAccount(freshAcc)
      try {
        localStorage.setItem('gym_cached_account', JSON.stringify(freshAcc))
      } catch {}
      setTab((prevTab) => {
        if (!prevTab || prevTab === 'auth') return isAdmin ? 'admin' : 'dashboard'
        return prevTab
      })
    })
    return () => {
      cancelled = true
    }
  }, [userId, refreshKey, session])

  const gym = account?.gym
  // Frontend access gate — shared predicate mirroring SQL is_usable() (D1).
  const canUseGym = hasGymAccess(gym, today())

  const ownerPhoto =
    gym?.owner_photo ||
    gym?.avatar_url ||
    gym?.logo_url ||
    (typeof window !== 'undefined'
      ? localStorage.getItem(`gym_owner_photo_${gym?.id}`) || localStorage.getItem('gym_owner_photo_current')
      : null)

  // Pending member requests count
  useEffect(() => {
    if (!gym?.id) {
      setPendingRequestsCount(0)
      return
    }
    supabase
      .from('gym_member_requests')
      .select('id', { count: 'exact', head: true })
      .eq('gym_id', gym.id)
      .eq('status', 'pending')
      .then(({ count, error }) => {
        if (!error && typeof count === 'number') {
          setPendingRequestsCount(count)
        } else {
          setPendingRequestsCount(0)
        }
      })
      .catch(() => setPendingRequestsCount(0))
  }, [gym?.id])

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
    try {
      localStorage.setItem('gym_cached_members', JSON.stringify(all.slice(0, 500)))
    } catch {}
  }, [])

  useEffect(() => {
    if (canUseGym) loadMembers()
  }, [canUseGym, loadMembers])

  const logout = () => {
    setMembers([])
    setLoadError('')
    try {
      localStorage.removeItem('gym_cached_account')
      localStorage.removeItem('gym_cached_members')
    } catch {}
    setAccount(null)
    supabase.auth.signOut()
  }

  const refresh = async () => {
    setLoadError('')
    try {
      localStorage.removeItem('gym_cached_account')
    } catch {}
    if (userId && isValidUUID(userId)) {
      try {
        const { data: freshGym, error: gymErr } = await supabase
          .from('gyms')
          .select('*')
          .eq('id', userId)
          .maybeSingle()
        if (freshGym) {
          setAccount((prev) => (prev ? { ...prev, gym: freshGym } : prev))
          return
        }
        if (gymErr) {
          const { data: sData } = await supabase.auth.getSession()
          setSession(sData?.session || null)
        }
      } catch {
        // Fallback
      }
    }
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
    } else if (action === 'renew' && data) {
      setMembersInitialDialog({ type: 'renew', member: data })
      setTab('members')
    } else if (action === 'edit' && data) {
      setMembersInitialDialog({ type: 'edit', member: data })
      setTab('members')
    } else if (action === 'payments') {
      setTab('payments')
    } else if (action === 'rankings') {
      setTab('rankings')
    } else if (action === 'profile') {
      setTab('profile')
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
      <Suspense fallback={<SplashScreen message="Loading…" />}>
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
      </Suspense>
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
      <Suspense fallback={<SplashScreen message="Opening Member Pass…" />}>
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
      </Suspense>
    )
  }

  // Instant render: if account is already cached from previous login, DO NOT block UI with splash screen!
  // Only show splash screen if session is resolving AND there's a stored token with no cached account yet.
  if (session === undefined && !account) {
    if (hasStoredSupabaseToken()) {
      return <SplashScreen message="Starting Gym Manager…" />
    }
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
        {showDownloadApp && (
          <Suspense fallback={null}>
            <DownloadAppModal
              isOpen={showDownloadApp}
              onClose={() => setShowDownloadApp(false)}
              deferredPrompt={deferredPrompt}
              onInstalled={() => {
                setDeferredPrompt(null)
              }}
            />
          </Suspense>
        )}
      </>
    )
  }

  if (session && !account) {
    return <SplashScreen message="Opening your gym dashboard…" />
  }

  if (!session && !account) {
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
        {showDownloadApp && (
          <Suspense fallback={null}>
            <DownloadAppModal
              isOpen={showDownloadApp}
              onClose={() => setShowDownloadApp(false)}
              deferredPrompt={deferredPrompt}
              onInstalled={() => {
                setDeferredPrompt(null)
              }}
            />
          </Suspense>
        )}
      </>
    )
  }

  // Authenticated Member Routing
  if (account?.role === 'member' || authMemberData) {
    const memData = authMemberData || account?.memberData
    if (memData?.status === 'pending') {
      return (
        <Suspense fallback={<SplashScreen message="Checking status…" />}>
          <MemberPendingApproval
            gym={memData.gym}
            request={memData.request}
            onRefresh={refresh}
            onLogout={logout}
          />
        </Suspense>
      )
    }
    if (memData?.status === 'rejected') {
      return (
        <Suspense fallback={<SplashScreen message="Loading status…" />}>
          <MemberRejected
            gym={memData.gym}
            notes={memData.notes}
            onRetry={refresh}
            onLogout={logout}
          />
        </Suspense>
      )
    }
    if (memData?.status === 'approved' && memData.member) {
      return (
        <Suspense fallback={<SplashScreen message="Opening Member Pass…" />}>
          <MemberPortal
            member={memData.member}
            gym={memData.gym}
            onLogout={logout}
            onRefresh={refresh}
          />
        </Suspense>
      )
    }
  }

  if (!account.isAdmin && !canUseGym) {
    return (
      <Suspense fallback={<SplashScreen message="Checking access…" />}>
        <AccessBlocked gym={gym} userEmail={session?.user?.email || gym?.email || ''} onLogout={logout} onRefresh={refresh} />
      </Suspense>
    )
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
          key: 'rankings',
          label: 'Rankings',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.45 1-1 1H7" />
              <path d="M14 14.66V17c0 .55.45 1 1 1h2" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
          ),
        },
        {
          key: 'requests',
          label: 'Requests',
          badge: pendingRequestsCount > 0 ? `${pendingRequestsCount} pending` : null,
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
            <span className="muted small brand-email">{session?.user?.email || gym?.email || ''}</span>
          </div>
        </div>

        {/* Primary Desktop Navigation (Centered) */}
        <nav className="nav-desktop" aria-label="Primary Navigation">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              className={tab === t.key ? 'active' : ''}
              style={{ position: 'relative' }}
              onClick={() => {
                setMembersInitialDialog(null)
                setTab(t.key)
              }}
            >
              {t.badge && <span className="tab-floating-badge">{t.badge}</span>}
              <span className="nav-icon" style={{ width: 16, height: 16, display: 'inline-flex' }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        {/* Topbar Actions: Share Invite & Gym Owner Profile Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {canUseGym && (
            <button
              type="button"
              className="topbar-share-invite-btn"
              onClick={() => setTab('requests')}
              title="Share Gym Connection Code with members"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              <span>Share Invite</span>
            </button>
          )}

          {canUseGym && (
            <button
              type="button"
              className="topbar-owner-profile-btn"
              onClick={() => setTab('gym')}
              title="Open Gym Profile & Settings"
            >
              <div className="topbar-owner-avatar">
                {ownerPhoto ? (
                  <img src={ownerPhoto} alt={gym?.owner_name || 'Gym Owner'} className="topbar-owner-img" />
                ) : (
                  <span>
                    {gym?.owner_name
                      ? gym.owner_name.slice(0, 2).toUpperCase()
                      : (gym?.gym_name ? gym.gym_name.slice(0, 2).toUpperCase() : 'GM')}
                  </span>
                )}
              </div>
              <div className="topbar-owner-info">
                <span className="topbar-owner-name">{gym?.owner_name || 'Gym Owner'}</span>
                <span className="topbar-owner-role">Gym Owner</span>
              </div>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="content">
        {tab === 'dashboard' && canUseGym && (
          <Dashboard
            members={members}
            gymName={gym?.gym_name}
            gym={gym}
            onGymUpdated={(updatedGym) => {
              setAccount((prev) => (prev ? { ...prev, gym: { ...prev.gym, ...updatedGym } } : prev))
            }}
            onOpen={(f) => {
              setFilter(f)
              setMembersInitialDialog(null)
              setTab('members')
            }}
            onAction={handleDashboardAction}
            onPreviewMemberPass={(m) => setMemberPreview({ member: m, gym })}
          />
        )}

        {tab === 'members' && canUseGym && (
          <Suspense fallback={<TabFallback />}>
            <Members
              members={members}
              filter={filter}
              setFilter={setFilter}
              reload={loadMembers}
              gym={gym}
              initialDialog={membersInitialDialog}
              onPreviewMemberPass={(m) => setMemberPreview({ member: m, gym })}
            />
          </Suspense>
        )}

        {tab === 'payments' && canUseGym && (
          <Suspense fallback={<TabFallback />}>
            <Payments
              members={members}
              onCollectPayment={(m) => setPaymentDialogMember(m)}
              onEditMember={(m) => {
                setMembersInitialDialog({ type: 'edit', member: m })
                setTab('members')
              }}
            />
          </Suspense>
        )}

        {tab === 'rankings' && canUseGym && (
          <Suspense fallback={<TabFallback />}>
            <CityRankings
              gym={gym}
              onRefreshGym={refresh}
            />
          </Suspense>
        )}

        {tab === 'requests' && canUseGym && (
          <Suspense fallback={<TabFallback />}>
            <GymMemberRequests
              gym={gym}
              existingMembers={members}
              reloadGym={refresh}
              reloadMembers={loadMembers}
              onPendingCountChange={setPendingRequestsCount}
            />
          </Suspense>
        )}

        {tab === 'gym' && canUseGym && (
          <Suspense fallback={<TabFallback />}>
            <GymProfile
              gym={gym}
              userEmail={session?.user?.email || gym?.email || ''}
              onLogout={logout}
              isInstalled={isInstalled}
              onDownloadApp={handleDownloadApp}
              onRefresh={refresh}
              onGymUpdated={(updatedGym) => {
                setAccount((prev) => (prev ? { ...prev, gym: { ...prev.gym, ...updatedGym } } : prev))
              }}
            />
          </Suspense>
        )}

        {tab === 'admin' && account.isAdmin && (
          <Suspense fallback={<TabFallback />}>
            <Admin adminId={userId} />
          </Suspense>
        )}
      </main>

      {/* Standalone Payment Modal when triggered from Payments tab or Dashboard */}
      {paymentDialogMember && (
        <Suspense fallback={null}>
          <PaymentForm
            member={paymentDialogMember}
            onSave={handlePaymentSave}
            onClose={() => setPaymentDialogMember(null)}
          />
        </Suspense>
      )}

      {/* Download App Modal */}
      {showDownloadApp && (
        <Suspense fallback={null}>
          <DownloadAppModal
            isOpen={showDownloadApp}
            onClose={() => setShowDownloadApp(false)}
            deferredPrompt={deferredPrompt}
            onInstalled={() => {
              setDeferredPrompt(null)
            }}
          />
        </Suspense>
      )}

      {/* Live Member Pass Preview Overlay for Gym Owners */}
      {memberPreview && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'var(--bg)', overflowY: 'auto' }}>
          <Suspense fallback={<SplashScreen message="Opening Pass Preview…" />}>
            <MemberPortal
              member={memberPreview.member}
              gym={memberPreview.gym}
              isOwnerPreview={true}
              onClosePreview={() => setMemberPreview(null)}
            />
          </Suspense>
        </div>
      )}

      {/* Mobile Floating Bottom Navigation Dock */}
      <nav className="bottom-nav" aria-label="Quick Navigation Dock">
        <div className="bottom-nav-inner">
          {tabs.map((t) => {
            const isActive = tab === t.key
            return (
              <button
                key={t.key}
                type="button"
                className={`bottom-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setMembersInitialDialog(null)
                  setTab(t.key)
                }}
                title={t.label}
                aria-label={t.label}
              >
                <div className="bottom-nav-icon-container">
                  <span className="bottom-nav-icon-wrap">
                    {t.icon}
                  </span>
                  {t.badge && (
                    <span className="bottom-nav-badge-dot">
                      {t.badge}
                    </span>
                  )}
                </div>
                <span className="bottom-nav-label-text">{t.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
