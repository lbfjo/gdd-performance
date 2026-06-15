import { useState, useEffect } from 'react'
import {
  getCheckinsForAthlete,
  hasCheckedInToday,
  addCheckin,
  getSessionCountForAthleteThisWeek,
} from '../../services/checkins'
import { getTodayWeight, getWeightHistory, logWeight } from '../../services/nutrition'
import { getAthleteMealPlan } from '../../services/athletes'
import { getConfig } from '../../services/config'
import { getLocalDate } from '../../lib/dates'
import { enqueueCheckin, getPendingQueue, removeFromQueue } from '../../lib/offline'

function weekdayIndex(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const dow = d.getDay()
  return dow === 0 ? 6 : dow - 1
}

function isWeekend(dateStr) {
  return weekdayIndex(dateStr) >= 5
}

function calculateStreak(checkins) {
  if (!checkins || checkins.length === 0) return 0
  const checkedSet = new Set(checkins.map(c => c.date))
  const cursor = new Date(getLocalDate() + 'T12:00:00')
  while (isWeekend(cursor.toLocaleDateString('sv-SE'))) {
    cursor.setDate(cursor.getDate() - 1)
  }
  let streak = 0
  while (true) {
    const ds = cursor.toLocaleDateString('sv-SE')
    if (isWeekend(ds)) { cursor.setDate(cursor.getDate() - 1); continue }
    if (checkedSet.has(ds)) { streak++; cursor.setDate(cursor.getDate() - 1) }
    else break
  }
  return streak
}

