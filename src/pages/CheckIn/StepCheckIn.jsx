import Logo from '../../components/Logo'

export default function StepCheckIn({ athlete, onConfirm, onBack, loading }) {
  const firstName = athlete.name.split(' ')[0]

  return (
    <div className="splash-content">
      <div className="gdd-logo-block">
        <div className="gdd-logo-center">
          <Logo size="sm" />
        </div>
      </div>

      <div className="checkin-intent">
        <p className="checkin-intent-greeting">Olá, <span>{firstName}!</span></p>
        <p className="checkin-intent-label">Confirma o teu check-in de hoje?</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
        <button
          className="btn-primary"
          onClick={onConfirm}
          disabled={loading}
          style={{ fontSize: 18, padding: '20px 24px' }}
        >
          {loading ? 'A registar…' : '✓ Confirmar Check-in'}
        </button>
        <button
          className="btn-secondary"
          onClick={onBack}
          disabled={loading}
        >
          ← Cancelar
        </button>
      </div>
    </div>
  )
}
