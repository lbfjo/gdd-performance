import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PinPad from '../../components/PinPad'
import { verifyStaffPin } from '../../services/config'
import TabAthletes from './TabAthletes'
import TabSettings from './TabSettings'
import { STAFF_SESSION_KEY } from '../Staff'
import './Admin.css'
import '../Staff/Staff.css'

const TABS = [
  { key: 'athletes', label: 'Atletas' },
  { key: 'settings', label: 'Configurações' },
]

export default function Admin() {
  const navigate    = useNavigate()
  const [authed, setAuthed]       = useState(() => !!sessionStorage.getItem(STAFF_SESSION_KEY))
  const [activeTab, setActiveTab] = useState('athletes')
  const [pinError, setPinError]   = useState(false)
  const [verifying, setVerifying] = useState(false)

  async function handlePin(pin) {
    if (verifying) return
    setVerifying(true)
    setPinError(false)
    try {
      const valid = await verifyStaffPin(pin)
      if (valid) {
        sessionStorage.setItem(STAFF_SESSION_KEY, '1')
        setAuthed(true)
      } else { setPinError(true) }
    } catch { setPinError(true) }
    finally { setVerifying(false) }
  }

  if (!authed) {
    return (
      <div className="staff-page">
        <div className="staff-logo">GDD</div>
        <div className="staff-logo-sub">Performance</div>
        <div className="staff-divider" />
        <p className="staff-title">Painel Admin</p>
        <p className="staff-subtitle">PIN da equipa técnica</p>
        {pinError && <p className="staff-error">PIN incorreto</p>}
        <PinPad onComplete={handlePin} error={pinError} />
      </div>
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="admin-brand">
          <span className="admin-brand-name">GDD</span>
          <span className="admin-brand-sub">Admin</span>
        </div>
        <button className="admin-logout" onClick={() => { sessionStorage.removeItem(STAFF_SESSION_KEY); navigate('/staff') }}>
          Sair
        </button>
      </div>

      <div className="admin-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`admin-tab${activeTab === t.key ? ' active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="admin-content">
        {activeTab === 'athletes' && <TabAthletes />}
        {activeTab === 'settings' && <TabSettings />}
      </div>
    </div>
  )
}
