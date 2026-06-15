import { useState, useEffect } from 'react'
import { getWeightHistory } from '../../services/nutrition'
import { getAthleteMealPlan } from '../../services/athletes'
import { getConfig } from '../../services/config'
import {
  bookNutritionSlot,
  cancelNutritionBooking,
  getUpcomingNutritionSlots,
} from '../../services/nutritionAppointments'

function MealPlanDisplay({ plan }) {
  if (!plan) return null

  return (
    <>
      {plan.goal?.description && (
        <div className="plan-goal-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
          </svg>
          <span>{plan.goal.description}{plan.goal.deadline ? ` — até ${plan.goal.deadline}` : ''}</span>
          {plan.goal.weight > 0 && <span className="plan-goal-weight">{plan.goal.weight} kg</span>}
        </div>
      )}

      <div className="meal-cards">
        {plan.meals.filter(m => m.type !== 'training').map((m, i) => (
          <div key={i} className="meal-card">
            <span className="meal-card-time">{m.time}</span>
            <div className="meal-card-body">
              <span className="meal-card-title">{m.title}</span>
              {m.description && <span className="meal-card-desc">{m.description}</span>}
            </div>
          </div>
        ))}
      </div>

      {plan.meals.filter(m => m.type === 'training').map((t, i) => (
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
            <div className="home-training-desc">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 7h8M8 12h8M8 17h4" />
              </svg>
              <span>{t.description}</span>
            </div>
          )}
        </div>
      ))}

      {plan.notes && (
        <div className="plan-notes">
          <p className="plan-notes-title">NOTAS</p>
          <p className="plan-notes-text">{plan.notes}</p>
        </div>
      )}
    </>
  )
}

function WeightHistoryPanel({ athlete }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getWeightHistory(athlete.id, 7)
      .then(h => { setHistory(h); setLoading(false) })
      .catch(() => setLoading(false))
  }, [athlete.id])

  if (loading || history.length === 0) return null

  return (
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
  )
}

function formatAppointmentDate(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-PT', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

function AppointmentsPanel({ athlete }) {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(null)
  const [error, setError] = useState('')

  async function load() {
    const upcoming = await getUpcomingNutritionSlots()
    setSlots(upcoming); setError(''); setLoading(false)
  }

  useEffect(() => {
    load().catch(() => { setError('Não foi possível carregar as vagas.'); setLoading(false) })
  }, [])

  async function handleBook(slot) {
    setWorking(slot.id); setError('')
    try { await bookNutritionSlot(slot.id, athlete); await load() }
    catch { setError('Esta vaga já não está disponível.'); await load().catch(() => {}) }
    finally { setWorking(null) }
  }

  async function handleCancel(slot) {
    setWorking(slot.id); setError('')
    try { await cancelNutritionBooking(slot.id, athlete.id); await load() }
    catch { setError('Não foi possível cancelar a marcação.') }
    finally { setWorking(null) }
  }

  const grouped = slots.reduce((g, slot) => {
    if (!g[slot.date]) g[slot.date] = []
    g[slot.date].push(slot)
    return g
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
        <div className="nutri-empty-state">Não existem vagas abertas neste momento.</div>
      ) : (
        Object.entries(grouped).map(([date, dateSlots]) => (
          <section key={date} className="nutri-appointment-day">
            <h3>{formatAppointmentDate(date)}</h3>
            <div className="nutri-appointment-slots">
              {dateSlots.map(slot => {
                const mine = slot.status === 'booked' && slot.athleteId === athlete.id
                const available = slot.status === 'available'
                return (
                  <div key={slot.id} className={`nutri-appointment-slot${mine ? ' mine' : ''}${!available && !mine ? ' unavailable' : ''}`}>
                    <span className="nutri-appointment-time">{slot.time}</span>
                    {mine ? (
                      <button className="nutri-appointment-cancel" onClick={() => handleCancel(slot)} disabled={working === slot.id}>
                        {working === slot.id ? '…' : 'Cancelar'}
                      </button>
                    ) : available ? (
                      <button className="nutri-appointment-book" onClick={() => handleBook(slot)} disabled={working === slot.id}>
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
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState('plan')
  const [appointmentsEnabled, setAppointmentsEnabled] = useState(false)

  useEffect(() => {
    Promise.all([
      getAthleteMealPlan(athlete.id).catch(() => null),
      getConfig().catch(() => ({})),
    ]).then(([mp, cfg]) => {
      setPlan(mp)
      setAppointmentsEnabled(cfg.nutritionAppointmentsEnabled)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [athlete.id])

  if (loading) return <p className="loading-state">A carregar…</p>

  const hasPlan = plan?.meals?.length > 0

  if (!appointmentsEnabled) {
    return (
      <>
        <div className="nutri-section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          Plano Alimentar
        </div>
        {hasPlan ? <MealPlanDisplay plan={plan} /> : (
          <div className="nutri-empty-state">Ainda não tens um plano alimentar atribuído.</div>
        )}
        <WeightHistoryPanel athlete={athlete} />
      </>
    )
  }

  return (
    <>
      <div className="nutri-subtabs">
        <button className={section === 'plan' ? 'active' : ''} onClick={() => setSection('plan')}>Plano</button>
        <button className={section === 'weight' ? 'active' : ''} onClick={() => setSection('weight')}>Peso</button>
        <button className={section === 'appointments' ? 'active' : ''} onClick={() => setSection('appointments')}>Consultas</button>
      </div>

      {section === 'plan' && (
        <>
          {hasPlan ? <MealPlanDisplay plan={plan} /> : (
            <div className="nutri-empty-state">Ainda não tens um plano alimentar atribuído.</div>
          )}
        </>
      )}
      {section === 'weight' && <WeightHistoryPanel athlete={athlete} />}
      {section === 'appointments' && <AppointmentsPanel athlete={athlete} />}
    </>
  )
}
