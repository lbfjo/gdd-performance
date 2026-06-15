import { useState, useEffect } from 'react'
import { getTodayWeight, getWeightHistory, logWeight } from '../../services/nutrition'
import { getConfig } from '../../services/config'
import {
  bookNutritionSlot,
  cancelNutritionBooking,
  getUpcomingNutritionSlots,
} from '../../services/nutritionAppointments'

function WeightPanel({ athlete }) {
  const [weight, setWeight] = useState('')
  const [todayLog, setTodayLog] = useState(null)
  const [history, setHistory] = useState([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const [today, hist] = await Promise.all([
      getTodayWeight(athlete.id).catch(() => null),
      getWeightHistory(athlete.id, 7).catch(() => []),
    ])
    setTodayLog(today)
    setHistory(hist)
    if (today) setWeight(String(today.weight))
    setLoading(false)
  }

  useEffect(() => { load().catch(() => setLoading(false)) }, [athlete.id])

  async function handleSubmit(e) {
    e.preventDefault()
    const val = parseFloat(weight)
    if (!val || val < 20 || val > 300) return
    setSaving(true)
    setError('')
    try {
      await logWeight(athlete.id, athlete.name, val)
      setTodayLog({ weight: val })
      setEditing(false)
      const hist = await getWeightHistory(athlete.id, 7).catch(() => [])
      if (hist.length > 0) setHistory(hist)
    } catch {
      setError('Não foi possível guardar o peso. Verifica a ligação e tenta novamente.')
    }
    setSaving(false)
  }

  const showInput = !todayLog || editing

  if (loading) return <p className="loading-state">A carregar…</p>

  return (
    <>
      <div className="nutri-section-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v18M3 12h18" />
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12h8" />
        </svg>
        Peso de hoje
      </div>

      {showInput ? (
        <form className="nutri-weight-form" onSubmit={handleSubmit}>
          <div className="nutri-weight-input-wrap">
            <input
              type="number"
              step="0.1"
              min="20"
              max="300"
              className="nutri-weight-input"
              placeholder="Ex: 82.5"
              value={weight}
              onChange={e => { setWeight(e.target.value); setError('') }}
              inputMode="decimal"
              autoFocus={editing}
            />
            <span className="nutri-weight-unit">kg</span>
          </div>
          <button type="submit" className="btn-primary" disabled={saving || !weight}>
            {saving ? 'A gravar…' : todayLog ? 'Atualizar' : 'Registar'}
          </button>
          {error && <p className="error-banner" style={{ marginTop: 10 }}>{error}</p>}
          {editing && (
            <button type="button" className="nutri-cancel-btn" onClick={() => setEditing(false)}>
              Cancelar
            </button>
          )}
          <p className="nutri-hint">Pesa-te de manhã, em jejum</p>
        </form>
      ) : (
        <div className="nutri-weight-logged">
          <div className="nutri-weight-logged-row">
            <span className="nutri-weight-value">{todayLog.weight} kg</span>
            <span className="nutri-weight-check">✓</span>
          </div>
          <button className="nutri-edit-btn" onClick={() => setEditing(true)}>
            Atualizar
          </button>
        </div>
      )}

      {history.length > 0 && (
        <>
          <div className="nutri-section-title" style={{ marginTop: 28 }}>
            Últimos 7 dias
          </div>
          <div className="nutri-history-list">
            {history.map(h => (
              <div key={h.id} className="nutri-history-row">
                <span className="nutri-history-date">
                  {new Date(h.date + 'T12:00:00').toLocaleDateString('pt-PT', {
                    weekday: 'short', day: 'numeric', month: 'short'
                  })}
                </span>
                <span className="nutri-history-weight">{h.weight} kg</span>
              </div>
            ))}
          </div>
        </>
      )}
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

function AppointmentsPanel({ athlete }) {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(null)
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

  async function handleBook(slot) {
    setWorking(slot.id)
    setError('')
    try {
      await bookNutritionSlot(slot.id, athlete)
      await load()
    } catch {
      setError('Esta vaga já não está disponível. Atualizámos a lista.')
      await load().catch(() => {})
    } finally {
      setWorking(null)
    }
  }

  async function handleCancel(slot) {
    setWorking(slot.id)
    setError('')
    try {
      await cancelNutritionBooking(slot.id, athlete.id)
      await load()
    } catch {
      setError('Não foi possível cancelar a marcação.')
    } finally {
      setWorking(null)
    }
  }

  const grouped = slots.reduce((groups, slot) => {
    if (!groups[slot.date]) groups[slot.date] = []
    groups[slot.date].push(slot)
    return groups
  }, {})

  if (loading) return <p className="loading-state">A carregar vagas…</p>

  return (
    <>
      <div className="nutri-appointments-intro">
        <strong>Consultas de nutrição</strong>
        <span>Escolhe um dos horários disponibilizados pela nutricionista.</span>
      </div>

      {error ? (
        <p className="error-banner">{error}</p>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="nutri-empty-state">
          Não existem vagas abertas neste momento.
        </div>
      ) : (
        Object.entries(grouped).map(([date, dateSlots]) => (
          <section key={date} className="nutri-appointment-day">
            <h3>{formatAppointmentDate(date)}</h3>
            <div className="nutri-appointment-slots">
              {dateSlots.map(slot => {
                const mine = slot.status === 'booked' && slot.athleteId === athlete.id
                const available = slot.status === 'available'
                return (
                  <div
                    key={slot.id}
                    className={`nutri-appointment-slot${mine ? ' mine' : ''}${!available && !mine ? ' unavailable' : ''}`}
                  >
                    <span className="nutri-appointment-time">{slot.time}</span>
                    {mine ? (
                      <button
                        className="nutri-appointment-cancel"
                        onClick={() => handleCancel(slot)}
                        disabled={working === slot.id}
                      >
                        {working === slot.id ? '…' : 'Cancelar'}
                      </button>
                    ) : available ? (
                      <button
                        className="nutri-appointment-book"
                        onClick={() => handleBook(slot)}
                        disabled={working === slot.id}
                      >
                        {working === slot.id ? '…' : 'Reservar'}
                      </button>
                    ) : (
                      <span className="nutri-appointment-status">Ocupado</span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ))
      )}
    </>
  )
}

export default function TabNutrition({ athlete }) {
  const [section, setSection] = useState('weight')
  const [appointmentsEnabled, setAppointmentsEnabled] = useState(false)

  useEffect(() => {
    getConfig()
      .then(config => setAppointmentsEnabled(config.nutritionAppointmentsEnabled))
      .catch(() => setAppointmentsEnabled(false))
  }, [])

  if (!appointmentsEnabled) {
    return <WeightPanel athlete={athlete} />
  }

  return (
    <>
      <div className="nutri-subtabs">
        <button
          className={section === 'weight' ? 'active' : ''}
          onClick={() => setSection('weight')}
        >
          Peso
        </button>
        <button
          className={section === 'appointments' ? 'active' : ''}
          onClick={() => setSection('appointments')}
        >
          Consultas
        </button>
      </div>

      {section === 'weight'
        ? <WeightPanel athlete={athlete} />
        : <AppointmentsPanel athlete={athlete} />}
    </>
  )
}
