import { useState, useEffect } from 'react'
import PinPad from '../../components/PinPad'
import { verifyAthletePin } from '../../services/athletes'
import { hasCheckedInToday } from '../../services/checkins'
import { recordFailedAttempt, isLockedOut, getRemainingSeconds, clearAttempts } from '../../lib/rateLimit'

export default function StepPin({ athlete, onSuccess, onAlreadyCheckedIn, onBack }) {
  const [pinError, setPinError] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [locked, setLocked]     = useState(() => isLockedOut(athlete.id))
  const [remaining, setRemaining] = useState(() => getRemainingSeconds(athlete.id))

  const firstName = athlete.name.split(' ')[0]

  useEffect(() => {
    if (!locked) return
    const t = setInterval(() => {
      const secs = getRemainingSeconds(athlete.id)
      setRemaining(secs)
      if (secs <= 0) { setLocked(false); clearInterval(t) }
    }, 1000)
    return () => clearInterval(t)
  }, [locked, athlete.id])

  async function handlePin(pin) {
    if (loading || locked) return
    setLoading(true)
    setPinError(false)
    try {
      const valid = await verifyAthletePin(athlete.id, pin)
      if (!valid) {
        recordFailedAttempt(athlete.id)
        if (isLockedOut(athlete.id)) {
          setLocked(true)
          setRemaining(getRemainingSeconds(athlete.id))
        } else {
          setPinError(true)
        }
        return
      }
      clearAttempts(athlete.id)
      const alreadyIn = await hasCheckedInToday(athlete.id)
      if (alreadyIn) { onAlreadyCheckedIn(); return }
      onSuccess()
    } catch {
      setPinError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pin-screen">
      <div className="pin-header">
        <div className="gdd-logo-wordmark" style={{ fontSize: 28 }}>GDD</div>
        <div style={{ height: 1, background: 'var(--border)', margin: '16px 0 20px' }} />
        <p className="pin-greeting">Olá, <span>{firstName}!</span></p>
        <p className="pin-label">Insere o teu PIN de 4 dígitos</p>
      </div>

      <div className="pin-body">
        {locked ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
            <p style={{ fontFamily: 'Saira Condensed, sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', marginBottom: 8 }}>
              Bloqueado
            </p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--muted)' }}>
              Demasiadas tentativas. Tenta novamente em
            </p>
            <p style={{ fontFamily: 'Saira Condensed, sans-serif', fontSize: 32, fontWeight: 700, color: 'var(--white)', marginTop: 8 }}>
              {remaining}s
            </p>
          </div>
        ) : (
          <>
            {pinError && (
              <p className="error-banner" style={{ marginBottom: 20 }}>
                PIN incorreto — tenta novamente
              </p>
            )}
            <PinPad onComplete={handlePin} error={pinError} />
          </>
        )}
      </div>

      <button className="pin-back" onClick={onBack}>← Voltar à lista</button>
    </div>
  )
}
