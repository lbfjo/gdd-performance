import { useEffect, useMemo, useState } from 'react'
import { getAllAthletes, updateAthleteStatus } from '../../services/athletes'
import {
  addStaffCheckin,
  getCheckinsForAthleteOnDate,
  removeCheckin,
} from '../../services/checkins'
import { getLocalDate } from '../../lib/dates'
import './TabControl.css'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Ativo' },
  { value: 'injured', label: 'Lesionado' },
  { value: 'excused', label: 'Justificado' },
  { value: 'limited', label: 'Limitado' },
  { value: 'followup', label: 'Follow-up' },
  { value: 'away', label: 'Ausente' },
]

function formatCheckinTime(checkin) {
  const seconds = checkin.timestamp?.seconds
  if (!seconds) return 'hora indisponivel'
  return new Date(seconds * 1000).toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function TabControl() {
  const [athletes, setAthletes] = useState([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [date, setDate] = useState(getLocalDate())
  const [checkins, setCheckins] = useState([])
  const [statusType, setStatusType] = useState('active')
  const [statusNote, setStatusNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getAllAthletes()
      .then(rows => {
        setAthletes(rows)
        setLoading(false)
      })
      .catch(() => {
        setError('Nao foi possivel carregar atletas.')
        setLoading(false)
      })
  }, [])

  const selected = athletes.find(a => a.id === selectedId) || null

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return athletes.filter(a => a.active !== false).slice(0, 8)
    return athletes
      .filter(a => a.name.toLowerCase().includes(term))
      .slice(0, 8)
  }, [athletes, search])

  async function loadCheckins(athleteId = selectedId, selectedDate = date) {
    if (!athleteId) {
      setCheckins([])
      return
    }
    const rows = await getCheckinsForAthleteOnDate(athleteId, selectedDate)
    setCheckins(rows)
  }

  async function selectAthlete(athlete) {
    setSelectedId(athlete.id)
    setSearch(athlete.name)
    setMessage('')
    setError('')
    setStatusType(athlete.staffStatus?.type || 'active')
    setStatusNote(athlete.staffStatus?.note || '')
    await loadCheckins(athlete.id, date).catch(() => {
      setError('Nao foi possivel carregar check-ins.')
    })
  }

  async function handleDateChange(value) {
    setDate(value)
    setMessage('')
    setError('')
    await loadCheckins(selectedId, value).catch(() => {
      setError('Nao foi possivel carregar check-ins.')
    })
  }

  async function handleSaveStatus(e) {
    e.preventDefault()
    if (!selected) return
    setWorking(true)
    setMessage('')
    setError('')
    try {
      await updateAthleteStatus(selected.id, { type: statusType, note: statusNote.trim() })
      setAthletes(prev => prev.map(a => (
        a.id === selected.id
          ? { ...a, staffStatus: { type: statusType, note: statusNote.trim() } }
          : a
      )))
      setMessage('Estado do atleta atualizado.')
    } catch {
      setError('Nao foi possivel guardar o estado.')
    } finally {
      setWorking(false)
    }
  }

  async function handleAddCheckin() {
    if (!selected) return
    setWorking(true)
    setMessage('')
    setError('')
    try {
      await addStaffCheckin(selected.id, selected.name, date)
      await loadCheckins(selected.id, date)
      setMessage('Check-in adicionado pela equipa.')
    } catch {
      setError('Nao foi possivel adicionar o check-in.')
    } finally {
      setWorking(false)
    }
  }

  async function handleRemoveCheckin(checkin) {
    if (!confirm(`Remover check-in de ${selected.name} em ${date}?`)) return
    setWorking(true)
    setMessage('')
    setError('')
    try {
      await removeCheckin(checkin.id)
      await loadCheckins(selected.id, date)
      setMessage('Check-in removido.')
    } catch {
      setError('Nao foi possivel remover o check-in.')
    } finally {
      setWorking(false)
    }
  }

  if (loading) return <p className="loading-state">A carregar...</p>

  return (
    <div className="control-panel">
      <div className="control-section">
        <p className="section-title">Controlo de atleta</p>
        <p className="section-sub">Corrige presencas e marca excecoes operacionais.</p>
        <input
          className="control-search"
          placeholder="Procurar atleta..."
          value={search}
          onChange={e => {
            setSearch(e.target.value)
            setSelectedId('')
            setMessage('')
            setError('')
          }}
          autoComplete="off"
        />
        {!selected && filtered.length > 0 && (
          <div className="control-athlete-list">
            {filtered.map(a => (
              <button
                key={a.id}
                className={`control-athlete-option${a.active === false ? ' inactive' : ''}`}
                onClick={() => selectAthlete(a)}
              >
                <span>{a.name}</span>
                <small>
                  {a.active === false ? 'Inativo' : a.staffStatus?.type || 'Ativo'}
                </small>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <>
          <form className="control-section" onSubmit={handleSaveStatus}>
            <div className="control-section-header">
              <div>
                <p className="control-athlete-name">{selected.name}</p>
                {selected.position && <p className="control-athlete-meta">{selected.position}</p>}
              </div>
              {selected.active === false && <span className="control-pill">Inativo</span>}
            </div>
            <div className="control-form-grid">
              <label>
                Estado
                <select value={statusType} onChange={e => setStatusType(e.target.value)}>
                  {STATUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Nota
                <input
                  value={statusNote}
                  onChange={e => setStatusNote(e.target.value)}
                  placeholder="Ex: autorizado pelo staff"
                />
              </label>
            </div>
            <button className="btn-primary control-save-btn" type="submit" disabled={working}>
              {working ? 'A guardar...' : 'Guardar estado'}
            </button>
          </form>

          <div className="control-section">
            <div className="control-section-header">
              <div>
                <p className="control-block-title">Presencas</p>
                <p className="control-block-sub">Adiciona ou remove check-ins nesta data.</p>
              </div>
              <input
                className="control-date"
                type="date"
                value={date}
                onChange={e => handleDateChange(e.target.value)}
              />
            </div>

            <button className="btn-primary control-save-btn" onClick={handleAddCheckin} disabled={working}>
              {working ? 'A atualizar...' : '+ Adicionar check-in'}
            </button>

            <div className="control-checkin-list">
              {checkins.length === 0 ? (
                <p className="control-empty">Sem check-ins nesta data.</p>
              ) : (
                checkins.map((checkin, index) => (
                  <div key={checkin.id} className="control-checkin-row">
                    <div>
                      <p>Check-in #{index + 1}</p>
                      <small>
                        {formatCheckinTime(checkin)}
                        {checkin.source === 'staff' ? ' · staff' : ''}
                      </small>
                    </div>
                    <button onClick={() => handleRemoveCheckin(checkin)} disabled={working}>
                      Remover
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {message && <p className="control-message">{message}</p>}
      {error && <p className="error-banner">{error}</p>}
    </div>
  )
}
