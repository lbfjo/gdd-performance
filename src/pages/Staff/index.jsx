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
      <div style={{ width: 56, height: 56, background: '#1f2937', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>⚽</div>
      <p className="staff-title">Staff Access</p>
      <p className="staff-subtitle">Enter the shared staff PIN</p>
      {pinError && <p className="staff-error">Incorrect PIN — try again</p>}
      <PinPad onComplete={handlePin} error={pinError} />
    </div>
  )
}
