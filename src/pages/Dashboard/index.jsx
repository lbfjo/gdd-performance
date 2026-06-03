import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { STAFF_SESSION_KEY } from '../Staff'
import TabGrid from './TabGrid'
import TabAthlete from './TabAthlete'
import TabLeaderboard from './TabLeaderboard'
import TabAlerts from './TabAlerts'
import './Dashboard.css'

const TABS = [
  { key: 'grid', label: 'Grid' },
  { key: 'athlete', label: 'Per Athlete' },
  { key: 'leaderboard', label: 'Leaderboard' },
  { key: 'alerts', label: 'Alerts' },
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
        <h1>GDD Dashboard</h1>
        <button className="dashboard-logout" onClick={logout}>Log out</button>
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
      </div>
    </div>
  )
}
