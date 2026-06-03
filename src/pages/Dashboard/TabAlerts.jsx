import { useState, useEffect } from 'react'
import { getAthletes } from '../../services/athletes'
import { getCheckinsForBothWeeks } from '../../services/checkins'
import { getLocalDate } from '../../lib/dates'
import './TabAlerts.css'

export default function TabAlerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [athletes, { all, currStart, currEnd, prevStart, prevEnd }] = await Promise.all([
        getAthletes(),
        getCheckinsForBothWeeks(getLocalDate()),
      ])
      const currSet = new Set(all.filter(c => c.date >= currStart && c.date <= currEnd).map(c => c.athleteId))
      const prevSet = new Set(all.filter(c => c.date >= prevStart && c.date <= prevEnd).map(c => c.athleteId))

      const result = athletes
        .filter(a => !currSet.has(a.id))
        .map(a => ({
          ...a,
          severity: !prevSet.has(a.id) ? 'critical' : 'warning',
          detail: !prevSet.has(a.id)
            ? '0 sessions this week · 0 last week'
            : '0 sessions this week · attended last week',
        }))
        .sort((a, b) => (a.severity === 'critical' ? -1 : 1))

      setAlerts(result)
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [])

  if (loading) return <p className="loading-state">Loading...</p>

  return (
    <>
      {alerts.length > 0 && (
        <p className="alerts-summary">{alerts.length} athlete{alerts.length !== 1 ? 's' : ''} missed this week</p>
      )}
      {alerts.length === 0 ? (
        <p className="alerts-empty">All athletes checked in this week 🎉</p>
      ) : (
        <div className="alert-list">
          {alerts.map(a => (
            <div key={a.id} className={`alert-card ${a.severity}`}>
              <p className={`alert-name ${a.severity}`}>{a.name}</p>
              <p className="alert-detail">{a.detail}</p>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
