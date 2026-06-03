import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAthletes } from '../../services/athletes'

export default function StepName({ onSelect }) {
  const navigate = useNavigate()
  const [athletes, setAthletes] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getAthletes()
      .then(setAthletes)
      .catch(() => setError('Não foi possível carregar a lista. Verifica a ligação.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = athletes.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="splash-content">
      {/* Logo */}
      <div className="gdd-logo-block">
        <div className="gdd-logo-wordmark">GDD</div>
        <div className="gdd-logo-sub">Performance</div>
        <div className="gdd-tagline">Train. Register. Compete.</div>
        <div className="gdd-divider" />
      </div>

      {/* Name search */}
      <div className="name-section">
        {loading && <p className="loading-state">A carregar atletas…</p>}
        {error && <p className="error-banner">{error}</p>}

        {!loading && !error && (
          <>
            <input
              className="search-input"
              placeholder="Pesquisa o teu nome…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoComplete="off"
            />
            <div className="athlete-list">
              {filtered.length === 0 && search.length > 0 && (
                <p className="athlete-empty">Atleta não encontrado. Contacta o teu treinador.</p>
              )}
              {filtered.length === 0 && search.length === 0 && (
                <p className="athlete-empty">Começa a escrever o teu nome…</p>
              )}
              {filtered.map(a => (
                <button key={a.id} className="athlete-item" onClick={() => onSelect(a)}>
                  {a.name}
                </button>
              ))}
            </div>
          <button
              className="btn-secondary"
              style={{ marginTop: 8 }}
              onClick={() => navigate('/athlete')}
            >
              Área do Atleta →
            </button>
          </>
        )}
      </div>
    </div>
  )
}
