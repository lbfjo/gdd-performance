import { useState, useEffect } from 'react'
import { getAllAthletes, addAthlete, deactivateAthlete, reactivateAthlete, resetAthletePin } from '../../services/athletes'

export default function TabAthletes() {
  const [athletes, setAthletes]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [name, setName]             = useState('')
  const [position, setPosition]     = useState('')
  const [adding, setAdding]         = useState(false)
  const [newPin, setNewPin]         = useState(null)
  const [showInactive, setShowInactive] = useState(false)

  async function load() {
    const all = await getAllAthletes()
    setAthletes(all)
    setLoading(false)
  }
  useEffect(() => { load().catch(() => setLoading(false)) }, [])

  async function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    setAdding(true)
    try {
      const pin = await addAthlete({ name: name.trim(), position: position.trim() })
      setNewPin({ pin, athleteName: name.trim() })
      setName('')
      setPosition('')
      await load()
    } finally { setAdding(false) }
  }

  async function handleDeactivate(id, athleteName) {
    if (!confirm(`Desativar ${athleteName}?`)) return
    await deactivateAthlete(id)
    await load()
  }

  async function handleReactivate(id) {
    await reactivateAthlete(id)
    await load()
  }

  async function handleReset(id, athleteName) {
    if (!confirm(`Resetar PIN de ${athleteName}?`)) return
    const pin = await resetAthletePin(id)
    setNewPin({ pin, athleteName })
  }

  const visible = athletes.filter(a => showInactive ? true : a.active !== false)

  if (loading) return <p className="loading-state">A carregar…</p>

  return (
    <>
      {newPin && (
        <div className="pin-reveal">
          <p className="pin-reveal-label">PIN gerado — guarda antes de fechar</p>
          <p className="pin-reveal-pin">{newPin.pin}</p>
          <p className="pin-reveal-name">{newPin.athleteName}</p>
          <button
            style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--muted)', fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer' }}
            onClick={() => setNewPin(null)}
          >
            Fechar ×
          </button>
        </div>
      )}

      <form className="admin-add-form" onSubmit={handleAdd}>
        <p className="admin-form-title">Adicionar atleta</p>
        <input
          className="admin-input"
          placeholder="Nome completo *"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <input
          className="admin-input"
          placeholder="Posição (opcional)"
          value={position}
          onChange={e => setPosition(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={adding || !name.trim()}>
          {adding ? 'A adicionar…' : '+ Adicionar'}
        </button>
      </form>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={{ fontFamily: 'Saira Condensed, sans-serif', fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          {visible.length} atleta{visible.length !== 1 ? 's' : ''}
        </p>
        <button
          style={{ background: 'none', border: 'none', color: 'var(--muted)', fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer' }}
          onClick={() => setShowInactive(v => !v)}
        >
          {showInactive ? 'Ocultar inativos' : 'Mostrar inativos'}
        </button>
      </div>

      {visible.map(a => (
        <div key={a.id} className={`admin-athlete-row${a.active === false ? ' inactive' : ''}`}>
          <div style={{ flex: 1 }}>
            <p className="admin-athlete-name">{a.name}</p>
            {a.position && <p className="admin-athlete-pos">{a.position}</p>}
          </div>
          {a.active === false ? (
            <button className="admin-action-btn" onClick={() => handleReactivate(a.id)}>Reativar</button>
          ) : (
            <>
              <button className="admin-action-btn" onClick={() => handleReset(a.id, a.name)}>Reset PIN</button>
              <button className="admin-action-btn danger" onClick={() => handleDeactivate(a.id, a.name)}>Desativar</button>
            </>
          )}
        </div>
      ))}
    </>
  )
}
