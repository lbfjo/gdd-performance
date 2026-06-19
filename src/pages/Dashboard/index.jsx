import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { STAFF_SESSION_KEY } from '../Staff'
import TabGrid from './TabGrid'
import TabOverview from './TabOverview'
import TabAthlete from './TabAthlete'
import TabLeaderboard from './TabLeaderboard'
import TabAlerts from './TabAlerts'
import TabBookings from './TabBookings'
import TabNutrition from './TabNutrition'
import TabControl from './TabControl'
import { getCheckinsForWeek } from '../../services/checkins'
import { getBookingsForDate } from '../../services/bookings'
import { getLocalDate, getWeekBounds } from '../../lib/dates'
import './Dashboard.css'

const TABS = [
  { key: 'overview', label: 'Dashboard' },
  { key: 'grid', label: 'Semana' },
  { key: 'athlete', label: 'Atleta' },
  { key: 'leaderboard', label: 'Ranking' },
  { key: 'alerts', label: 'Alertas' },
  { key: 'bookings', label: 'Reservas' },
  { key: 'nutrition', label: 'Nutrição' },
  { key: 'control', label: 'Controlo' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!sessionStorage.getItem(STAFF_SESSION_KEY)) navigate('/staff')
  }, [navigate])

  function logout() {
    sessionStorage.removeItem(STAFF_SESSION_KEY)
    navigate('/staff')
  }

  async function handleExportWeek() {
    setExporting(true)
    try {
      const today = getLocalDate()
      const { start } = getWeekBounds(today)

      // Fetch all checkins for current week
      const checkins = await getCheckinsForWeek(today)

      // Collect unique dates that have checkins to fetch bookings for
      const uniqueDates = [...new Set(checkins.map(c => c.date))]
      const bookingsByDate = {}
      await Promise.all(
        uniqueDates.map(async d => {
          const bks = await getBookingsForDate(d)
          bookingsByDate[d] = bks
        })
      )

      // Build lookup: date+athleteId → slot name
      const slotLookup = {}
      uniqueDates.forEach(d => {
        ;(bookingsByDate[d] ?? []).forEach(b => {
          slotLookup[`${d}__${b.athleteId}`] = b.slot ?? ''
        })
      })

      const header = 'Atleta,Data,Slot\n'
      const csv =
        header +
        checkins
          .map(c => {
            const slot = slotLookup[`${c.date}__${c.athleteId}`] ?? ''
            const name = (c.athleteName ?? '').replace(/"/g, '""')
            return `"${name}",${c.date},"${slot}"`
          })
          .join('\n')

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gdd-semana-${start}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div className="dashboard-brand">
          <span className="dashboard-brand-name">GDD</span>
          <span className="dashboard-brand-sub">Performance</span>
        </div>
        <div className="dashboard-header-actions">
          <button
            className="dashboard-export"
            onClick={handleExportWeek}
            disabled={exporting}
          >
            {exporting ? 'A exportar…' : '↓ Exportar CSV'}
          </button>
          <button className="dashboard-logout" onClick={logout}>Sair</button>
        </div>
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
        {activeTab === 'overview' && <TabOverview />}
        {activeTab === 'grid' && <TabGrid />}
        {activeTab === 'athlete' && <TabAthlete />}
        {activeTab === 'leaderboard' && <TabLeaderboard />}
        {activeTab === 'alerts' && <TabAlerts />}
        {activeTab === 'bookings' && <TabBookings />}
        {activeTab === 'nutrition' && <TabNutrition />}
        {activeTab === 'control' && <TabControl />}
      </div>
    </div>
  )
}
