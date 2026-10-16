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
import WhatsAppSupport from './components/WhatsAppSupport'
import SetupNotice from './components/SetupNotice'
import GymLogo from './components/GymLogo'
import DownloadAppModal from './components/DownloadAppModal'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [loadedAccount, setAccount] = useState(null) // { userId, gym, isAdmin }
  const [members, setMembers] = useState([])
  const [tab, setTab] = useState('dashboard')
  const [filter, setFilter] = useState('all')
  const [refreshKey, setRefreshKey] = useState(0)
  const [loadError, setLoadError] = useState('')
  const [membersInitialDialog, setMembersInitialDialog] = useState(null)
  const [paymentDialogMember, setPaymentDialogMember] = useState(null)
  const [showDownloadApp, setShowDownloadApp] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  useEffect(() => {
    const handlePrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handlePrompt)
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt)
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
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
      setShowDownloadApp(true)
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

  if (!isSupabaseConfigured) {
    return <SetupNotice />
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
        <Auth onDownloadApp={() => setShowDownloadApp(true)} />
        <DownloadAppModal
          isOpen={showDownloadApp}
          onClose={() => setShowDownloadApp(false)}
          deferredPrompt={deferredPrompt}
          onInstalled={() => setDeferredPrompt(null)}
        />
      </>
    )
  }
  if (!account.isAdmin && !canUseGym) return <AccessBlocked gym={gym} onLogout={logout} onRefresh={refresh} />

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
      {/* Header Topbar */}
      <header className="topbar">
        <div className="brand">
          <GymLogo size={40} />
          <div className="brand-details">
            <b>{account.isAdmin && tab === 'admin' ? 'Gym Manager – Admin' : gym?.gym_name || 'Gym Manager'}</b>
            <span className="muted small block">{session.user.email}</span>
          </div>
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            className="btn-download-app"
            onClick={() => setShowDownloadApp(true)}
            title="Download / Install Gym Manager app on your phone"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Download App</span>
          </button>
          <WhatsAppSupport className="sm" iconSize={12} label="Support" />
          <button className="btn sm secondary" onClick={logout}>Logout</button>
        </div>
      </header>

      {/* Desktop Navigation */}
      <nav className="nav-desktop">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? 'active' : ''}
            onClick={() => {
              setMembersInitialDialog(null)
              setTab(t.key)
            }}
          >
            <span style={{ width: 16, height: 16, display: 'inline-flex' }}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

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
            onDownloadApp={() => setShowDownloadApp(true)}
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
        onInstalled={() => setDeferredPrompt(null)}
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
