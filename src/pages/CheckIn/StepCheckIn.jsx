import Logo from '../../components/Logo'

function DumbbellIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="16" width="6" height="8" rx="2" fill="var(--red)" />
      <rect x="5" y="13" width="4" height="14" rx="2" fill="var(--red)" />
      <rect x="32" y="16" width="6" height="8" rx="2" fill="var(--red)" />
      <rect x="31" y="13" width="4" height="14" rx="2" fill="var(--red)" />
      <rect x="9" y="18" width="22" height="4" rx="2" fill="var(--red)" />
    </svg>
  )
}

export default function StepCheckIn({ athlete, onConfirm, onBack, loading }) {
  const firstName = athlete.name.split(' ')[0]
  const today = new Date().toLocaleDateString('pt-PT', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Lisbon'
  })
  const todayFormatted = today.charAt(0).toUpperCase() + today.slice(1)

  return (
    <div className="splash-content">
      <div className="gdd-logo-block">
        <div className="gdd-logo-center">
          <Logo size="sm" />
        </div>
      </div>

      <div className="checkin-intent">
        <p className="checkin-intent-greeting">Olá, <span>{firstName}!</span></p>
        <p className="checkin-intent-date">{todayFormatted}</p>
      </div>

      <div className="checkin-circle-wrap">
        <button
          className={`checkin-circle-btn${loading ? ' loading' : ''}`}
          onClick={onConfirm}
          disabled={loading}
        >
          <DumbbellIcon />
          <span className="checkin-circle-line1">{loading ? 'A registar…' : 'CHECK-IN'}</span>
          {!loading && <span className="checkin-circle-line2">GYM</span>}
        </button>
      </div>

      <button
        className="btn-secondary"
        onClick={onBack}
        disabled={loading}
        style={{ marginTop: 8 }}
      >
        ← Cancelar
      </button>
    </div>
  )
}
