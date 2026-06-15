import { useState, useEffect } from 'react'
import {
  getConfig,
  setNutritionAppointmentsEnabled,
  setWeeklyTarget,
} from '../../services/config'

export default function TabSettings() {
  const [target, setTarget]   = useState('')
  const [appointmentsEnabled, setAppointmentsEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  useEffect(() => {
    getConfig()
      .then(cfg => {
        setTarget(cfg.weeklyTarget !== null ? String(cfg.weeklyTarget) : '')
        setAppointmentsEnabled(cfg.nutritionAppointmentsEnabled)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      const val = target === '' ? null : Number(target)
      await Promise.all([
        setWeeklyTarget(val),
        setNutritionAppointmentsEnabled(appointmentsEnabled),
      ])
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  if (loading) return <p className="loading-state">A carregar…</p>

  return (
    <form onSubmit={handleSave}>
      <div className="admin-setting-row">
        <div style={{ flex: 1 }}>
          <p className="admin-setting-label">Objetivo semanal de sessões</p>
          <p className="admin-setting-sub">Mostrado a todos os atletas. Deixa em branco para desativar.</p>
        </div>
        <input
          className="admin-number-input"
          type="number"
          min="1"
          max="14"
          value={target}
          onChange={e => setTarget(e.target.value)}
          placeholder="—"
        />
      </div>
      <div className="admin-setting-row">
        <div style={{ flex: 1 }}>
          <p className="admin-setting-label">Consultas de nutrição para atletas</p>
          <p className="admin-setting-sub">
            Mostra a área de marcação de consultas na tab Nutrição dos atletas.
          </p>
        </div>
        <label
          className="admin-toggle"
          aria-label={appointmentsEnabled ? 'Desativar consultas' : 'Ativar consultas'}
        >
          <input
            type="checkbox"
            checked={appointmentsEnabled}
            onChange={e => setAppointmentsEnabled(e.target.checked)}
          />
          <span aria-hidden="true" />
        </label>
      </div>
      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? 'A guardar…' : saved ? '✓ Guardado' : 'Guardar'}
      </button>
    </form>
  )
}
