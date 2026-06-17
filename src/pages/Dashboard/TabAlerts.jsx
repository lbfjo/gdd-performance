import { useState, useEffect } from 'react'
import { getAthletes } from '../../services/athletes'
import { getCheckinsForBothWeeks } from '../../services/checkins'
import { getConfig } from '../../services/config'
import { getLocalDate, getWeekBounds } from '../../lib/dates'
import './TabAlerts.css'

const ALERT_EXEMPT_STATUSES = new Set(['injured', 'excused', 'away'])

export default function TabAlerts() {
  const [alerts, setAlerts] = useState([])
  const [atRisk, setAtRisk] = useState([])
  const [lowActivity, setLowActivity] = useState([])
  const [weekComparison, setWeekComparison] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const today = getLocalDate()
      const todayDate = new Date(today + 'T12:00:00')
      const dayOfWeek = todayDate.getDay() // 0=Sun,1=Mon,...,5=Fri,6=Sat

      const [athletes, { all, currStart, currEnd, prevStart, prevEnd }, cfg] = await Promise.all([
        getAthletes(),
        getCheckinsForBothWeeks(today),
        getConfig(),
      ])

      const weeklyTarget = cfg.weeklyTarget ?? 3
      const alertAthletes = athletes.filter(a => !ALERT_EXEMPT_STATUSES.has(a.staffStatus?.type))

      // Separate current-week and prev-week checkins
      const currCheckins = all.filter(c => c.date >= currStart && c.date <= currEnd)
      const prevCheckins = all.filter(c => c.date >= prevStart && c.date <= prevEnd)

      // Count per athlete for current week
      const currCountByAthlete = {}
      currCheckins.forEach(c => {
        currCountByAthlete[c.athleteId] = (currCountByAthlete[c.athleteId] ?? 0) + 1
      })

      // Sets for prev week presence
      const prevSet = new Set(prevCheckins.map(c => c.athleteId))

      // Week-over-week comparison: compare total checkins this week vs same number
      // of elapsed days last week (to make it a fair comparison)
      const { start: currWeekStart } = getWeekBounds(today)
      const daysElapsed = Math.max(1,
        Math.round((todayDate - new Date(currWeekStart + 'T12:00:00')) / 86400000) + 1
      )
      // Same days elapsed last week: prevStart + daysElapsed - 1
      const prevWindowEnd = new Date(prevStart + 'T12:00:00')
      prevWindowEnd.setDate(prevWindowEnd.getDate() + daysElapsed - 1)
      const prevWindowEndStr = prevWindowEnd.toLocaleDateString('sv-SE')

      const currTotal = currCheckins.length
      const prevTotal = all.filter(c => c.date >= prevStart && c.date <= prevWindowEndStr).length

      let comparisonDelta = null
      if (prevTotal > 0) {
        comparisonDelta = Math.round(((currTotal - prevTotal) / prevTotal) * 100)
      } else if (currTotal > 0) {
        comparisonDelta = 100
      }
      setWeekComparison(comparisonDelta)

      // Existing alert logic: athletes with 0 check-ins this week
      const existingAlerts = alertAthletes
        .filter(a => !currCountByAthlete[a.id])
        .map(a => ({
          ...a,
          severity: !prevSet.has(a.id) ? 'critical' : 'warning',
          detail: !prevSet.has(a.id)
            ? '0 sessões esta semana · 0 na semana passada'
            : '0 sessões esta semana · presente na semana passada',
        }))
        .sort((a, other) => {
          if (a.severity === other.severity) return a.name.localeCompare(other.name)
          return a.severity === 'critical' ? -1 : 1
        })
      setAlerts(existingAlerts)

      // At-risk section: 0 sessions this week AND Wednesday or later (dayOfWeek >= 3)
      // dayOfWeek: 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
      const isWedOrLater = dayOfWeek >= 3 || dayOfWeek === 0 // treat Sunday like "late" too
      if (isWedOrLater) {
        const urgentAthletes = alertAthletes
          .filter(a => !currCountByAthlete[a.id])
          .map(a => ({
            ...a,
            urgency: (dayOfWeek === 5 || dayOfWeek === 0) ? 'urgente' : 'atencao',
          }))
        setAtRisk(urgentAthletes)
      }

      // Low activity: 1 session when target >= 3
      if (weeklyTarget >= 3) {
        const lowActive = alertAthletes.filter(a => (currCountByAthlete[a.id] ?? 0) === 1)
        setLowActivity(lowActive)
      }

      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [])

  if (loading) return <p className="loading-state">A carregar…</p>

  return (
    <>
      {/* Week-over-week comparison banner */}
      {weekComparison !== null && (
        <div className={`week-comparison ${weekComparison >= 0 ? 'positive' : 'negative'}`}>
          <span className="week-comparison-icon">{weekComparison >= 0 ? '↑' : '↓'}</span>
          <span className="week-comparison-text">
            {weekComparison >= 0 ? '+' : ''}{weekComparison}% vs semana passada
          </span>
        </div>
      )}

      {/* At-risk section (Wed or later) */}
      {atRisk.length > 0 && (
        <div className="alerts-section">
          <p className="alerts-section-title">Em risco</p>
          <div className="alert-list">
            {atRisk.map(a => (
              <div key={a.id} className="alert-card alert-card--risk">
                <div className="alert-info">
                  <p className="alert-name alert-name--risk">{a.name}</p>
                  <p className="alert-detail">0 sessões esta semana</p>
                </div>
                <span className={`pill ${a.urgency === 'urgente' ? 'pill-red' : 'pill-amber'}`}>
                  {a.urgency === 'urgente' ? 'URGENTE' : 'ATENÇÃO'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Low activity section */}
      {lowActivity.length > 0 && (
        <div className="alerts-section">
          <p className="alerts-section-title">Pouco ativo</p>
          <div className="alert-list">
            {lowActivity.map(a => (
              <div key={a.id} className="alert-card alert-card--low">
                <div className="alert-info">
                  <p className="alert-name alert-name--low">{a.name}</p>
                  <p className="alert-detail">1 sessão esta semana</p>
                </div>
                <span className="pill pill-amber">BAIXO</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing alert summary and list */}
      {alerts.length > 0 && (
        <p className="alerts-summary">{alerts.length} atleta{alerts.length !== 1 ? 's' : ''} em falta esta semana</p>
      )}
      {alerts.length === 0 && atRisk.length === 0 && lowActivity.length === 0 ? (
        <p className="alerts-empty">Todos os atletas fizeram check-in esta semana 🎉</p>
      ) : (
        alerts.length > 0 && (
          <div className="alert-list">
            {alerts.map(a => (
              <div key={a.id} className={`alert-card ${a.severity}`}>
                <div className={`alert-indicator ${a.severity}`} />
                <div className="alert-info">
                  <p className={`alert-name ${a.severity}`}>{a.name}</p>
                  <p className="alert-detail">{a.detail}</p>
                </div>
                <span className={`pill ${a.severity === 'critical' ? 'pill-red' : 'pill-amber'}`}>
                  {a.severity === 'critical' ? 'Falta' : 'Pendente'}
                </span>
              </div>
            ))}
          </div>
        )
      )}
    </>
  )
}
