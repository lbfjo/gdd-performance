import { useState, useEffect, useCallback } from 'react'
import { getAthletes } from '../../services/athletes'
import { getWeightLogsForWeek } from '../../services/nutrition'
import {
  createNutritionSlots,
  getUpcomingNutritionSlots,
  removeNutritionSlot,
  reopenNutritionSlot,
} from '../../services/nutritionAppointments'
import { getLocalDate, getWeekBounds, getPreviousWeekBounds } from '../../lib/dates'
import './TabNutrition.css'

function getWeekDays(start) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start + 'T12:00:00')
    d.setDate(d.getDate() + i)
    return d.toLocaleDateString('sv-SE')
  })
}

function WeightGrid() {
  const [athletes, setAthletes] = useState([])
  const [weightsByAthlete, setWeightsByAthlete] = useState({})
  const [weekStart, setWeekStart] = useState(() => getWeekBounds(getLocalDate()).start)
  const [loading, setLoading] = useState(true)
  const today = getLocalDate()

  const loadGrid = useCallback(async (start) => {
    setLoading(true)
    const days = getWeekDays(start)
    const [aths, logs] = await Promise.all([
      getAthletes(),
      getWeightLogsForWeek(days[0], days[6]).catch(() => []),
    ])
    const map = {}
    logs.forEach(l => {
      if (!map[l.athleteId]) map[l.athleteId] = {}
      map[l.athleteId][l.date] = l.weight
    })
    setAthletes(aths)
    setWeightsByAthlete(map)
    setLoading(false)
  }, [])

  useEffect(() => { loadGrid(weekStart) }, [weekStart, loadGrid])

  const days = getWeekDays(weekStart)
  const currentWeekStart = getWeekBounds(today).start
  const isCurrentWeek = weekStart === currentWeekStart

  const athletesWithLogs = athletes.filter(a => weightsByAthlete[a.id])
  const totalLogs = Object.values(weightsByAthlete).reduce(
    (sum, dates) => sum + Object.keys(dates).length, 0
  )
  const loggedToday = athletes.filter(a => weightsByAthlete[a.id]?.[today]).length

  return (
    <>
      {!loading && isCurrentWeek && (
        <div className="grid-summary-row">
          <div className="grid-stat-card">
            <div className="grid-stat-number" style={{ color: 'var(--green)' }}>{loggedToday}</div>
            <div className="grid-stat-label">Pesagens hoje</div>
          </div>
          <div className="grid-stat-card">
            <div className="grid-stat-number" style={{ color: 'var(--white)' }}>{athletesWithLogs.length}</div>
            <div className="grid-stat-label">Atletas c/ registo</div>
          </div>
          <div className="grid-stat-card">
            <div className="grid-stat-number" style={{ color: 'var(--red)' }}>{totalLogs}</div>
            <div className="grid-stat-label">Total registos</div>
          </div>
        </div>
      )}

      <div className="grid-controls">
        <button className="grid-nav" onClick={() => setWeekStart(s => getPreviousWeekBounds(s).start)}>‹</button>
        <span className="grid-week-label">
          {new Date(days[0]+'T12:00:00').toLocaleDateString('pt-PT',{day:'numeric',month:'short'})} — {new Date(days[6]+'T12:00:00').toLocaleDateString('pt-PT',{day:'numeric',month:'short'})}
        </span>
        <button className="grid-nav" disabled={isCurrentWeek} onClick={() => {
          const next = new Date(weekStart + 'T12:00:00')
          next.setDate(next.getDate() + 7)
          setWeekStart(next.toLocaleDateString('sv-SE'))
        }}>›</button>
      </div>

      {loading ? (
        <p className="loading-state">A carregar…</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="grid-table">
            <thead>
              <tr>
                <th />
                {days.map(d => (
                  <th key={d} className={d === today ? 'today' : ''}>
                    {new Date(d+'T12:00:00').toLocaleDateString('pt-PT',{weekday:'short'}).slice(0,1).toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {athletes.map(a => {
                const hasAny = !!weightsByAthlete[a.id]
                return (
                  <tr key={a.id} className={hasAny ? '' : 'nutri-row-empty'}>
                    <td className="grid-name" title={a.name}>{a.name.split(' ')[0]} {a.name.split(' ').slice(-1)}</td>
                    {days.map(d => {
                      const w = weightsByAthlete[a.id]?.[d]
                      return (
                        <td key={d} style={{ textAlign: 'center' }}>
                          <div className={`grid-cell${w ? ' nutri-filled' : ''}`}>
                            {w && <span className="nutri-cell-weight">{w}</span>}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid-legend">
        <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--green)' }} /> Pesou</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--card2)', border: '1px solid var(--border)' }} /> Sem registo</div>
      </div>
    </>
  )
}

function formatAppointmentDate(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function AppointmentManager() {
  const [date, setDate] = useState(getLocalDate())
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('12:00')
  const [intervalMinutes, setIntervalMinutes] = useState('15')
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [working, setWorking] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load() {
    const upcoming = await getUpcomingNutritionSlots()
    setSlots(upcoming)
    setError('')
    setLoading(false)
  }

  useEffect(() => {
    load().catch(() => {
      setError('Não foi possível carregar as vagas.')
      setLoading(false)
    })
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const count = await createNutritionSlots({
        date,
        startTime,
        endTime,
        intervalMinutes: Number(intervalMinutes),
      })
      setMessage(count > 0
        ? `${count} vaga${count !== 1 ? 's' : ''} criada${count !== 1 ? 's' : ''}.`
        : 'Esses horários já estavam criados.')
      await load()
    } catch {
      setError('Verifica a data, as horas e o intervalo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(slot) {
    setWorking(slot.id)
    setError('')
    try {
      await removeNutritionSlot(slot.id)
      await load()
    } catch {
      setError('Só é possível remover vagas ainda livres.')
    } finally {
      setWorking(null)
    }
  }

  async function handleReopen(slot) {
    const confirmed = window.confirm(`Libertar a vaga das ${slot.time} de ${slot.athleteName}?`)
    if (!confirmed) return
    setWorking(slot.id)
    setError('')
    try {
      await reopenNutritionSlot(slot.id)
      await load()
    } catch {
      setError('Não foi possível libertar esta vaga.')
    } finally {
      setWorking(null)
    }
  }

  const grouped = slots.reduce((groups, slot) => {
    if (!groups[slot.date]) groups[slot.date] = []
    groups[slot.date].push(slot)
    return groups
  }, {})

  return (
    <>
      <form className="staff-nutri-slot-form" onSubmit={handleCreate}>
        <div className="staff-nutri-form-title">Abrir vagas</div>
        <div className="staff-nutri-form-grid">
          <label>
            Data
            <input type="date" min={getLocalDate()} value={date} onChange={e => setDate(e.target.value)} required />
          </label>
          <label>
            Início
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
          </label>
          <label>
            Fim
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
          </label>
          <label>
            Intervalo
            <select value={intervalMinutes} onChange={e => setIntervalMinutes(e.target.value)}>
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">60 min</option>
            </select>
          </label>
        </div>
        <button className="btn-primary" type="submit" disabled={saving}>
          {saving ? 'A criar…' : 'Criar vagas'}
        </button>
        {message && <p className="staff-nutri-message">{message}</p>}
        {error && <p className="error-banner">{error}</p>}
      </form>

      <div className="staff-nutri-list-title">Próximas vagas</div>
      {loading ? (
        <p className="loading-state">A carregar…</p>
      ) : error ? (
        null
      ) : Object.keys(grouped).length === 0 ? (
        <div className="staff-nutri-empty">Ainda não existem vagas futuras.</div>
      ) : (
        Object.entries(grouped).map(([slotDate, dateSlots]) => (
          <section key={slotDate} className="staff-nutri-day">
            <h3>{formatAppointmentDate(slotDate)}</h3>
            <div className="staff-nutri-slots">
              {dateSlots.map(slot => (
                <div key={slot.id} className={`staff-nutri-slot ${slot.status}`}>
                  <span className="staff-nutri-time">{slot.time}</span>
                  <span className="staff-nutri-athlete">
                    {slot.status === 'booked' ? slot.athleteName : 'Livre'}
                  </span>
                  {slot.status === 'available' ? (
                    <button onClick={() => handleRemove(slot)} disabled={working === slot.id}>
                      {working === slot.id ? '…' : 'Remover'}
                    </button>
                  ) : (
                    <button onClick={() => handleReopen(slot)} disabled={working === slot.id}>
                      {working === slot.id ? '…' : 'Libertar'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </>
  )
}

export default function TabNutrition() {
  const [section, setSection] = useState('weights')

  return (
    <>
      <div className="dashboard-subtabs">
        <button
          className={section === 'weights' ? 'active' : ''}
          onClick={() => setSection('weights')}
        >
          Pesagens
        </button>
        <button
          className={section === 'appointments' ? 'active' : ''}
          onClick={() => setSection('appointments')}
        >
          Consultas
        </button>
      </div>
      {section === 'weights' ? <WeightGrid /> : <AppointmentManager />}
    </>
  )
}
