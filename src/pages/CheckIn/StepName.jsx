import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAthletes } from '../../services/athletes'
import Logo from '../../components/Logo'

export default function StepName({ onSelect }) {
  const navigate = useNavigate()
  const [athletes, setAthletes] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const searchRef = useRef(null)
  const deferredPrompt = useRef(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)

  useEffect(() => {
    getAthletes()
      .then(setAthletes)
      .catch(() => setError('Não foi possível carregar a lista. Verifica a ligação.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!loading && !error && searchRef.current) searchRef.current.focus()
  }, [loading, error])

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return
    const handler = e => { e.preventDefault(); deferredPrompt.current = e; setShowInstallBanner(true) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function handleInstall() {
    if (!deferredPrompt.current) return
    deferredPrompt.current.prompt()
    deferredPrompt.current = null
    setShowInstallBanner(false)
  }

  const filtered = athletes.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
    {showInstallBanner && (
      <div style={{
        position: 'fixed',
        bottom: 24,
        left: 16,
        right: 16,
        background: 'var(--card)',
        borderRadius: 12,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        zIndex: 1000,
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)'
      }}>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>
          Instala a app para acesso rápido
        </span>
        <button
          onClick={handleInstall}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--red)',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            padding: '4px 0',
            whiteSpace: 'nowrap'
          }}
        >
          Instalar
        </button>
      </div>
    )}
    <div className="splash-content">
      {/* Logo block */}
      <div className="gdd-logo-block">
        <div className="gdd-logo-center">
          <Logo size="lg" />
        </div>
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
              ref={searchRef}
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
    </>
  )
}
