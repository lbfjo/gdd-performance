import { useState } from 'react'
import StepName from './StepName'
import StepPin from './StepPin'
import StepConfirm from './StepConfirm'
import { addCheckin } from '../../services/checkins'
import './CheckIn.css'

export default function CheckIn() {
  const [step, setStep] = useState('name')
  const [athlete, setAthlete] = useState(null)

  function handleSelectAthlete(a) { setAthlete(a); setStep('pin') }

  async function handlePinSuccess() {
    await addCheckin(athlete.id, athlete.name).catch(() => {})
    setStep('confirm')
  }

  function handleAlreadyCheckedIn() { setStep('already') }
  function handleReset() { setAthlete(null); setStep('name') }

  return (
    <div className="checkin-page">
      <div className="splash-bg" />
      <div className="splash-noise" />

      {step === 'name' && <StepName onSelect={handleSelectAthlete} />}
      {step === 'pin' && athlete && (
        <StepPin
          athlete={athlete}
          onSuccess={handlePinSuccess}
          onAlreadyCheckedIn={handleAlreadyCheckedIn}
          onBack={() => { setAthlete(null); setStep('name') }}
        />
      )}
      {step === 'confirm' && athlete && <StepConfirm athlete={athlete} onReset={handleReset} />}
      {step === 'already' && (
        <div className="already-screen">
          <div className="already-icon">⚠️</div>
          <p className="already-title">Já registado!</p>
          <p className="already-sub">
            {athlete?.name.split(' ')[0]}, já fizeste check-in hoje.
          </p>
          <button className="btn-secondary" onClick={handleReset} style={{ maxWidth: 280, marginTop: 8 }}>
            Voltar
          </button>
        </div>
      )}
    </div>
  )
}
