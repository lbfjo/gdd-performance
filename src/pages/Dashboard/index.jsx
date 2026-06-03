import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { STAFF_SESSION_KEY } from '../Staff'
import TabGrid from './TabGrid'
import TabAthlete from './TabAthlete'
import TabLeaderboard from './TabLeaderboard'
import TabAlerts from './TabAlerts'
import TabBookings from './TabBookings'
import './Dashboard.css'

const TABS = [
  { key: 'grid', label: 'Semana' },
  { key: 'athlete', label: 'Atleta' },
  { key: 'leaderboard', label: 'Ranking' },
  { key: 'alerts', label: 'Alertas' },
  { key: 'bookings', label: 'Reservas' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('grid')

  useEffect(() => {
    if (!sessionStorage.getItem(STAFF_SESSION_KEY)) navigate('/staff')
  }, [navigate])

  function logout() {
    sessionStorage.removeItem(STAFF_SESSION_KEY)
    navigate('/staff')
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div className="dashboard-brand">
          <span className="dashboard-brand-name">GDD</span>
          <span className="dashboard-brand-sub">Performance</span>
        </div>
        <button className="dashboard-logout" onClick={logout}>Sair</button>
      </div>
      <div className="dashboard-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`tab-btn${activeTab === t.key ? ' active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="dashboard-content">
        {activeTab === 'grid' && <TabGrid />}
        {activeTab === 'athlete' && <TabAthlete />}
        {activeTab === 'leaderboard' && <TabLeaderboard />}
        {activeTab === 'alerts' && <TabAlerts />}
        {activeTab === 'bookings' && <TabBookings />}
      </div>
    </div>
  )
}
