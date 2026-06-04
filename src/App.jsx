import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'

function ManifestSwap() {
  const { pathname } = useLocation()
  useEffect(() => {
    const isStaff = pathname === '/staff' || pathname === '/dashboard'
    const link = document.querySelector('link[rel="manifest"]')
    if (link) link.href = isStaff ? '/manifest-staff.json' : '/manifest.json'
    const titleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]')
    if (titleMeta) titleMeta.content = isStaff ? 'GDD Staff' : 'GDD'
  }, [pathname])
  return null
}

const CheckIn   = lazy(() => import('./pages/CheckIn'))
const Staff     = lazy(() => import('./pages/Staff'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Athlete   = lazy(() => import('./pages/Athlete'))
const Admin     = lazy(() => import('./pages/Admin'))

function PageLoader() {
  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--dark)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <p style={{
        fontFamily: 'Saira Condensed, sans-serif',
        fontSize: 18, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--muted)'
      }}>
        GDD
      </p>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ManifestSwap />
      <Routes>
        <Route path="/"          element={<CheckIn />} />
        <Route path="/staff"     element={<Staff />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/athlete"   element={<Athlete />} />
        <Route path="/admin"     element={<Admin />} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
