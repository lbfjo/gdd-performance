import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StepName from './StepName'
import StepPin from './StepPin'
import StepConfirm from './StepConfirm'
import { addCheckin } from '../../services/checkins'
import { ATHLETE_KEY } from '../Athlete'
import './CheckIn.css'

export default function CheckIn() {
  const navigate = useNavigate()
  const [step, setStep] = useState('name')
  const [athlete, setAthlete] = useState(null)

  function handleSelectAthlete(a) { setAthlete(a); setStep('pin') }

  async function handlePinSuccess() {
    await addCheckin(athlete.id, athlete.name).catch(() => {})
    setStep('confirm')
  }

  function handleAlreadyCheckedIn() { setStep('already') }
  function handleReset() { setAthlete(null); setStep('name') }

  function goToPersonalArea() {
    // PIN was already verified — auto-login to athlete area
    localStorage.setItem(ATHLETE_KEY, JSON.stringify({ id: athlete.id, name: athlete.name }))
    navigate('/athlete')
  }

  return (
    <div className="checkin-page">
      <div className="splash-bg" />
      <div className="splash-noise" />
      <div className="splash-scanlines" />

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
          <div className="already-icon" style={{ fontSize: 44 }}>✓</div>
          <p className="already-title" style={{ color: 'var(--green)' }}>
            Já fizeste check-in!
          </p>
          <p className="already-sub">
            {athlete?.name.split(' ')[0]}, o teu treino de hoje já está registado.
          </p>
          <button
            className="btn-primary"
            onClick={goToPersonalArea}
            style={{ maxWidth: 280, marginTop: 8 }}
          >
            Ver o meu perfil →
          </button>
          <button
            className="btn-secondary"
            onClick={handleReset}
            style={{ maxWidth: 280, marginTop: 8 }}
          >
            Voltar ao início
          </button>
        </div>
      )}
    </div>
  )
}
