import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, CreditCard, LayoutDashboard, MapPin, MessageCircle, Menu, Moon, Plus, Search, Settings2, Sun, Users } from 'lucide-react'
import { Logo } from '../../components/ui'
import { AppCtx } from '../../context'
import { useFetch } from '../../hooks'
import { api } from '../../api'

const NAV = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/members', label: 'Members', icon: Users },
  { to: '/app/fees', label: 'Fees', icon: CreditCard },
  { to: '/app/reminders', label: 'WhatsApp reminders', icon: MessageCircle },
  { to: '/app/settings', label: 'Plans & settings', icon: Settings2 },
]

function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('fittrack-theme') || 'dark' } catch { return 'dark' }
  })
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('fittrack-theme', theme) } catch { /* private mode */ }
    return () => { document.documentElement.dataset.theme = 'dark' }
  }, [theme])
  return [theme, () => setTheme(theme === 'dark' ? 'light' : 'dark')]
}

export default function AppLayout() {
  const [open, setOpen] = useState(false)
  const [theme, toggle] = useTheme()
  const [q, setQ] = useState('')
  const nav = useNavigate()
  const loc = useLocation()
  const settings = useFetch(() => api.settings(), [])
  const templates = useFetch(() => api.templates(), [])
  const locs = useFetch(() => api.locations(), [])
  const [locationId, setLoc] = useState(() => {
    try { return localStorage.getItem('fittrack-location') || 'all' } catch { return 'all' }
  })
  const locations = locs.data || []
  const valid = locationId === 'all' || locations.some((l) => String(l.id) === String(locationId))
  const activeLoc = valid || !locs.data ? locationId : 'all'
  const setLocationId = (v) => {
    setLoc(String(v))
    try { localStorage.setItem('fittrack-location', String(v)) } catch { /* ignore */ }
  }
  useEffect(() => { setOpen(false) }, [loc.pathname])

  const gym = settings.data?.gym_name || 'FitTrack Gym'
  const ctx = {
    settings: settings.data || { gym_name: gym, country_code: '91' },
    templates: templates.data,
    reloadSettings: settings.reload,
    locations,
    reloadLocations: locs.reload,
    locationId: String(activeLoc),
    setLocationId,
    locParam: activeLoc === 'all' ? undefined : Number(activeLoc),
  }

  return (
    <AppCtx.Provider value={ctx}>
      <div className="shell">
        <aside className={'side' + (open ? ' open' : '')} aria-label="Sidebar">
          <Link to="/" aria-label="FitTrack home"><Logo /></Link>
          <nav className="side-nav" aria-label="Main">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
                <Icon /> {label}
              </NavLink>
            ))}
          </nav>
          <Link to="/app/members/new" className="btn btn-primary"><Plus /> Add member</Link>
          <div className="side-foot">
            <div className="gym-card">
              <span className="gm">{gym.slice(0, 1).toUpperCase()}</span>
              <div style={{ minWidth: 0 }}><b>{gym}</b><small>{locations.length} location{locations.length === 1 ? '' : 's'}</small></div>
            </div>
            <div className="side-links">
              <Link to="/" className="btn btn-ghost btn-sm"><ArrowLeft /> Home</Link>
              <button className="btn btn-ghost btn-sm" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
                {theme === 'dark' ? <Sun /> : <Moon />} {theme === 'dark' ? 'Light' : 'Dark'}
              </button>
            </div>
          </div>
        </aside>
        <div className={'scrim' + (open ? ' open' : '')} onClick={() => setOpen(false)} />

        <div className="main">
          <header className="topbar">
            <button className="btn btn-ghost btn-icon menu-btn" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
            <form className="search" role="search" onSubmit={(e) => { e.preventDefault(); nav(`/app/members?q=${encodeURIComponent(q)}`) }}>
              <Search />
              <label className="sr-only" htmlFor="gsearch">Search members</label>
              <input id="gsearch" className="input" placeholder="Search members by name, phone or ID…" value={q} onChange={(e) => setQ(e.target.value)} />
            </form>
            <span className="spacer" />
            <label className="loc-select">
              <MapPin size={17} />
              <span className="sr-only">Location</span>
              <select value={ctx.locationId} onChange={(e) => setLocationId(e.target.value)} aria-label="Location">
                <option value="all">All locations</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>
          </header>
          <Outlet context={ctx} />
        </div>
      </div>
    </AppCtx.Provider>
  )
}
