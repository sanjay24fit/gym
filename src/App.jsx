import { useCallback, useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { today } from './lib/utils'
import Auth from './components/Auth'
import AccessBlocked from './components/AccessBlocked'
import Dashboard from './components/Dashboard'
import Members from './components/Members'
import Admin from './components/Admin'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [loadedAccount, setAccount] = useState(null) // { userId, gym, isAdmin }
  const [members, setMembers] = useState([])
  const [tab, setTab] = useState('dashboard')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
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
      const isAdmin = adminRes.data === true
      setAccount({ userId, gym: gymRes.data, isAdmin })
      setTab(isAdmin ? 'admin' : 'dashboard')
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  const gym = account?.gym
  const canUseGym = gym?.status === 'active' && (!gym.valid_until || gym.valid_until >= today())

  const loadMembers = useCallback(async () => {
    const { data, error } = await supabase.from('members').select('*').order('end_date')
    if (!error) setMembers(data)
  }, [])

  useEffect(() => {
    if (canUseGym) loadMembers()
  }, [canUseGym, loadMembers])

  const logout = () => {
    setMembers([])
    supabase.auth.signOut()
  }

  if (session === undefined || (session && !account)) {
    return <div className="center-page muted">Loading…</div>
  }
  if (!session) return <Auth />
  if (!account.isAdmin && !canUseGym) return <AccessBlocked gym={gym} onLogout={logout} />

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
        <button className="btn sm" onClick={logout}>Logout</button>
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
