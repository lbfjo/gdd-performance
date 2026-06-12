import { useState, useEffect } from 'react'
import { getTodayWeight, getWeightHistory, logWeight } from '../../services/nutrition'

export default function TabNutrition({ athlete }) {
  const [weight, setWeight] = useState('')
  const [todayLog, setTodayLog] = useState(null)
  const [history, setHistory] = useState([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

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
    try {
      await logWeight(athlete.id, athlete.name, val)
      setTodayLog({ weight: val })
      setEditing(false)
      const hist = await getWeightHistory(athlete.id, 7).catch(() => [])
      if (hist.length > 0) setHistory(hist)
    } catch { /* keep current state */ }
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
              onChange={e => setWeight(e.target.value)}
              inputMode="decimal"
              autoFocus={editing}
            />
            <span className="nutri-weight-unit">kg</span>
          </div>
          <button type="submit" className="btn-primary" disabled={saving || !weight}>
            {saving ? 'A gravar…' : todayLog ? 'Atualizar' : 'Registar'}
          </button>
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
