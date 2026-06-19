import { useEffect, useMemo, useState } from 'react'
import { getAllAthletes } from '../../services/athletes'
import { getCheckinsForWeek } from '../../services/checkins'
import { getBookingsForWeek } from '../../services/bookings'
import { getWeightLogsForWeek } from '../../services/nutrition'
import { getNutritionSlotsForWeek } from '../../services/nutritionAppointments'
import { getLocalDate, getPreviousWeekBounds, getWeekBounds } from '../../lib/dates'
import { buildPlatformAccessSet } from '../../data/platformAccess'
import './TabOverview.css'

const EXCLUDED_NAMES = new Set(['choco'])
const STATUS_ORDER = { Crítico: 0, Atenção: 1, OK: 2, Top: 3 }

function pct(value, total) {
  if (!total) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

function formatWeek(start, end) {
  const startDate = new Date(`${start}T12:00:00`)
  const endDate = new Date(`${end}T12:00:00`)
  return `${startDate.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })} — ${endDate.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}`
}

function getStatus(row) {
  if (row.trainings >= 4) return { label: 'Top', action: 'Reforçar positivo' }
  if (row.trainings === 0 && !row.platform) return { label: 'Crítico', action: 'Contactar hoje' }
  if (row.trainings === 0) return { label: 'Atenção', action: 'Follow-up treino' }
  if (!row.platform) return { label: 'Atenção', action: 'Onboarding' }
  if (!row.nutrition) return { label: 'Atenção', action: 'Marcar nutrição' }
  return { label: 'OK', action: 'Monitorizar' }
}

function MetricCard({ tone = 'neutral', label, value, percent, hint, icon }) {
  return (
    <div className={`overview-metric ${tone}`}>
      <div className="overview-metric-icon">{icon}</div>
      <div>
        <p className="overview-metric-label">{label}</p>
        <p className="overview-metric-value">{value}</p>
        <p className="overview-metric-percent">{percent}</p>
        {hint && <p className="overview-metric-hint">{hint}</p>}
      </div>
    </div>
  )
}

function ProgressRow({ label, value, total, tone = 'green' }) {
  return (
    <div className="overview-progress-row">
      <div className="overview-progress-meta">
        <span>{label}</span>
        <span>{value}/{total} · {pct(value, total)}</span>
      </div>
      <div className="overview-progress-track">
        <div className={`overview-progress-fill ${tone}`} style={{ width: pct(value, total) }} />
      </div>
    </div>
  )
}

function ActionBucket({ tone, title, detail, rows }) {
  return (
    <div className={`overview-action ${tone}`}>
      <div>
        <p className="overview-action-title">{title}</p>
        <p className="overview-action-detail">{detail}</p>
      </div>
      <span>{rows.length}</span>
    </div>
  )
}

export default function TabOverview() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [weekStart, setWeekStart] = useState(() => getWeekBounds(getLocalDate()).start)
  const [position, setPosition] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      const { start, end } = getWeekBounds(weekStart)
      const [allAthletes, checkins, bookings, nutritionLogs, nutritionSlots] = await Promise.all([
        getAllAthletes(),
        getCheckinsForWeek(start),
        getBookingsForWeek(start, end),
        getWeightLogsForWeek(start, end).catch(() => []),
        getNutritionSlotsForWeek(start, end).catch(() => []),
      ])

      const athletes = allAthletes
        .filter(athlete => athlete.active !== false)
        .filter(athlete => !EXCLUDED_NAMES.has(athlete.name))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-PT'))

      const platformAccess = buildPlatformAccessSet(athletes)
      const checkinCounts = new Map()
      checkins.forEach(checkin => {
        if (EXCLUDED_NAMES.has(checkin.athleteName)) return
        checkinCounts.set(checkin.athleteId, (checkinCounts.get(checkin.athleteId) || 0) + 1)
      })

      const bookedIds = new Set(bookings.map(booking => booking.athleteId).filter(Boolean))
      const nutritionIds = new Set([
        ...nutritionLogs.map(log => log.athleteId).filter(Boolean),
        ...nutritionSlots
          .filter(slot => slot.status === 'booked')
          .map(slot => slot.athleteId)
          .filter(Boolean),
      ])

      const rows = athletes.map(athlete => {
        const base = {
          id: athlete.id,
          name: athlete.name,
          position: athlete.position || 'Sem posição',
          trainings: checkinCounts.get(athlete.id) || 0,
          booked: bookedIds.has(athlete.id),
          nutrition: nutritionIds.has(athlete.id),
          platform: platformAccess.has(athlete.name),
        }
        const status = getStatus(base)
        return { ...base, status: status.label, action: status.action }
      })

      setData({
        start,
        end,
        generatedAt: new Date().toLocaleString('pt-PT', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        rows,
      })
      setLoading(false)
    }

    load().catch(() => {
      setError('Não foi possível carregar o dashboard.')
      setLoading(false)
    })
  }, [weekStart])

  const model = useMemo(() => {
    if (!data) return null
    const rows = data.rows
    const total = rows.length
    const trained = rows.filter(row => row.trainings > 0)
    const noTraining = rows.filter(row => row.trainings === 0)
    const fourPlus = rows.filter(row => row.trainings >= 4)
    const bookedAndTrained = rows.filter(row => row.booked && row.trainings > 0)
    const nutrition = rows.filter(row => row.nutrition)
    const platformOpen = rows.filter(row => row.platform)
    const platformPending = rows.filter(row => !row.platform)
    const distribution = [0, 1, 2, 3].map(count => ({
      label: String(count),
      value: rows.filter(row => row.trainings === count).length,
    })).concat({ label: '4+', value: fourPlus.length })
    const positions = [...new Set(rows.map(row => row.position))].sort((a, b) => a.localeCompare(b, 'pt-PT'))

    return {
      total,
      trained,
      noTraining,
      fourPlus,
      bookedAndTrained,
      nutrition,
      platformOpen,
      platformPending,
      distribution,
      positions,
      contactToday: rows.filter(row => row.trainings === 0 && !row.platform),
      followUp: rows.filter(row => row.trainings === 0 && row.platform),
      missingNutrition: rows.filter(row => !row.nutrition),
      trainedNoBooking: rows.filter(row => row.trainings > 0 && !row.booked),
      rows,
    }
  }, [data])

  const filteredRows = useMemo(() => {
    if (!model) return []
    const term = search.trim().toLowerCase()
    return model.rows
      .filter(row => position === 'all' || row.position === position)
      .filter(row => statusFilter === 'all' || row.status === statusFilter)
      .filter(row => !term || row.name.toLowerCase().includes(term))
      .sort((a, b) => (
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        a.trainings - b.trainings ||
        a.name.localeCompare(b.name, 'pt-PT')
      ))
  }, [model, position, statusFilter, search])

  if (loading) return <p className="loading-state">A carregar dashboard...</p>
  if (error) return <p className="loading-state">{error}</p>
  if (!model) return null

  const currentWeekStart = getWeekBounds(getLocalDate()).start
  const isCurrentWeek = weekStart === currentWeekStart
  const maxDistribution = Math.max(...model.distribution.map(item => item.value), 1)
  const topRows = model.rows
    .filter(row => row.trainings > 0)
    .sort((a, b) => b.trainings - a.trainings || a.name.localeCompare(b.name, 'pt-PT'))
    .slice(0, 5)
  const riskRows = model.noTraining
    .sort((a, b) => Number(a.platform) - Number(b.platform) || a.name.localeCompare(b.name, 'pt-PT'))
    .slice(0, 5)

  return (
    <div className="overview-shell">
      <div className="overview-topbar">
        <div>
          <p className="overview-eyebrow">GDD Performance</p>
          <h1>Dashboard Semanal <span>{formatWeek(data.start, data.end)}</span></h1>
          <p className="overview-generated">Gerado em {data.generatedAt}</p>
        </div>
        <div className="overview-filters">
          <div className="overview-week-nav" aria-label="Selecionar semana">
            <button
              type="button"
              onClick={() => setWeekStart(getPreviousWeekBounds(weekStart).start)}
            >
              ‹
            </button>
            <button
              type="button"
              className="wide"
              onClick={() => setWeekStart(currentWeekStart)}
              disabled={isCurrentWeek}
            >
              {isCurrentWeek ? 'Semana atual' : 'Voltar à atual'}
            </button>
            <button
              type="button"
              disabled={isCurrentWeek}
              onClick={() => {
                const next = new Date(`${weekStart}T12:00:00`)
                next.setDate(next.getDate() + 7)
                setWeekStart(next.toLocaleDateString('sv-SE'))
              }}
            >
              ›
            </button>
          </div>
          <select value={position} onChange={event => setPosition(event.target.value)}>
            <option value="all">Todas as posições</option>
            {model.positions.map(pos => <option key={pos} value={pos}>{pos}</option>)}
          </select>
          <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
            <option value="all">Todos os estados</option>
            <option value="Crítico">Crítico</option>
            <option value="Atenção">Atenção</option>
            <option value="OK">OK</option>
            <option value="Top">Top</option>
          </select>
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Pesquisar jogador..." />
        </div>
      </div>

      <div className="overview-metrics">
        <MetricCard icon="A" label="Ativos" value={model.total} percent="100% do plantel" />
        <MetricCard tone="positive" icon="T" label="Treinaram" value={model.trained.length} percent={`${pct(model.trained.length, model.total)} do plantel`} />
        <MetricCard tone="danger" icon="0" label="0 Treinos" value={model.noTraining.length} percent={`${pct(model.noTraining.length, model.total)} do plantel`} />
        <MetricCard tone="warning" icon="4+" label="4+ Treinos" value={model.fourPlus.length} percent={`${pct(model.fourPlus.length, model.total)} do plantel`} />
        <MetricCard tone="positive" icon="R" label="Agendaram + Treinaram" value={model.bookedAndTrained.length} percent={`${pct(model.bookedAndTrained.length, model.total)} do plantel`} />
        <MetricCard tone="positive" icon="N" label="Nutrição" value={model.nutrition.length} percent={`${pct(model.nutrition.length, model.total)} do plantel`} />
        <MetricCard tone="danger" icon="P" label="Sem Plataforma" value={model.platformPending.length} percent={`${pct(model.platformPending.length, model.total)} do plantel`} />
      </div>

      <div className="overview-grid">
        <section className="overview-panel distribution">
          <div className="overview-panel-header">
            <h2>Distribuição de Treinos</h2>
            <span>Jogadores</span>
          </div>
          <div className="overview-bars">
            {model.distribution.map(item => (
              <div key={item.label} className="overview-bar-item">
                <span>{item.value}</span>
                <div className={`overview-bar ${item.label === '0' ? 'danger' : item.label === '4+' ? 'positive' : ''}`} style={{ height: `${Math.max(12, (item.value / maxDistribution) * 116)}px` }} />
                <small>{item.label}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="overview-panel">
          <div className="overview-panel-header">
            <h2>Acompanhamento</h2>
          </div>
          <ProgressRow label="Plataforma aberta" value={model.platformOpen.length} total={model.total} tone="green" />
          <ProgressRow label="Ainda não abriram" value={model.platformPending.length} total={model.total} tone="red" />
          <ProgressRow label="Avaliação nutrição" value={model.nutrition.length} total={model.total} tone="amber" />
          <ProgressRow label="Agendaram + treinaram" value={model.bookedAndTrained.length} total={model.total} tone="green" />
        </section>

        <section className="overview-panel actions">
          <div className="overview-panel-header">
            <h2>Ações Prioritárias</h2>
          </div>
          <ActionBucket tone="danger" title="Crítico" detail="0 treinos + sem plataforma" rows={model.contactToday} />
          <ActionBucket tone="warning" title="Atenção" detail="0 treinos mas plataforma aberta" rows={model.followUp} />
          <ActionBucket tone="positive" title="Bom compromisso" detail="4+ treinos" rows={model.fourPlus} />
          <ActionBucket tone="muted" title="Treinou sem agendar" detail="check-in sem reserva" rows={model.trainedNoBooking} />
        </section>
      </div>

      <div className="overview-grid lower">
        <section className="overview-panel top-risk">
          <div className="overview-panel-header">
            <h2>Top / Risco</h2>
          </div>
          <div className="overview-split-list">
            <div>
              <p className="overview-list-title positive">Mais ativos</p>
              {topRows.map((row, index) => (
                <div key={row.id} className="overview-mini-row">
                  <span>{index + 1}</span><strong>{row.name}</strong><em>{row.trainings}</em>
                </div>
              ))}
            </div>
            <div>
              <p className="overview-list-title danger">Sem treino</p>
              {riskRows.map((row, index) => (
                <div key={row.id} className="overview-mini-row">
                  <span>{index + 1}</span><strong>{row.name}</strong><em>0</em>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="overview-panel table-panel">
        <div className="overview-panel-header">
          <h2>Estado dos Jogadores</h2>
          <span>{filteredRows.length} jogadores</span>
        </div>
        <div className="overview-table-wrap">
          <table className="overview-table">
            <thead>
              <tr>
                <th>Jogador</th>
                <th>Posição</th>
                <th>Treinos</th>
                <th>Agendou</th>
                <th>Nutrição</th>
                <th>Plataforma</th>
                <th>Estado</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(row => (
                <tr key={row.id}>
                  <td className="player-cell">{row.name}</td>
                  <td>{row.position}</td>
                  <td>{row.trainings}</td>
                  <td className={row.booked ? 'yes' : 'no'}>{row.booked ? 'Sim' : 'Não'}</td>
                  <td className={row.nutrition ? 'yes' : 'no'}>{row.nutrition ? 'Sim' : 'Não'}</td>
                  <td className={row.platform ? 'yes' : 'no'}>{row.platform ? 'Sim' : 'Não'}</td>
                  <td><span className={`overview-status ${row.status.toLowerCase()}`}>{row.status}</span></td>
                  <td>{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
