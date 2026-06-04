import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PinPad from '../../components/PinPad'
import '../CheckIn/CheckIn.css'
import { getAthletes, verifyAthletePin, athleteHasPinSet, setFirstTimePin } from '../../services/athletes'
import { recordFailedAttempt, isLockedOut, getRemainingSeconds, clearAttempts } from '../../lib/rateLimit'

export default function AthleteLogin({ onLogin }) {
  const navigate = useNavigate()
  const [step, setStep]           = useState('name') // 'name'|'pin'|'setpin'|'setpin-confirm'
  const [athletes, setAthletes]   = useState([])
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [pinError, setPinError]   = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [locked, setLocked]       = useState(false)
  const [remaining, setRemaining] = useState(0)
  const [newPin, setNewPin]       = useState('')

  useEffect(() => {
    getAthletes().then(setAthletes).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!locked || !selected) return
    const t = setInterval(() => {
      const secs = getRemainingSeconds(selected.id)
      setRemaining(secs)
      if (secs <= 0) { setLocked(false); clearInterval(t) }
    }, 1000)
    return () => clearInterval(t)
  }, [locked, selected])

  const filtered = search.length > 0
    ? athletes.filter(a => a.name.toLowerCase().includes(search.toLowerCase()))
    : []

  async function handleSelect(a) {
    setSelected(a)
    setPinError(false)
    if (isLockedOut(a.id)) {
      setLocked(true)
      setRemaining(getRemainingSeconds(a.id))
      setStep('pin')
      return
    }
    const hasPinSet = await athleteHasPinSet(a.id)
    setStep(hasPinSet ? 'pin' : 'setpin')
  }

  async function handlePin(pin) {
    if (verifying || locked) return
    setVerifying(true)
    setPinError(false)
    try {
      const valid = await verifyAthletePin(selected.id, pin)
      if (!valid) {
        recordFailedAttempt(selected.id)
        if (isLockedOut(selected.id)) {
          setLocked(true)
          setRemaining(getRemainingSeconds(selected.id))
        } else {
          setPinError(true)
        }
        return
      }
      clearAttempts(selected.id)
      onLogin({ id: selected.id, name: selected.name })
    } catch { setPinError(true) }
    finally { setVerifying(false) }
  }

  function handleSetPin(pin) {
    setNewPin(pin)
    setPinError(false)
    setStep('setpin-confirm')
  }

  async function handleConfirmPin(pin) {
    if (pin !== newPin) {
      setPinError(true)
      setNewPin('')
      setStep('setpin')
      return
    }
    setVerifying(true)
    try {
      await setFirstTimePin(selected.id, pin)
      onLogin({ id: selected.id, name: selected.name })
    } catch { setPinError(true) }
    finally { setVerifying(false) }
  }

  function goBack() {
    setSelected(null)
    setPinError(false)
    setLocked(false)
    setNewPin('')
    setStep('name')
  }

  return (
    <div className="athlete-login-page">
      <div className="splash-bg" />
      <div className="splash-noise" />
      <div className="athlete-login-content">

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
                  {search.length === 0 && <p className="athlete-empty">Começa a escrever o teu nome…</p>}
                  {search.length > 0 && filtered.length === 0 && <p className="athlete-empty">Atleta não encontrado.</p>}
                  {filtered.map(a => (
                    <button key={a.id} className="athlete-item" onClick={() => handleSelect(a)}>{a.name}</button>
                  ))}
                </div>
                <button className="btn-secondary" style={{ marginTop: 8 }} onClick={() => navigate('/')}>
                  ← Voltar ao check-in
                </button>
              </>
            )}
          </div>
        )}

        {step === 'pin' && selected && (
          <div className="pin-screen" style={{ position: 'static', minHeight: 'auto', flex: 1 }}>
            <div className="pin-header">
              <p className="pin-greeting">Olá, <span>{selected.name.split(' ')[0]}!</span></p>
              <p className="pin-label">Insere o teu PIN</p>
            </div>
            <div className="pin-body">
              {locked ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🔒</div>
                  <p style={{ fontFamily: 'Saira Condensed, sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', marginBottom: 6 }}>Bloqueado</p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--muted)', marginBottom: 6 }}>Tenta novamente em</p>
                  <p style={{ fontFamily: 'Saira Condensed, sans-serif', fontSize: 28, fontWeight: 700, color: 'var(--white)' }}>{remaining}s</p>
                </div>
              ) : (
                <>
                  {pinError && <p className="error-banner" style={{ marginBottom: 20 }}>PIN incorreto — tenta novamente</p>}
                  <PinPad onComplete={handlePin} error={pinError} />
                </>
              )}
            </div>
            <button className="pin-back" onClick={goBack}>← Voltar</button>
          </div>
        )}

        {step === 'setpin' && selected && (
          <div className="pin-screen" style={{ position: 'static', minHeight: 'auto', flex: 1 }}>
            <div className="pin-header">
              <p className="pin-greeting">Olá, <span>{selected.name.split(' ')[0]}!</span></p>
              <p className="pin-label">Define o teu PIN pessoal de 4 dígitos</p>
            </div>
            <div className="pin-body">
              {pinError && <p className="error-banner" style={{ marginBottom: 20 }}>Os PINs não coincidem — tenta novamente</p>}
              <PinPad onComplete={handleSetPin} error={pinError} />
            </div>
            <button className="pin-back" onClick={goBack}>← Voltar</button>
          </div>
        )}

        {step === 'setpin-confirm' && selected && (
          <div className="pin-screen" style={{ position: 'static', minHeight: 'auto', flex: 1 }}>
            <div className="pin-header">
              <p className="pin-greeting" style={{ fontSize: 28 }}>Confirma o<br /><span>teu PIN</span></p>
              <p className="pin-label">Repete o PIN que escolheste</p>
            </div>
            <div className="pin-body">
              {pinError && <p className="error-banner" style={{ marginBottom: 20 }}>Os PINs não coincidem — tenta novamente</p>}
              <PinPad onComplete={handleConfirmPin} error={pinError} />
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
