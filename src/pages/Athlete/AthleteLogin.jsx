import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PinPad from '../../components/PinPad'
import { getAthletes, verifyAthletePin } from '../../services/athletes'

export default function AthleteLogin({ onLogin }) {
  const navigate = useNavigate()
  const [step, setStep] = useState('name') // 'name' | 'pin'
  const [athletes, setAthletes] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pinError, setPinError] = useState(false)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    getAthletes().then(setAthletes).finally(() => setLoading(false))
  }, [])

  const filtered = search.length > 0
    ? athletes.filter(a => a.name.toLowerCase().includes(search.toLowerCase()))
    : []

  function handleSelect(a) { setSelected(a); setStep('pin') }

  async function handlePin(pin) {
    if (verifying) return
    setVerifying(true); setPinError(false)
    try {
      const valid = await verifyAthletePin(selected.id, pin)
      if (valid) onLogin({ id: selected.id, name: selected.name })
      else setPinError(true)
    } catch { setPinError(true) }
    finally { setVerifying(false) }
  }

  return (
    <div className="athlete-login-page">
      <div className="splash-bg" />
      <div className="splash-noise" />
      <div className="athlete-login-content">

        {/* Logo */}
        <div className="gdd-logo-block">
          <div className="gdd-logo-wordmark">GDD</div>
          <div className="gdd-logo-sub">Performance</div>
          <div className="gdd-tagline">A tua área pessoal</div>
          <div className="gdd-divider" />
        </div>

        {step === 'name' && (
          <div className="name-section">
            {loading && <p className="loading-state">A carregar…</p>}
            {!loading && (
              <>
                <input
                  className="search-input"
                  placeholder="Pesquisa o teu nome…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoComplete="off"
                  autoFocus
                />
                <div className="athlete-list">
                  {search.length === 0 && (
                    <p className="athlete-empty">Começa a escrever o teu nome…</p>
                  )}
                  {search.length > 0 && filtered.length === 0 && (
                    <p className="athlete-empty">Atleta não encontrado.</p>
                  )}
                  {filtered.map(a => (
                    <button key={a.id} className="athlete-item" onClick={() => handleSelect(a)}>
                      {a.name}
                    </button>
                  ))}
                </div>
                <button
                  className="btn-secondary"
                  style={{ marginTop: 16 }}
                  onClick={() => navigate('/')}
                >
                  ← Voltar ao check-in
                </button>
              </>
            )}
          </div>
        )}

        {step === 'pin' && selected && (
          <div className="pin-screen" style={{ position: 'static', minHeight: 'auto', flex: 1 }}>
            <div className="pin-header">
              <p className="pin-greeting">
                Olá, <span>{selected.name.split(' ')[0]}!</span>
              </p>
              <p className="pin-label">Insere o teu PIN</p>
            </div>
            <div className="pin-body">
              {pinError && (
                <p className="error-banner" style={{ marginBottom: 20 }}>
                  PIN incorreto — tenta novamente
                </p>
              )}
              <PinPad onComplete={handlePin} error={pinError} />
            </div>
            <button
              className="pin-back"
              onClick={() => { setSelected(null); setPinError(false); setStep('name') }}
            >
              ← Voltar
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
