import { useState } from 'react'
import StepName from './StepName'
import StepPin from './StepPin'
import StepConfirm from './StepConfirm'
import { addCheckin } from '../../services/checkins'
import './CheckIn.css'

export default function CheckIn() {
  const [step, setStep] = useState('name') // 'name' | 'pin' | 'confirm' | 'already'
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
      <div className="checkin-header">
        <div className="checkin-logo">⚽</div>
        <p className="checkin-title">{step === 'pin' && athlete ? `Hey, ${athlete.name.split(' ')[0]}!` : 'GDD Off-Season'}</p>
        <p className="checkin-subtitle">
          {step === 'name' ? 'Gym Check-in' : step === 'pin' ? 'Enter your PIN' : 'See you at the gym!'}
        </p>
      </div>
      <div className="checkin-body">
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
          <div className="confirm-wrap">
            <div className="confirm-icon">📋</div>
            <p className="confirm-name">Already checked in!</p>
            <p style={{ color: '#9ca3af', fontSize: 14 }}>You already checked in today, {athlete?.name.split(' ')[0]}.</p>
            <button className="pin-back" onClick={handleReset}>← Back</button>
          </div>
        )}
      </div>
    </div>
  )
}
