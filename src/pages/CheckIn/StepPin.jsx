import { useState } from 'react'
import PinPad from '../../components/PinPad'
import { verifyAthletePin } from '../../services/athletes'
import { hasCheckedInToday } from '../../services/checkins'

export default function StepPin({ athlete, onSuccess, onAlreadyCheckedIn, onBack }) {
  const [pinError, setPinError] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handlePin(pin) {
    if (loading) return
    setLoading(true)
    setPinError(false)
    try {
      // Verify PIN first — don't short-circuit before auth
      const valid = await verifyAthletePin(athlete.id, pin)
      if (!valid) { setPinError(true); return }

      // PIN correct — now check if already checked in today
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
    <>
      <p className="pin-name">{athlete.name}</p>
      <p className="pin-subtitle">Insere o teu PIN de 4 dígitos</p>
      <PinPad onComplete={handlePin} error={pinError} />
      <button className="pin-back" onClick={onBack}>← Voltar à lista</button>
    </>
  )
}
