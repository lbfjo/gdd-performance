import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PinPad from '../../components/PinPad'
import { verifyStaffPin } from '../../services/config'
import './Staff.css'

export const STAFF_SESSION_KEY = 'gdd_staff_auth'

export default function Staff() {
  const navigate = useNavigate()
  const [pinError, setPinError] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handlePin(pin) {
    if (loading) return
    setLoading(true)
    setPinError(false)
    try {
      const valid = await verifyStaffPin(pin)
      if (valid) {
        sessionStorage.setItem(STAFF_SESSION_KEY, '1')
        navigate('/dashboard')
      } else {
        setPinError(true)
      }
    } catch {
      setPinError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="staff-page">
      <div className="staff-logo">GDD</div>
      <div className="staff-logo-sub">Performance</div>
      <div className="staff-divider" />
      <p className="staff-title">Acesso Staff</p>
      <p className="staff-subtitle">PIN partilhado da equipa técnica</p>
      {pinError && <p className="staff-error">PIN incorreto — tenta novamente</p>}
      <PinPad onComplete={handlePin} error={pinError} />
    </div>
  )
}
