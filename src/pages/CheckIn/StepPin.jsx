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
    <>
      <p className="pin-name">{athlete.name}</p>
      <p className="pin-subtitle">Enter your 4-digit PIN</p>
      <PinPad onComplete={handlePin} error={pinError} />
      <button className="pin-back" onClick={onBack}>← Back</button>
    </>
  )
}
