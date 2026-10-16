import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { today } from './lib/utils'
import Auth from './components/Auth'
import AccessBlocked from './components/AccessBlocked'
import Dashboard from './components/Dashboard'
import Members from './components/Members'
import Admin from './components/Admin'
import WhatsAppSupport from './components/WhatsAppSupport'
import SetupNotice from './components/SetupNotice'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [loadedAccount, setAccount] = useState(null) // { userId, gym, isAdmin }
  const [members, setMembers] = useState([])
  const [tab, setTab] = useState('dashboard')
  const [filter, setFilter] = useState('all')
  const [refreshKey, setRefreshKey] = useState(0)
  const [loadError, setLoadError] = useState('')

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
      const { data, error } = await supabase.from('members').select('*').order('end_date').order('id').range(from, from + PAGE - 1)
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
  if (!session) return <Auth />
  if (!account.isAdmin && !canUseGym) return <AccessBlocked gym={gym} onLogout={logout} onRefresh={refresh} />

  const tabs = [
    ...(canUseGym ? [{ key: 'dashboard', label: 'Dashboard' }, { key: 'members', label: 'Members' }] : []),
    ...(account.isAdmin ? [{ key: 'admin', label: 'Admin Panel' }] : []),
  ]

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">GM</span>
          <div>
            <b>{account.isAdmin && tab === 'admin' ? 'Gym Manager – Admin' : gym?.gym_name || 'Gym Manager'}</b>
            <span className="muted small block">{session.user.email}</span>
          </div>
        </div>
        <div className="topbar-actions">
          <WhatsAppSupport className="sm" />
          <button className="btn sm" onClick={logout}>Logout</button>
        </div>
      </header>

      <nav className="nav">
        {tabs.map((t) => (
          <button key={t.key} className={tab === t.key ? 'active' : ''} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </nav>

      <main className="content">
        {tab === 'dashboard' && canUseGym && (
          <Dashboard
            members={members}
            onOpen={(f) => {
              setFilter(f)
              setTab('members')
            }}
          />
        )}
        {tab === 'members' && canUseGym && (
          <Members members={members} filter={filter} setFilter={setFilter} reload={loadMembers} />
        )}
        {tab === 'admin' && account.isAdmin && <Admin adminId={userId} />}
      </main>
    </div>
  )
}