function CircularRing({ count, target }) {
  const size = 120, stroke = 8
  const radius = (size - stroke) / 2
  const circ = 2 * Math.PI * radius
  const ratio = Math.min(1, count / target)
  const offset = circ * (1 - ratio)
  const done = count >= target
  const color = done ? 'var(--green)' : 'var(--red)'
  const cx = size / 2, cy = size / 2

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="progress-ring-svg">
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--card2)" strokeWidth={stroke} />
      <circle
        cx={cx} cy={cy} r={radius} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`} className="progress-ring-arc"
      />
      <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="middle"
        fontFamily="'Saira Condensed', sans-serif" fontWeight="700" fontSize="24" fill={color}>
        {count}/{target}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" dominantBaseline="middle"
        fontFamily="'Inter', sans-serif" fontSize="11" fill="var(--muted)">
        sessões
      </text>
    </svg>
  )
}

export default function TabHome({ athlete, onNavigate }) {
  const [total, setTotal] = useState(null)
  const [weekCount, setWeekCount] = useState(null)
  const [weeklyTarget, setWeeklyTarget] = useState(null)
  const [lastCheckin, setLastCheckin] = useState(null)
  const [checkedIn, setCheckedIn] = useState(false)
  const [checking, setChecking] = useState(false)
  const [offline, setOffline] = useState(!navigator.onLine)
  const [loading, setLoading] = useState(true)
  const [allCheckins, setAllCheckins] = useState([])

  const [todayWeight, setTodayWeight] = useState(null)
  const [weightInput, setWeightInput] = useState('')
  const [savingWeight, setSavingWeight] = useState(false)
  const [editingWeight, setEditingWeight] = useState(false)
  const [lastWeight, setLastWeight] = useState(null)
  const [mealPlan, setMealPlan] = useState(null)

  useEffect(() => {
    const goOnline = () => { setOffline(false); syncQueue() }
    const goOffline = () => setOffline(true)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline) }
  }, [])

  async function syncQueue() {
    for (const item of getPendingQueue()) {
      try { await addCheckin(item.athleteId, item.athleteName); removeFromQueue(item.id) }
      catch { /* retry next time */ }
    }
  }

  async function load() {
    const today = getLocalDate()
    const [all, wc, already, cfg, tw, wh, mp] = await Promise.all([
      getCheckinsForAthlete(athlete.id),
      getSessionCountForAthleteThisWeek(athlete.id, today),
      hasCheckedInToday(athlete.id),
      getConfig(),
      getTodayWeight(athlete.id).catch(() => null),
      getWeightHistory(athlete.id, 7).catch(() => []),
      getAthleteMealPlan(athlete.id).catch(() => null),
    ])
    setAllCheckins(all)
    setTotal(all.length)
    setWeekCount(wc)
    setCheckedIn(already)
    setWeeklyTarget(cfg.weeklyTarget)
    if (all.length > 0) setLastCheckin(all[0].date)
    setTodayWeight(tw)
    if (tw) setWeightInput(String(tw.weight))
    if (wh.length > 0) setLastWeight(wh[0])
    setMealPlan(mp)
    setLoading(false)
  }

  useEffect(() => { load().catch(() => setLoading(false)) }, [athlete.id])

  async function handleCheckin() {
    if (checking || checkedIn) return
    setChecking(true)
    try {
      if (navigator.onLine) { await addCheckin(athlete.id, athlete.name) }
      else { enqueueCheckin({ athleteId: athlete.id, athleteName: athlete.name, date: getLocalDate() }) }
      setCheckedIn(true)
      setWeekCount(c => (c || 0) + 1)
      setTotal(t => (t || 0) + 1)
      setLastCheckin(getLocalDate())
      setAllCheckins(prev => [{ id: '_opt', date: getLocalDate() }, ...prev])
    } catch {
      enqueueCheckin({ athleteId: athlete.id, athleteName: athlete.name, date: getLocalDate() })
      setCheckedIn(true); setWeekCount(c => (c || 0) + 1)
    } finally { setChecking(false) }
  }

  async function handleWeightSubmit(e) {
    e.preventDefault()
    const val = parseFloat(weightInput.replace(',', '.'))
    if (!val || val < 20 || val > 300) return
    setSavingWeight(true)
    try {
      await logWeight(athlete.id, athlete.name, val)
      setTodayWeight({ weight: val })
      setEditingWeight(false)
    } catch { /* ignore */ }
    setSavingWeight(false)
  }

  const firstName = athlete.name.split(' ')[0]
  const streak = calculateStreak(allCheckins)
  const wc = weekCount ?? 0
  const wt = weeklyTarget

  const today = new Date()
  const dateStr = today.toLocaleDateString('pt-PT', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  const goal = mealPlan?.goal

  let banner = null
  if (wt && wc !== null) {
    if (wc === 0) banner = { type: 'amber', text: 'Começa a semana forte 💪' }
    else if (wc >= wt) banner = { type: 'green', text: 'Objetivo atingido! ✓' }
  }

  if (loading) return <p className="loading-state">A carregar…</p>

  const showWeightInput = !todayWeight || editingWeight

  return (
    <>
      {offline && (
        <div style={{
          background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 4, padding: '10px 14px', marginBottom: 16,
          fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'var(--amber)'
        }}>
          Sem ligação — o check-in será sincronizado quando voltares a estar online.
        </div>
      )}

      <div className="home-greeting">
        <h1 className="home-greeting-name" style={{ fontSize: 28 }}>Olá, {firstName}</h1>
        <p className="home-date">{dateStr}</p>
      </div>

      {/* Check-in + Stats */}
      <div className="home-checkin-section">
        {wt ? (
          <div className="home-weekly-ring-wrap">
            <CircularRing count={wc} target={wt} />
            <p className="home-stat-label" style={{ marginTop: 6, textAlign: 'center' }}>Objetivo semanal</p>
          </div>
        ) : (
          <div className="home-stats">
            <div className="home-stat">
              <div className="home-stat-number" style={{ color: 'var(--red)' }}>{wc}</div>
              <div className="home-stat-label">Esta semana</div>
            </div>
            <div className="home-stat">
              <div className="home-stat-number" style={{ color: 'var(--white)' }}>{total ?? '—'}</div>
              <div className="home-stat-label">Total sessões</div>
            </div>
          </div>
        )}

        {wt && (
          <div className="home-stats" style={{ marginTop: 0 }}>
            <div className="home-stat">
              <div className="home-stat-number" style={{ color: 'var(--white)' }}>{total ?? '—'}</div>
              <div className="home-stat-label">Total sessões</div>
            </div>
            <div className="home-stat">
              {streak > 0 ? (
                <>
                  <div className="home-stat-number" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <span style={{ fontSize: 26 }}>🔥</span>
                    <span style={{ color: 'var(--amber)', fontFamily: "'Saira Condensed', sans-serif", fontWeight: 700, fontSize: 28 }}>{streak}</span>
                  </div>
                  <div className="home-stat-label">dias seguidos</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 22, marginBottom: 4, opacity: 0.3 }}>🔥</div>
                  <div className="home-stat-label" style={{ fontSize: 11 }}>Sem streak ativo</div>
                </>
              )}
            </div>
          </div>
        )}

        {banner && (
          <div className={`home-banner home-banner-${banner.type}`}>{banner.text}</div>
        )}

        <div className="home-checkin-btn">
          {checkedIn ? (
            <div className="home-already">
              <span style={{ fontSize: 20 }}>✓</span>
              <p className="home-already-text">Check-in feito hoje!</p>
            </div>
          ) : (
            <button className="btn-primary" onClick={handleCheckin} disabled={checking}>
              {checking ? 'A registar…' : 'Fazer Check-in'}
            </button>
          )}
        </div>
      </div>

      {/* Peso de Hoje */}
      <div className="home-peso-card">
        <div className="home-peso-header">
          <div className="home-peso-title-row">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v18M3 12h18" /><circle cx="12" cy="12" r="9" />
            </svg>
            <span className="home-peso-title">PESO DE HOJE</span>
          </div>
          {!showWeightInput && todayWeight && (
            <span className="home-peso-subtitle">Regista o teu peso em jejum</span>
          )}
        </div>

        {showWeightInput ? (
          <form onSubmit={handleWeightSubmit} className="home-peso-form">
            <div className="home-peso-input-row">
              <input
                type="text" inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                className="home-peso-input"
                placeholder="82.5"
                value={weightInput}
                onChange={e => setWeightInput(e.target.value.replace(/[^0-9.,]/g, ''))}
              />
              <span className="home-peso-unit">kg</span>
              <button type="submit" className="home-peso-btn" disabled={savingWeight || !weightInput}>
                {savingWeight ? '…' : 'REGISTAR'}
              </button>
            </div>
            {editingWeight && (
              <button type="button" className="nutri-cancel-btn" onClick={() => setEditingWeight(false)}>
                Cancelar
              </button>
            )}
          </form>
        ) : (
          <div className="home-peso-logged">
            <div className="home-peso-logged-row">
              <span className="home-peso-value">{todayWeight.weight} kg</span>
              <span style={{ color: 'var(--green)', fontSize: 18 }}>✓</span>
            </div>
            <button className="nutri-edit-btn" onClick={() => setEditingWeight(true)}>Atualizar</button>
          </div>
        )}

        <div className="home-peso-info">
          {lastWeight && (
            <div className="home-peso-info-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <div>
                <span className="home-peso-info-label">Último registo</span>
                <span className="home-peso-info-value">{lastWeight.weight} kg</span>
              </div>
            </div>
          )}
          {goal?.weight > 0 && (
            <div className="home-peso-info-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
              </svg>
              <div>
                <span className="home-peso-info-label">Meta{goal.deadline ? ` (até ${goal.deadline})` : ''}</span>
                <span className="home-peso-info-value">{goal.weight} kg</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Training card (replaces RESUMO) */}
      {mealPlan?.meals?.filter(m => m.type === 'training').map((t, i) => (
        <div key={i} className="home-training-card">
          <div className="home-training-header">
            <div className="home-training-title-row">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6.5 6.5h11M6.5 17.5h11M2 12h2M20 12h2M4 8v8M20 8v8M7 8v8M17 8v8" />
              </svg>
              <span className="home-training-title">{t.title}</span>
            </div>
            <span className="home-training-time">{t.time}</span>
          </div>
          {t.description && (
            <div className="home-training-desc">{t.description}</div>
          )}
        </div>
      ))}

      {/* Refeições de Hoje */}
      {mealPlan?.meals?.filter(m => m.type !== 'training').length > 0 && (
        <div className="home-meals-section">
          <div className="home-meals-header">
            <div className="home-meals-title-row">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3m0 0v7" />
              </svg>
              <span>REFEIÇÕES DE HOJE</span>
            </div>
            {onNavigate && (
              <button className="home-meals-link" onClick={() => onNavigate('nutrition')}>
                Ver todas &gt;
              </button>
            )}
          </div>

          <div className="meal-cards">
            {mealPlan.meals.filter(m => m.type !== 'training').map((m, i) => (
              <div key={i} className="meal-card">
                <span className="meal-card-time">{m.time}</span>
                <div className="meal-card-body">
                  <span className="meal-card-title">{m.title}</span>
                  {m.description && <span className="meal-card-desc">{m.description}</span>}
                </div>
              </div>
            ))}
          </div>

          {onNavigate && (
            <button className="home-plan-link" onClick={() => onNavigate('nutrition')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Ver plano alimentar completo &gt;
            </button>
          )}
        </div>
      )}

      {mealPlan?.notes && (
        <div className="home-notes-card">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>{mealPlan.notes}</span>
        </div>
      )}

    </>
  )
}
