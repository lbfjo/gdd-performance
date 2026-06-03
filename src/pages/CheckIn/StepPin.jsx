import { useState } from 'react'
import PinPad from '../../components/PinPad'
import { verifyAthletePin } from '../../services/athletes'
import { hasCheckedInToday } from '../../services/checkins'

export default function StepPin({ athlete, onSuccess, onAlreadyCheckedIn, onBack }) {
  const [pinError, setPinError] = useState(false)
  const [loading, setLoading] = useState(false)

  const firstName = athlete.name.split(' ')[0]

  async function handlePin(pin) {
    if (loading) return
    setLoading(true)
    setPinError(false)
    try {
      const alreadyIn = await hasCheckedInToday(athlete.id)
      if (alreadyIn) { onAlreadyCheckedIn(); return }

      const valid = await verifyAthletePin(athlete.id, pin)
      if (valid) { onSuccess() }
      else { setPinError(true) }
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
        <div style={{ height: 1, background: 'var(--border)', margin: '20px 0 24px' }} />
        <p className="pin-greeting">
          Olá, <span>{firstName}!</span>
        </p>
        <p className="pin-label">Insere o teu PIN de 4 dígitos</p>
      </div>

      <div className="pin-body">
        {pinError && (
          <p className="error-banner" style={{ marginBottom: 20 }}>
            PIN incorreto — tenta novamente
          </p>
        )}
        <PinPad onComplete={handlePin} error={pinError} />
      </div>

      <button className="pin-back" onClick={onBack}>← Voltar à lista</button>
    </div>
  )
}
