import { useState, useEffect } from 'react'
import { getAthletes } from '../../services/athletes'

export default function StepName({ onSelect }) {
  const [athletes, setAthletes] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getAthletes()
      .then(setAthletes)
      .catch(() => setError('Could not load athlete list. Check your connection.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = athletes.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <p style={{ color: '#6b7280', textAlign: 'center', padding: 24 }}>Loading...</p>
  if (error) return <p className="error-banner">{error}</p>

  return (
    <>
      <input
        className="search-input"
        placeholder="🔍 Search your name..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        autoComplete="off"
      />
      <div className="athlete-list">
        {filtered.length === 0 && (
          <p className="athlete-empty">No athlete found. Contact your coach.</p>
        )}
        {filtered.map(a => (
          <button key={a.id} className="athlete-item" onClick={() => onSelect(a)}>
            {a.name}
          </button>
        ))}
      </div>
    </>
  )
}
