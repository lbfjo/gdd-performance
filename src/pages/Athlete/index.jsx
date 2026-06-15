import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AthleteLogin from './AthleteLogin'
import TabHome from './TabHome'
import TabHistory from './TabHistory'
import TabRanking from './TabRanking'
import TabBookings from './TabBookings'
import TabNutrition from './TabNutrition'
import './Athlete.css'

export const ATHLETE_KEY = 'gdd_athlete'

const TABS = [
  {
    key: 'home', label: 'Início',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 21V12h6v9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'history', label: 'Histórico',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'ranking', label: 'Ranking',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'nutrition', label: 'Nutrição',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3v18M5 8h14" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="5" y="8" width="14" height="4" rx="1" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 12v4a5 5 0 0 0 10 0v-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'bookings', label: 'Reservas',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
]

export default function Athlete() {
  const navigate = useNavigate()
  const location = useLocation()
  const [athlete, setAthlete] = useState(() => {
    try { return JSON.parse(localStorage.getItem(ATHLETE_KEY)) } catch { return null }
  })
  const [activeTab, setActiveTab] = useState(() => location.state?.initialTab ?? 'home')

  useEffect(() => {
    if (location.state?.initialTab) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  function handleLogin(a) {
    localStorage.setItem(ATHLETE_KEY, JSON.stringify(a))
    setAthlete(a)
  }

  function handleLogout() {
    localStorage.removeItem(ATHLETE_KEY)
    setAthlete(null)
  }

  if (!athlete) return <AthleteLogin onLogin={handleLogin} />

  return (
    <div className="athlete-page">
      <div className="athlete-header">
        <div>
          <div className="athlete-header-brand">GDD</div>
          <div className="athlete-header-name">{athlete.name}</div>
        </div>
        <button className="athlete-header-logout" onClick={handleLogout}>Sair</button>
      </div>

      <div className="athlete-content">
        {activeTab === 'home'     && <TabHome     athlete={athlete} />}
        {activeTab === 'history'  && <TabHistory  athlete={athlete} />}
        {activeTab === 'ranking'    && <TabRanking   athlete={athlete} />}
        {activeTab === 'nutrition'  && <TabNutrition athlete={athlete} />}
        {activeTab === 'bookings'   && <TabBookings  athlete={athlete} />}
      </div>

      <nav className="athlete-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`athlete-tab${activeTab === t.key ? ' active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
