import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Landing from './pages/Landing'

const AppLayout = lazy(() => import('./pages/app/AppLayout'))
const Dashboard = lazy(() => import('./pages/app/Dashboard'))
const Members = lazy(() => import('./pages/app/Members'))
const MemberDetail = lazy(() => import('./pages/app/MemberDetail'))
const AddMember = lazy(() => import('./pages/app/AddMember'))
const Fees = lazy(() => import('./pages/app/Fees'))
const Reminders = lazy(() => import('./pages/app/Reminders'))
const Settings = lazy(() => import('./pages/app/Settings'))

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

const Loading = () => (
  <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)', color: 'var(--muted)' }}>Loading…</div>
)

export default function App() {
  return (
    <>
      <ScrollTop />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="members" element={<Members />} />
            <Route path="members/new" element={<AddMember />} />
            <Route path="members/:id" element={<MemberDetail />} />
            <Route path="fees" element={<Fees />} />
            <Route path="reminders" element={<Reminders />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}
