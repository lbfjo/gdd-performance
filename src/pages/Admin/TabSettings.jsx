import { useState, useEffect } from 'react'
import { getConfig, setWeeklyTarget } from '../../services/config'

export default function TabSettings() {
  const [target, setTarget]   = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  useEffect(() => {
    getConfig()
      .then(cfg => { setTarget(cfg.weeklyTarget !== null ? String(cfg.weeklyTarget) : ''); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      const val = target === '' ? null : Number(target)
      await setWeeklyTarget(val)
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
      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? 'A guardar…' : saved ? '✓ Guardado' : 'Guardar'}
      </button>
    </form>
  )
}
