import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { today } from './lib/utils'
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
import UtilityMenu from './components/UtilityMenu'
import FitnessApp from './components/FitnessApp/FitnessApp'

export default function App() {
  const [appMode, setAppMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('view') === 'manager') return 'manager'
      if (params.get('view') === 'fitness') return 'fitness'
      const stored = localStorage.getItem('gym_active_mode')
      if (stored) return stored
    }
    return 'fitness'
  })
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
    if (!userId) return
    let cancelled = false
    Promise.all([
      supabase.from('gyms').select('*').eq('id', userId).maybeSingle(),
      supabase.rpc('is_admin'),
    ]).then(([gymRes, adminRes]) => {
      if (cancelled) return
      if (gymRes.error || adminRes.error) {
        setLoadError((gymRes.error || adminRes.error).message)
        return
      }
      const isAdmin = adminRes.data === true
      setAccount({ userId, gym: gymRes.data, isAdmin })
      setTab(isAdmin ? 'admin' : 'dashboard')
    })
    return () => {
      cancelled = true
    }
  }, [userId, refreshKey])

  const gym = account?.gym
  const canUseGym = gym?.status === 'active' && (!gym.valid_until || gym.valid_until >= today())

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

  // Handle payment save
  async function handlePaymentSave(values) {
    if (!paymentDialogMember) return
    const { error } = await supabase.from('members').update(values).eq('id', paymentDialogMember.id)
    if (error) return error.message
    setPaymentDialogMember(null)
    await loadMembers()
  }

  if (appMode === 'fitness') {
    return (
      <FitnessApp
        onBackToManager={() => {
          setAppMode('manager')
          try {
            localStorage.setItem('gym_active_mode', 'manager')
          } catch {}
        }}
      />
    )
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

  if (session === undefined || (session && !account)) {
    return <div className="center-page muted">Loading…</div>
  }

  if (!session) {
    return (
      <>
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999 }}>
          <button
            type="button"
            onClick={() => {
              setAppMode('fitness')
              try { localStorage.setItem('gym_active_mode', 'fitness') } catch {}
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 999,
              background: 'linear-gradient(135deg, #38C1A5 0%, #2FA88E 100%)',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.84rem',
              boxShadow: '0 8px 24px rgba(56, 193, 165, 0.4)',
              cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            <span>🌿 Fitness UI Theme</span>
            <span>→</span>
          </button>
        </div>
        <Auth onDownloadApp={handleDownloadApp} isInstalled={isInstalled} />
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

        {/* Topbar Right - User Profile Info & Single Utility Hamburger Menu */}
        <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => {
              setAppMode('fitness')
              try { localStorage.setItem('gym_active_mode', 'fitness') } catch {}
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 999,
              background: 'linear-gradient(135deg, #38C1A5 0%, #2FA88E 100%)',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.8rem',
              boxShadow: '0 4px 14px rgba(56, 193, 165, 0.35)',
              cursor: 'pointer',
            }}
          >
            <span>🌿 Fitness UI</span>
          </button>
          <UtilityMenu
            gymName={gym?.gym_name}
            userEmail={session.user.email}
            isAdmin={account.isAdmin}
            isInstalled={isInstalled}
            onDownloadApp={handleDownloadApp}
            onLogout={logout}
          />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="content">
        {tab === 'dashboard' && canUseGym && (
          <Dashboard
            members={members}
            gymName={gym?.gym_name}
            isInstalled={isInstalled}
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
          />
        )}

        {tab === 'payments' && canUseGym && (
          <Payments
            members={members}
            onCollectPayment={(m) => setPaymentDialogMember(m)}
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

      {/* Mobile Bottom Navigation Bar */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`bottom-nav-item ${tab === t.key ? 'active' : ''}`}
              onClick={() => {
                setMembersInitialDialog(null)
                setTab(t.key)
              }}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
