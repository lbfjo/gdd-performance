# GDD Performance — App Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 7 improvements to the GDD Performance PWA: admin panel, CSV export, weekly target, first-time PIN setup, offline queue, brute-force protection, and code splitting.

**Architecture:** All features build on the existing React + Vite + Firebase Firestore stack. The admin panel writes to Firestore via updated security rules that validate field structure. Offline queuing uses localStorage. Rate limiting uses localStorage with timestamps. Code splitting uses React.lazy + Suspense.

**Tech Stack:** React 18, Vite, Firebase Firestore, React Router v6, Vitest

---

## File Map

```
src/
  App.jsx                          MODIFY — lazy-load all routes + /admin route
  main.jsx                         MODIFY — add Suspense wrapper
  lib/
    offline.js                     CREATE — offline check-in queue (localStorage)
    rateLimit.js                   CREATE — PIN brute-force protection
    __tests__/
      offline.test.js              CREATE — unit tests for offline queue
      rateLimit.test.js            CREATE — unit tests for rate limiter
  services/
    athletes.js                    MODIFY — add getAllAthletes, addAthlete, deactivateAthlete, resetPin, setFirstPin
    config.js                      MODIFY — add getConfig, setWeeklyTarget
    checkins.js                    MODIFY — add getAllCheckinsForExport
  pages/
    Admin/
      index.jsx                    CREATE — admin shell (staff PIN gate + tab nav)
      Admin.css                    CREATE — admin styles
      TabAthletes.jsx              CREATE — athlete list + add + deactivate + reset PIN
      TabSettings.jsx              CREATE — weekly target config
    Athlete/
      TabHome.jsx                  MODIFY — show weekly target progress (X/Y)
      AthleteLogin.jsx             MODIFY — detect pinSet=false, show first-time setup
    CheckIn/
      StepPin.jsx                  MODIFY — check rate limit before PIN verify
    Dashboard/
      TabGrid.jsx                  MODIFY — add CSV export button
firestore.rules                    MODIFY — allow athlete writes with field validation
```

---

## Task 1: Update Firestore rules + athlete write services

**Files:**
- Modify: `firestore.rules`
- Modify: `src/services/athletes.js`
- Modify: `src/services/config.js`

- [ ] **Step 1: Update `firestore.rules` to allow admin writes**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /athletes/{id} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasAll(['name','pin','active'])
                    && request.resource.data.name is string
                    && request.resource.data.pin is string
                    && request.resource.data.active is bool;
      allow update: if request.resource.data.name is string;
      allow delete: if false;
    }

    match /checkins/{id} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasAll(['athleteId','athleteName','date','timestamp'])
                    && request.resource.data.athleteId is string
                    && request.resource.data.date is string;
      allow update, delete: if false;
    }

    match /config/{doc} {
      allow read: if true;
      allow write: if request.resource.data.keys().hasOnly(['staffPin','weeklyTarget'])
                   && request.resource.data.staffPin is string;
    }
  }
}
```

- [ ] **Step 2: Deploy updated rules**

```bash
cd /Users/franciscobruno/Desktop/personal/gdd
npx firebase-tools@latest deploy --only firestore:rules
```

Expected: `✔ firestore: released rules`

- [ ] **Step 3: Update `src/services/athletes.js`**

Replace the entire file:

```js
import {
  collection, query, where, orderBy, getDocs,
  doc, getDoc, addDoc, updateDoc, deleteField
} from 'firebase/firestore'
import { db } from '../firebase'
import { hashPin } from '../lib/hash'

export async function getAthletes() {
  const q = query(collection(db, 'athletes'), where('active', '==', true), orderBy('name'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, name: d.data().name, position: d.data().position }))
}

export async function getAllAthletes() {
  const q = query(collection(db, 'athletes'), orderBy('name'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data(), pin: undefined }))
}

export async function verifyAthletePin(athleteId, pin) {
  const snap = await getDoc(doc(db, 'athletes', athleteId))
  if (!snap.exists()) return false
  const data = snap.data()
  if (!data.pin) return false
  const entered = await hashPin(pin)
  return data.pin === entered
}

export async function athleteHasPinSet(athleteId) {
  const snap = await getDoc(doc(db, 'athletes', athleteId))
  if (!snap.exists()) return false
  return snap.data().pinSet === true
}

export async function addAthlete({ name, position }) {
  const rawPin = String(Math.floor(1000 + Math.random() * 9000))
  const pinHash = await hashPin(rawPin)
  await addDoc(collection(db, 'athletes'), {
    name,
    position: position || '',
    pin: pinHash,
    pinSet: false,
    active: true,
  })
  return rawPin
}

export async function deactivateAthlete(athleteId) {
  await updateDoc(doc(db, 'athletes', athleteId), { active: false })
}

export async function reactivateAthlete(athleteId) {
  await updateDoc(doc(db, 'athletes', athleteId), { active: true })
}

export async function resetAthletePin(athleteId) {
  const rawPin = String(Math.floor(1000 + Math.random() * 9000))
  const pinHash = await hashPin(rawPin)
  await updateDoc(doc(db, 'athletes', athleteId), { pin: pinHash, pinSet: false })
  return rawPin
}

export async function setFirstTimePin(athleteId, newPin) {
  const pinHash = await hashPin(newPin)
  await updateDoc(doc(db, 'athletes', athleteId), { pin: pinHash, pinSet: true })
}
```

- [ ] **Step 4: Update `src/services/config.js`**

Replace the entire file:

```js
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { hashPin } from '../lib/hash'

export async function verifyStaffPin(pin) {
  const snap = await getDoc(doc(db, 'config', 'app'))
  if (!snap.exists()) return false
  const entered = await hashPin(pin)
  return snap.data().staffPin === entered
}

export async function getConfig() {
  const snap = await getDoc(doc(db, 'config', 'app'))
  if (!snap.exists()) return { weeklyTarget: null }
  const data = snap.data()
  return { weeklyTarget: data.weeklyTarget ?? null }
}

export async function setWeeklyTarget(target) {
  const snap = await getDoc(doc(db, 'config', 'app'))
  if (!snap.exists()) return
  const current = snap.data()
  await setDoc(doc(db, 'config', 'app'), { ...current, weeklyTarget: target })
}
```

- [ ] **Step 5: Commit**

```bash
git add firestore.rules src/services/athletes.js src/services/config.js
git commit -m "feat: update Firestore rules and expand athlete/config services"
```

---

## Task 2: Offline check-in queue + brute-force protection

**Files:**
- Create: `src/lib/offline.js`
- Create: `src/lib/rateLimit.js`
- Create: `src/lib/__tests__/offline.test.js`
- Create: `src/lib/__tests__/rateLimit.test.js`

- [ ] **Step 1: Write failing tests for offline queue**

Create `src/lib/__tests__/offline.test.js`:

```js
import { enqueueCheckin, getPendingQueue, clearQueue, removeFromQueue } from '../offline'

describe('offline check-in queue', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('enqueueCheckin adds item to queue', () => {
    enqueueCheckin({ athleteId: 'a1', athleteName: 'Duarte Diniz', date: '2026-06-03' })
    const q = getPendingQueue()
    expect(q).toHaveLength(1)
    expect(q[0].athleteId).toBe('a1')
    expect(q[0].id).toBeDefined()
  })

  it('getPendingQueue returns empty array when nothing queued', () => {
    expect(getPendingQueue()).toEqual([])
  })

  it('removeFromQueue removes the correct item by id', () => {
    enqueueCheckin({ athleteId: 'a1', athleteName: 'A', date: '2026-06-03' })
    enqueueCheckin({ athleteId: 'a2', athleteName: 'B', date: '2026-06-03' })
    const q = getPendingQueue()
    removeFromQueue(q[0].id)
    expect(getPendingQueue()).toHaveLength(1)
    expect(getPendingQueue()[0].athleteId).toBe('a2')
  })

  it('clearQueue empties the queue', () => {
    enqueueCheckin({ athleteId: 'a1', athleteName: 'A', date: '2026-06-03' })
    clearQueue()
    expect(getPendingQueue()).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd /Users/franciscobruno/Desktop/personal/gdd
npx vitest run src/lib/__tests__/offline.test.js
```

Expected: FAIL — functions not found.

- [ ] **Step 3: Implement `src/lib/offline.js`**

```js
const KEY = 'gdd_offline_queue'

export function getPendingQueue() {
  try { return JSON.parse(localStorage.getItem(KEY)) || [] }
  catch { return [] }
}

function saveQueue(q) {
  localStorage.setItem(KEY, JSON.stringify(q))
}

export function enqueueCheckin(item) {
  const q = getPendingQueue()
  q.push({ ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` })
  saveQueue(q)
}

export function removeFromQueue(id) {
  saveQueue(getPendingQueue().filter(item => item.id !== id))
}

export function clearQueue() {
  localStorage.removeItem(KEY)
}
```

- [ ] **Step 4: Run offline tests to verify pass**

```bash
npx vitest run src/lib/__tests__/offline.test.js
```

Expected: 4 passed.

- [ ] **Step 5: Write failing tests for rate limiter**

Create `src/lib/__tests__/rateLimit.test.js`:

```js
import { recordFailedAttempt, isLockedOut, getRemainingSeconds, clearAttempts } from '../rateLimit'

describe('PIN rate limiter', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('isLockedOut returns false with no attempts', () => {
    expect(isLockedOut('a1')).toBe(false)
  })

  it('isLockedOut returns false after fewer than 5 attempts', () => {
    for (let i = 0; i < 4; i++) recordFailedAttempt('a1')
    expect(isLockedOut('a1')).toBe(false)
  })

  it('isLockedOut returns true after 5 attempts', () => {
    for (let i = 0; i < 5; i++) recordFailedAttempt('a1')
    expect(isLockedOut('a1')).toBe(true)
  })

  it('clearAttempts removes lockout', () => {
    for (let i = 0; i < 5; i++) recordFailedAttempt('a1')
    clearAttempts('a1')
    expect(isLockedOut('a1')).toBe(false)
  })

  it('getRemainingSeconds returns >0 when locked', () => {
    for (let i = 0; i < 5; i++) recordFailedAttempt('a1')
    expect(getRemainingSeconds('a1')).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 6: Run to verify it fails**

```bash
npx vitest run src/lib/__tests__/rateLimit.test.js
```

Expected: FAIL — functions not found.

- [ ] **Step 7: Implement `src/lib/rateLimit.js`**

```js
const KEY = 'gdd_pin_attempts'
const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 30_000 // 30 seconds

function getAttempts(athleteId) {
  try { return JSON.parse(localStorage.getItem(`${KEY}_${athleteId}`)) || [] }
  catch { return [] }
}

function saveAttempts(athleteId, attempts) {
  localStorage.setItem(`${KEY}_${athleteId}`, JSON.stringify(attempts))
}

function recentAttempts(athleteId) {
  const now = Date.now()
  return getAttempts(athleteId).filter(ts => now - ts < LOCKOUT_MS)
}

export function recordFailedAttempt(athleteId) {
  const attempts = recentAttempts(athleteId)
  attempts.push(Date.now())
  saveAttempts(athleteId, attempts)
}

export function isLockedOut(athleteId) {
  return recentAttempts(athleteId).length >= MAX_ATTEMPTS
}

export function getRemainingSeconds(athleteId) {
  const attempts = recentAttempts(athleteId)
  if (attempts.length < MAX_ATTEMPTS) return 0
  const oldest = Math.min(...attempts)
  return Math.ceil((LOCKOUT_MS - (Date.now() - oldest)) / 1000)
}

export function clearAttempts(athleteId) {
  localStorage.removeItem(`${KEY}_${athleteId}`)
}
```

- [ ] **Step 8: Run rate limit tests to verify pass**

```bash
npx vitest run src/lib/__tests__/rateLimit.test.js
```

Expected: 5 passed.

- [ ] **Step 9: Run all tests**

```bash
npx vitest run
```

Expected: all 20 tests pass.

- [ ] **Step 10: Commit**

```bash
git add src/lib/
git commit -m "feat: offline check-in queue and PIN rate limiter with tests"
```

---

## Task 3: CSV export service + dashboard button

**Files:**
- Modify: `src/services/checkins.js`
- Modify: `src/pages/Dashboard/TabGrid.jsx`
- Modify: `src/pages/Dashboard/TabGrid.css`

- [ ] **Step 1: Add `getAllCheckinsForExport` to `src/services/checkins.js`**

Append to the end of the file (do not replace existing functions):

```js
export async function getAllCheckinsForExport() {
  const q = query(
    collection(db, 'checkins'),
    orderBy('date', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => {
    const data = d.data()
    return {
      athlete: data.athleteName,
      date: data.date,
      week: getWeekBounds(data.date).start,
    }
  })
}
```

- [ ] **Step 2: Add export button styles to `src/pages/Dashboard/TabGrid.css`**

Append to the end of the file:

```css
.grid-export-btn {
  display: flex; align-items: center; gap: 8px;
  margin-top: 20px;
  background: var(--card2);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 10px 16px;
  font-family: 'Saira Condensed', sans-serif;
  font-size: 13px; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--muted);
  cursor: pointer; transition: color 0.15s, border-color 0.15s;
  width: 100%;
  justify-content: center;
}
.grid-export-btn:hover { color: var(--white); border-color: rgba(255,255,255,0.2); }
.grid-export-btn:disabled { opacity: 0.4; cursor: default; }
```

- [ ] **Step 3: Add export functionality to `src/pages/Dashboard/TabGrid.jsx`**

Add the import at the top of the file (after existing imports):

```js
import { getAllCheckinsForExport } from '../../services/checkins'
```

Add the export handler inside the `TabGrid` component (after the existing state declarations):

```js
const [exporting, setExporting] = useState(false)

async function handleExport() {
  setExporting(true)
  try {
    const rows = await getAllCheckinsForExport()
    const header = 'Atleta,Data,Semana\n'
    const csv = header + rows.map(r => `"${r.athlete}",${r.date},${r.week}`).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gdd-checkins-${getLocalDate()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } finally {
    setExporting(false)
  }
}
```

Add the export button at the bottom of the returned JSX, after `.grid-legend`:

```jsx
<button className="grid-export-btn" onClick={handleExport} disabled={exporting}>
  {exporting ? 'A exportar…' : '↓ Exportar CSV'}
</button>
```

- [ ] **Step 4: Verify build passes**

```bash
npm run build 2>&1 | grep -E "(built|error|Error)"
```

Expected: `✓ built in ...ms`

- [ ] **Step 5: Commit**

```bash
git add src/services/checkins.js src/pages/Dashboard/TabGrid.jsx src/pages/Dashboard/TabGrid.css
git commit -m "feat: CSV export of all check-ins from dashboard grid tab"
```

---

## Task 4: Weekly target — config + athlete home display

**Files:**
- Modify: `src/pages/Athlete/TabHome.jsx`
- Modify: `src/pages/CheckIn/StepConfirm.jsx`

- [ ] **Step 1: Update `src/pages/Athlete/TabHome.jsx` to show weekly target**

Replace the entire file:

```jsx
import { useState, useEffect } from 'react'
import {
  getCheckinsForAthlete,
  hasCheckedInToday,
  addCheckin,
  getSessionCountForAthleteThisWeek,
} from '../../services/checkins'
import { getConfig } from '../../services/config'
import { getLocalDate } from '../../lib/dates'
import { enqueueCheckin, getPendingQueue, removeFromQueue } from '../../lib/offline'

export default function TabHome({ athlete }) {
  const [total, setTotal]           = useState(null)
  const [weekCount, setWeekCount]   = useState(null)
  const [weeklyTarget, setWeeklyTarget] = useState(null)
  const [lastCheckin, setLastCheckin]   = useState(null)
  const [checkedIn, setCheckedIn]   = useState(false)
  const [checking, setChecking]     = useState(false)
  const [offline, setOffline]       = useState(!navigator.onLine)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    const online  = () => { setOffline(false); syncQueue() }
    const offline = () => setOffline(true)
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline) }
  }, [])

  async function syncQueue() {
    const pending = getPendingQueue()
    for (const item of pending) {
      try {
        await addCheckin(item.athleteId, item.athleteName)
        removeFromQueue(item.id)
      } catch { /* will retry next time */ }
    }
  }

  async function load() {
    const today = getLocalDate()
    const [all, wc, already, cfg] = await Promise.all([
      getCheckinsForAthlete(athlete.id),
      getSessionCountForAthleteThisWeek(athlete.id, today),
      hasCheckedInToday(athlete.id),
      getConfig(),
    ])
    setTotal(all.length)
    setWeekCount(wc)
    setCheckedIn(already)
    setWeeklyTarget(cfg.weeklyTarget)
    if (all.length > 0) setLastCheckin(all[0].date)
    setLoading(false)
  }

  useEffect(() => { load().catch(() => setLoading(false)) }, [athlete.id])

  async function handleCheckin() {
    if (checking || checkedIn) return
    setChecking(true)
    try {
      if (navigator.onLine) {
        await addCheckin(athlete.id, athlete.name)
      } else {
        enqueueCheckin({ athleteId: athlete.id, athleteName: athlete.name, date: getLocalDate() })
      }
      setCheckedIn(true)
      setWeekCount(c => (c || 0) + 1)
      setTotal(t => (t || 0) + 1)
      setLastCheckin(getLocalDate())
    } catch {
      enqueueCheckin({ athleteId: athlete.id, athleteName: athlete.name, date: getLocalDate() })
      setCheckedIn(true)
      setWeekCount(c => (c || 0) + 1)
    } finally { setChecking(false) }
  }

  const firstName = athlete.name.split(' ')[0]

  if (loading) return <p className="loading-state">A carregar…</p>

  return (
    <>
      {offline && (
        <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 4, padding: '10px 14px', marginBottom: 16, fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'var(--amber)' }}>
          Sem ligação — o check-in será sincronizado quando voltares a estar online.
        </div>
      )}

      <div className="home-greeting">
        <p className="home-greeting-sub">Bem-vindo de volta</p>
        <h1 className="home-greeting-name">{firstName}</h1>
      </div>

      <div className="home-stats">
        <div className="home-stat">
          <div className="home-stat-number" style={{ color: 'var(--red)' }}>
            {weeklyTarget
              ? `${weekCount ?? 0}/${weeklyTarget}`
              : weekCount ?? '—'}
          </div>
          <div className="home-stat-label">{weeklyTarget ? 'Objetivo semanal' : 'Esta semana'}</div>
        </div>
        <div className="home-stat">
          <div className="home-stat-number" style={{ color: 'var(--white)' }}>
            {total ?? '—'}
          </div>
          <div className="home-stat-label">Total sessões</div>
        </div>
      </div>

      {weeklyTarget && weekCount !== null && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--muted)' }}>
            <span>PROGRESSO SEMANAL</span>
            <span style={{ color: weekCount >= weeklyTarget ? 'var(--green)' : 'var(--white)' }}>
              {weekCount >= weeklyTarget ? '✓ Objetivo atingido' : `Faltam ${weeklyTarget - weekCount}`}
            </span>
          </div>
          <div style={{ background: 'var(--card2)', borderRadius: 3, height: 6 }}>
            <div style={{
              background: weekCount >= weeklyTarget ? 'var(--green)' : 'var(--red)',
              width: `${Math.min(100, (weekCount / weeklyTarget) * 100)}%`,
              height: 6, borderRadius: 3, transition: 'width 0.4s ease'
            }} />
          </div>
        </div>
      )}

      {lastCheckin && (
        <div className="home-last-checkin">
          <div>
            <p className="home-last-label">Último check-in</p>
            <p className="home-last-value">
              {new Date(lastCheckin + 'T12:00:00').toLocaleDateString('pt-PT', {
                weekday: 'long', day: 'numeric', month: 'long'
              })}
            </p>
          </div>
          <span className="pill pill-green">Check-in</span>
        </div>
      )}

      <div className="home-checkin-btn">
        {checkedIn ? (
          <div className="home-already">
            <span style={{ fontSize: 20 }}>✓</span>
            <p className="home-already-text">Check-in feito hoje!</p>
          </div>
        ) : (
          <button className="btn-primary" onClick={handleCheckin} disabled={checking}>
            {checking ? 'A registar…' : 'Fazer Check-in'}
          </button>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Update `src/pages/CheckIn/StepConfirm.jsx` to show target progress**

Replace the entire file:

```jsx
import { useEffect, useState } from 'react'
import { getSessionCountForAthleteThisWeek } from '../../services/checkins'
import { getConfig } from '../../services/config'
import { getLocalDate } from '../../lib/dates'

export default function StepConfirm({ athlete, onReset }) {
  const [count, setCount]           = useState(null)
  const [weeklyTarget, setWeeklyTarget] = useState(null)
  const [seconds, setSeconds]       = useState(8)

  useEffect(() => {
    Promise.all([
      getSessionCountForAthleteThisWeek(athlete.id, getLocalDate()),
      getConfig(),
    ])
      .then(([c, cfg]) => { setCount(c); setWeeklyTarget(cfg.weeklyTarget) })
      .catch(() => {})
  }, [athlete.id])

  useEffect(() => {
    const t = setInterval(() => setSeconds(s => {
      if (s <= 1) { clearInterval(t); onReset(); return 0 }
      return s - 1
    }), 1000)
    return () => clearInterval(t)
  }, [onReset])

  const now = new Date()
  const timeStr = now.toLocaleString('pt-PT', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon'
  })

  return (
    <div className="confirm-screen">
      <div className="confirm-ring">
        <span className="confirm-checkmark">✓</span>
      </div>

      <h1 className="confirm-title">Check-in<br />Realizado!</h1>
      <p className="confirm-athlete">{athlete.name}</p>
      <p className="confirm-time">{timeStr}</p>

      {count !== null && (
        <div className="confirm-sessions">
          {weeklyTarget
            ? `Esta semana: ${count}/${weeklyTarget} sessões`
            : `Esta semana: ${count} sessão${count !== 1 ? 'ões' : ''} ✓`}
        </div>
      )}

      <div className="confirm-continue">
        <button className="btn-primary" onClick={onReset}>Continuar</button>
      </div>
      <p className="confirm-reset">Reinicia automaticamente em {seconds}s</p>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | grep -E "(built|error|Error)"
```

Expected: `✓ built`

- [ ] **Step 4: Commit**

```bash
git add src/pages/Athlete/TabHome.jsx src/pages/CheckIn/StepConfirm.jsx
git commit -m "feat: weekly target progress bar and offline check-in queuing in athlete home"
```

---

## Task 5: PIN brute-force protection in check-in and athlete login

**Files:**
- Modify: `src/pages/CheckIn/StepPin.jsx`
- Modify: `src/pages/Athlete/AthleteLogin.jsx`

- [ ] **Step 1: Update `src/pages/CheckIn/StepPin.jsx`**

Replace the entire file:

```jsx
import { useState, useEffect } from 'react'
import PinPad from '../../components/PinPad'
import { verifyAthletePin } from '../../services/athletes'
import { hasCheckedInToday } from '../../services/checkins'
import { recordFailedAttempt, isLockedOut, getRemainingSeconds, clearAttempts } from '../../lib/rateLimit'

export default function StepPin({ athlete, onSuccess, onAlreadyCheckedIn, onBack }) {
  const [pinError, setPinError] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [locked, setLocked]     = useState(() => isLockedOut(athlete.id))
  const [remaining, setRemaining] = useState(() => getRemainingSeconds(athlete.id))

  useEffect(() => {
    if (!locked) return
    const t = setInterval(() => {
      const secs = getRemainingSeconds(athlete.id)
      setRemaining(secs)
      if (secs <= 0) { setLocked(false); clearInterval(t) }
    }, 1000)
    return () => clearInterval(t)
  }, [locked, athlete.id])

  async function handlePin(pin) {
    if (loading || locked) return
    setLoading(true)
    setPinError(false)
    try {
      const valid = await verifyAthletePin(athlete.id, pin)
      if (!valid) {
        recordFailedAttempt(athlete.id)
        if (isLockedOut(athlete.id)) {
          setLocked(true)
          setRemaining(getRemainingSeconds(athlete.id))
        } else {
          setPinError(true)
        }
        return
      }
      clearAttempts(athlete.id)
      const alreadyIn = await hasCheckedInToday(athlete.id)
      if (alreadyIn) { onAlreadyCheckedIn(); return }
      onSuccess()
    } catch {
      setPinError(true)
    } finally {
      setLoading(false)
    }
  }

  const firstName = athlete.name.split(' ')[0]

  return (
    <div className="pin-screen">
      <div className="pin-header">
        <div className="gdd-logo-wordmark" style={{ fontSize: 28 }}>GDD</div>
        <div style={{ height: 1, background: 'var(--border)', margin: '16px 0 20px' }} />
        <p className="pin-greeting">Olá, <span>{firstName}!</span></p>
        <p className="pin-label">Insere o teu PIN de 4 dígitos</p>
      </div>

      <div className="pin-body">
        {locked ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
            <p style={{ fontFamily: 'Saira Condensed, sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', marginBottom: 8 }}>
              Bloqueado
            </p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--muted)' }}>
              Demasiadas tentativas. Tenta novamente em
            </p>
            <p style={{ fontFamily: 'Saira Condensed, sans-serif', fontSize: 32, fontWeight: 700, color: 'var(--white)', marginTop: 8 }}>
              {remaining}s
            </p>
          </div>
        ) : (
          <>
            {pinError && (
              <p className="error-banner" style={{ marginBottom: 20 }}>
                PIN incorreto — tenta novamente
              </p>
            )}
            <PinPad onComplete={handlePin} error={pinError} />
          </>
        )}
      </div>

      <button className="pin-back" onClick={onBack}>← Voltar à lista</button>
    </div>
  )
}
```

- [ ] **Step 2: Update `src/pages/Athlete/AthleteLogin.jsx` — add rate limiting and first-time PIN setup**

Replace the entire file:

```jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PinPad from '../../components/PinPad'
import { getAthletes, verifyAthletePin, athleteHasPinSet, setFirstTimePin } from '../../services/athletes'
import { recordFailedAttempt, isLockedOut, getRemainingSeconds, clearAttempts } from '../../lib/rateLimit'

export default function AthleteLogin({ onLogin }) {
  const navigate = useNavigate()
  const [step, setStep]         = useState('name') // 'name' | 'pin' | 'setpin' | 'setpin-confirm'
  const [athletes, setAthletes] = useState([])
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [pinError, setPinError] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [locked, setLocked]     = useState(false)
  const [remaining, setRemaining] = useState(0)
  const [newPin, setNewPin]     = useState('')

  useEffect(() => {
    getAthletes().then(setAthletes).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!locked) return
    const t = setInterval(() => {
      const secs = selected ? getRemainingSeconds(selected.id) : 0
      setRemaining(secs)
      if (secs <= 0) { setLocked(false); clearInterval(t) }
    }, 1000)
    return () => clearInterval(t)
  }, [locked, selected])

  const filtered = search.length > 0
    ? athletes.filter(a => a.name.toLowerCase().includes(search.toLowerCase()))
    : []

  async function handleSelect(a) {
    setSelected(a)
    if (isLockedOut(a.id)) {
      setLocked(true)
      setRemaining(getRemainingSeconds(a.id))
      setStep('pin')
      return
    }
    const hasPinSet = await athleteHasPinSet(a.id)
    setStep(hasPinSet ? 'pin' : 'setpin')
  }

  async function handlePin(pin) {
    if (verifying || locked) return
    setVerifying(true)
    setPinError(false)
    try {
      const valid = await verifyAthletePin(selected.id, pin)
      if (!valid) {
        recordFailedAttempt(selected.id)
        if (isLockedOut(selected.id)) {
          setLocked(true)
          setRemaining(getRemainingSeconds(selected.id))
        } else {
          setPinError(true)
        }
        return
      }
      clearAttempts(selected.id)
      onLogin({ id: selected.id, name: selected.name })
    } catch { setPinError(true) }
    finally { setVerifying(false) }
  }

  async function handleSetPin(pin) {
    setNewPin(pin)
    setStep('setpin-confirm')
  }

  async function handleConfirmPin(pin) {
    if (pin !== newPin) {
      setPinError(true)
      setStep('setpin')
      setNewPin('')
      return
    }
    setVerifying(true)
    try {
      await setFirstTimePin(selected.id, pin)
      onLogin({ id: selected.id, name: selected.name })
    } catch { setPinError(true) }
    finally { setVerifying(false) }
  }

  return (
    <div className="athlete-login-page">
      <div className="splash-bg" />
      <div className="splash-noise" />
      <div className="athlete-login-content">

        <div className="gdd-logo-block">
          <div className="gdd-logo-wordmark">GDD</div>
          <div className="gdd-logo-sub">Performance</div>
          <div className="gdd-tagline">A tua área pessoal</div>
          <div className="gdd-divider" />
        </div>

        {step === 'name' && (
          <div className="name-section">
            {loading && <p className="loading-state">A carregar…</p>}
            {!loading && (
              <>
                <input
                  className="search-input"
                  placeholder="Pesquisa o teu nome…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoComplete="off"
                  autoFocus
                />
                <div className="athlete-list">
                  {search.length === 0 && <p className="athlete-empty">Começa a escrever o teu nome…</p>}
                  {search.length > 0 && filtered.length === 0 && <p className="athlete-empty">Atleta não encontrado.</p>}
                  {filtered.map(a => (
                    <button key={a.id} className="athlete-item" onClick={() => handleSelect(a)}>{a.name}</button>
                  ))}
                </div>
                <button className="btn-secondary" style={{ marginTop: 8 }} onClick={() => navigate('/')}>
                  ← Voltar ao check-in
                </button>
              </>
            )}
          </div>
        )}

        {(step === 'pin') && selected && (
          <div className="pin-screen" style={{ position: 'static', minHeight: 'auto', flex: 1 }}>
            <div className="pin-header">
              <p className="pin-greeting">Olá, <span>{selected.name.split(' ')[0]}!</span></p>
              <p className="pin-label">Insere o teu PIN</p>
            </div>
            <div className="pin-body">
              {locked ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🔒</div>
                  <p style={{ fontFamily: 'Saira Condensed, sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', marginBottom: 6 }}>Bloqueado</p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--muted)', marginBottom: 6 }}>Tenta novamente em</p>
                  <p style={{ fontFamily: 'Saira Condensed, sans-serif', fontSize: 28, fontWeight: 700, color: 'var(--white)' }}>{remaining}s</p>
                </div>
              ) : (
                <>
                  {pinError && <p className="error-banner" style={{ marginBottom: 20 }}>PIN incorreto — tenta novamente</p>}
                  <PinPad onComplete={handlePin} error={pinError} />
                </>
              )}
            </div>
            <button className="pin-back" onClick={() => { setSelected(null); setPinError(false); setLocked(false); setStep('name') }}>← Voltar</button>
          </div>
        )}

        {step === 'setpin' && selected && (
          <div className="pin-screen" style={{ position: 'static', minHeight: 'auto', flex: 1 }}>
            <div className="pin-header">
              <p className="pin-greeting">Olá, <span>{selected.name.split(' ')[0]}!</span></p>
              <p className="pin-label">Define o teu PIN pessoal</p>
            </div>
            <div className="pin-body">
              {pinError && <p className="error-banner" style={{ marginBottom: 20 }}>Os PINs não coincidem — tenta novamente</p>}
              <PinPad onComplete={handleSetPin} error={pinError} />
            </div>
            <button className="pin-back" onClick={() => { setSelected(null); setStep('name') }}>← Voltar</button>
          </div>
        )}

        {step === 'setpin-confirm' && selected && (
          <div className="pin-screen" style={{ position: 'static', minHeight: 'auto', flex: 1 }}>
            <div className="pin-header">
              <p className="pin-greeting" style={{ fontSize: 28 }}>Confirma o<br /><span>teu PIN</span></p>
              <p className="pin-label">Repete o PIN que escolheste</p>
            </div>
            <div className="pin-body">
              {pinError && <p className="error-banner" style={{ marginBottom: 20 }}>Os PINs não coincidem — tenta novamente</p>}
              <PinPad onComplete={handleConfirmPin} error={pinError} />
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | grep -E "(built|error|Error)"
```

Expected: `✓ built`

- [ ] **Step 4: Commit**

```bash
git add src/pages/CheckIn/StepPin.jsx src/pages/Athlete/AthleteLogin.jsx
git commit -m "feat: PIN brute-force protection (5 attempts → 30s lockout) and first-time PIN setup"
```

---

## Task 6: Admin panel — shell + athlete management

**Files:**
- Create: `src/pages/Admin/index.jsx`
- Create: `src/pages/Admin/Admin.css`
- Create: `src/pages/Admin/TabAthletes.jsx`
- Create: `src/pages/Admin/TabSettings.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create `src/pages/Admin/Admin.css`**

```css
.admin-page {
  min-height: 100dvh; display: flex; flex-direction: column;
  background: var(--dark); max-width: 768px; margin: 0 auto;
}

/* Header */
.admin-header {
  padding: 16px 20px;
  display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid var(--border);
  position: sticky; top: 0; background: var(--dark); z-index: 10;
}
.admin-brand { display: flex; align-items: baseline; gap: 6px; }
.admin-brand-name {
  font-family: 'Saira Condensed', sans-serif;
  font-size: 22px; font-weight: 800;
  letter-spacing: 0.04em; text-transform: uppercase;
  color: var(--red);
}
.admin-brand-sub {
  font-family: 'Saira Condensed', sans-serif;
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.2em; text-transform: uppercase;
  background: var(--red); color: var(--white);
  padding: 2px 6px; border-radius: 2px;
}
.admin-logout {
  background: transparent; border: 1px solid var(--border);
  color: var(--muted); font-family: 'Saira Condensed', sans-serif;
  font-size: 13px; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; cursor: pointer;
  padding: 6px 14px; border-radius: 4px;
  transition: color 0.15s, border-color 0.15s;
}
.admin-logout:hover { color: var(--white); border-color: rgba(255,255,255,0.2); }

/* Tabs */
.admin-tabs {
  display: flex; border-bottom: 1px solid var(--border);
  background: var(--card); padding: 0 16px;
}
.admin-tab {
  background: none; border: none; color: var(--muted);
  padding: 14px 18px;
  font-family: 'Saira Condensed', sans-serif;
  font-size: 14px; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  cursor: pointer; white-space: nowrap;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}
.admin-tab.active { color: var(--white); border-bottom-color: var(--red); }

.admin-content { flex: 1; padding: 20px; overflow-y: auto; }

/* Athlete list */
.admin-athlete-row {
  display: flex; align-items: center; gap: 12px;
  background: var(--card); border: 1px solid var(--border);
  border-radius: 4px; padding: 12px 16px; margin-bottom: 6px;
}
.admin-athlete-name {
  flex: 1; font-family: 'Inter', sans-serif;
  font-size: 14px; font-weight: 500; color: var(--white);
}
.admin-athlete-pos {
  font-family: 'Inter', sans-serif;
  font-size: 12px; color: var(--muted);
}
.admin-athlete-row.inactive { opacity: 0.45; }

.admin-action-btn {
  background: none; border: 1px solid var(--border);
  color: var(--muted); border-radius: 4px;
  padding: 5px 10px;
  font-family: 'Saira Condensed', sans-serif;
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
  cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.admin-action-btn:hover { color: var(--white); border-color: rgba(255,255,255,0.25); }
.admin-action-btn.danger:hover { color: #F87171; border-color: rgba(200,16,46,0.4); }

/* Add athlete form */
.admin-add-form {
  background: var(--card); border: 1px solid var(--border);
  border-radius: 4px; padding: 16px; margin-bottom: 20px;
}
.admin-form-title {
  font-family: 'Saira Condensed', sans-serif;
  font-size: 16px; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--white); margin-bottom: 12px;
}
.admin-input {
  width: 100%; background: var(--card2);
  border: 1px solid var(--border); border-radius: 4px;
  padding: 10px 14px; font-family: 'Inter', sans-serif;
  font-size: 14px; color: var(--white); outline: none;
  margin-bottom: 8px; transition: border-color 0.15s;
}
.admin-input:focus { border-color: rgba(200,16,46,0.5); }
.admin-input::placeholder { color: var(--muted); }

/* PIN reveal card */
.pin-reveal {
  background: var(--green-bg); border: 1px solid rgba(0,200,83,0.2);
  border-radius: 4px; padding: 14px 16px; margin-bottom: 16px;
}
.pin-reveal-label {
  font-family: 'Inter', sans-serif; font-size: 12px;
  color: var(--muted); letter-spacing: 0.06em;
  text-transform: uppercase; margin-bottom: 4px;
}
.pin-reveal-pin {
  font-family: 'Saira Condensed', sans-serif;
  font-size: 32px; font-weight: 700; color: var(--green);
  letter-spacing: 0.2em;
}
.pin-reveal-name {
  font-family: 'Inter', sans-serif; font-size: 13px;
  color: var(--muted); margin-top: 2px;
}

/* Settings */
.admin-setting-row {
  display: flex; align-items: center; gap: 16px;
  background: var(--card); border: 1px solid var(--border);
  border-radius: 4px; padding: 16px; margin-bottom: 12px;
}
.admin-setting-label {
  flex: 1; font-family: 'Inter', sans-serif;
  font-size: 14px; font-weight: 500; color: var(--white);
}
.admin-setting-sub {
  font-family: 'Inter', sans-serif; font-size: 12px; color: var(--muted);
}
.admin-number-input {
  width: 72px; background: var(--card2);
  border: 1px solid var(--border); border-radius: 4px;
  padding: 8px 12px; text-align: center;
  font-family: 'Saira Condensed', sans-serif;
  font-size: 20px; font-weight: 700; color: var(--white);
  outline: none; transition: border-color 0.15s;
}
.admin-number-input:focus { border-color: rgba(200,16,46,0.5); }
```

- [ ] **Step 2: Create `src/pages/Admin/TabAthletes.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { getAllAthletes, addAthlete, deactivateAthlete, reactivateAthlete, resetAthletePin } from '../../services/athletes'

export default function TabAthletes() {
  const [athletes, setAthletes] = useState([])
  const [loading, setLoading]   = useState(true)
  const [name, setName]         = useState('')
  const [position, setPosition] = useState('')
  const [adding, setAdding]     = useState(false)
  const [newPin, setNewPin]     = useState(null) // { pin, athleteName }
  const [showInactive, setShowInactive] = useState(false)

  async function load() {
    const all = await getAllAthletes()
    setAthletes(all)
    setLoading(false)
  }
  useEffect(() => { load().catch(() => setLoading(false)) }, [])

  async function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    setAdding(true)
    try {
      const pin = await addAthlete({ name: name.trim(), position: position.trim() })
      setNewPin({ pin, athleteName: name.trim() })
      setName('')
      setPosition('')
      await load()
    } finally { setAdding(false) }
  }

  async function handleDeactivate(id) {
    if (!confirm('Desativar este atleta?')) return
    await deactivateAthlete(id)
    await load()
  }

  async function handleReactivate(id) {
    await reactivateAthlete(id)
    await load()
  }

  async function handleReset(id, athleteName) {
    if (!confirm(`Resetar PIN de ${athleteName}?`)) return
    const pin = await resetAthletePin(id)
    setNewPin({ pin, athleteName })
  }

  const visible = athletes.filter(a => showInactive ? true : a.active !== false)

  if (loading) return <p className="loading-state">A carregar…</p>

  return (
    <>
      {newPin && (
        <div className="pin-reveal">
          <p className="pin-reveal-label">PIN gerado — guarda antes de fechar</p>
          <p className="pin-reveal-pin">{newPin.pin}</p>
          <p className="pin-reveal-name">{newPin.athleteName}</p>
          <button
            style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--muted)', fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer' }}
            onClick={() => setNewPin(null)}
          >
            Fechar ×
          </button>
        </div>
      )}

      <form className="admin-add-form" onSubmit={handleAdd}>
        <p className="admin-form-title">Adicionar atleta</p>
        <input
          className="admin-input"
          placeholder="Nome completo *"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <input
          className="admin-input"
          placeholder="Posição (opcional)"
          value={position}
          onChange={e => setPosition(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={adding || !name.trim()}>
          {adding ? 'A adicionar…' : '+ Adicionar'}
        </button>
      </form>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={{ fontFamily: 'Saira Condensed, sans-serif', fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          {visible.length} atleta{visible.length !== 1 ? 's' : ''}
        </p>
        <button
          style={{ background: 'none', border: 'none', color: 'var(--muted)', fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer' }}
          onClick={() => setShowInactive(v => !v)}
        >
          {showInactive ? 'Ocultar inativos' : 'Mostrar inativos'}
        </button>
      </div>

      {visible.map(a => (
        <div key={a.id} className={`admin-athlete-row${a.active === false ? ' inactive' : ''}`}>
          <div style={{ flex: 1 }}>
            <p className="admin-athlete-name">{a.name}</p>
            {a.position && <p className="admin-athlete-pos">{a.position}</p>}
          </div>
          {a.active === false ? (
            <button className="admin-action-btn" onClick={() => handleReactivate(a.id)}>Reativar</button>
          ) : (
            <>
              <button className="admin-action-btn" onClick={() => handleReset(a.id, a.name)}>Reset PIN</button>
              <button className="admin-action-btn danger" onClick={() => handleDeactivate(a.id)}>Desativar</button>
            </>
          )}
        </div>
      ))}
    </>
  )
}
```

- [ ] **Step 3: Create `src/pages/Admin/TabSettings.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { getConfig, setWeeklyTarget } from '../../services/config'

export default function TabSettings() {
  const [target, setTarget]   = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  useEffect(() => {
    getConfig()
      .then(cfg => { setTarget(cfg.weeklyTarget ?? ''); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      const val = target === '' ? null : Number(target)
      await setWeeklyTarget(val)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  if (loading) return <p className="loading-state">A carregar…</p>

  return (
    <>
      <form onSubmit={handleSave}>
        <div className="admin-setting-row">
          <div style={{ flex: 1 }}>
            <p className="admin-setting-label">Objetivo semanal de sessões</p>
            <p className="admin-setting-sub">Mostrado a todos os atletas na sua área pessoal. Deixa em branco para desativar.</p>
          </div>
          <input
            className="admin-number-input"
            type="number"
            min="1"
            max="14"
            value={target}
            onChange={e => setTarget(e.target.value)}
            placeholder="—"
          />
        </div>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'A guardar…' : saved ? '✓ Guardado' : 'Guardar configurações'}
        </button>
      </form>
    </>
  )
}
```

- [ ] **Step 4: Create `src/pages/Admin/index.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PinPad from '../../components/PinPad'
import { verifyStaffPin } from '../../services/config'
import TabAthletes from './TabAthletes'
import TabSettings from './TabSettings'
import { STAFF_SESSION_KEY } from '../Staff'
import './Admin.css'

const TABS = [
  { key: 'athletes', label: 'Atletas' },
  { key: 'settings', label: 'Configurações' },
]

export default function Admin() {
  const navigate  = useNavigate()
  const [authed, setAuthed]     = useState(() => !!sessionStorage.getItem(STAFF_SESSION_KEY))
  const [activeTab, setActiveTab] = useState('athletes')
  const [pinError, setPinError] = useState(false)
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

  function logout() {
    sessionStorage.removeItem(STAFF_SESSION_KEY)
    navigate('/staff')
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
        <button className="admin-logout" onClick={logout}>Sair</button>
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
```

- [ ] **Step 5: Add `/admin` route to `src/App.jsx`**

Replace the entire file:

```jsx
import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

const CheckIn   = lazy(() => import('./pages/CheckIn'))
const Staff     = lazy(() => import('./pages/Staff'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Athlete   = lazy(() => import('./pages/Athlete'))
const Admin     = lazy(() => import('./pages/Admin'))

function PageLoader() {
  return <div style={{ minHeight: '100dvh', background: 'var(--dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <p style={{ fontFamily: 'Saira Condensed, sans-serif', fontSize: 18, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
      GDD
    </p>
  </div>
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/"          element={<CheckIn />} />
        <Route path="/staff"     element={<Staff />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/athlete"   element={<Athlete />} />
        <Route path="/admin"     element={<Admin />} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
```

- [ ] **Step 6: Verify build**

```bash
npm run build 2>&1 | grep -E "(built|error|Error|warn)"
```

Expected: `✓ built` — multiple chunk files now (code-split by route).

- [ ] **Step 7: Run all tests**

```bash
npx vitest run
```

Expected: all 20 tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/pages/Admin/ src/App.jsx
git commit -m "feat: admin panel (athlete CRUD + weekly target config) + code splitting with React.lazy"
```

---

## Task 7: Deploy everything

- [ ] **Step 1: Production build**

```bash
npm run build 2>&1 | grep -E "(built|warn|error)"
```

Expected: `✓ built` with multiple smaller chunks.

- [ ] **Step 2: Deploy**

```bash
npx firebase-tools@latest deploy
```

Expected: hosting + firestore rules deployed.

- [ ] **Step 3: Smoke test the admin panel**

Open https://gdd-gym.web.app/admin in the browser:
- Enter staff PIN `3847` → should see Admin panel with Atletas + Configurações tabs
- Atletas tab: Duarte Diniz listed, with "Reset PIN" and "Desativar" buttons
- Add a test athlete → a PIN is revealed → athlete appears in list
- Configurações tab: set weekly target to 3 → save → open athlete area → should show 0/3 progress bar

- [ ] **Step 4: Smoke test brute-force protection**

Open https://gdd-gym.web.app → select Duarte Diniz → enter wrong PIN 5 times → should see lockout screen with countdown.

- [ ] **Step 5: Smoke test first-time PIN**

In Firebase console, set a new athlete's `pinSet` to `false` (or add a new athlete via admin panel) → open `/athlete` → select that athlete → should see "Define o teu PIN" screen instead of PIN entry.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: deploy all improvements — admin, offline queue, rate limiting, code splitting"
```

---

## Self-Review Notes

**Spec coverage:**
- ✅ Admin panel — TabAthletes (add/deactivate/reset), TabSettings (weekly target)
- ✅ CSV export — getAllCheckinsForExport + download button in TabGrid
- ✅ Weekly target — getConfig in TabHome + progress bar, StepConfirm shows X/Y
- ✅ First-time PIN setup — athleteHasPinSet check in AthleteLogin, setFirstTimePin service
- ✅ Offline check-in queue — offline.js with enqueue/sync, integrated in TabHome
- ✅ Brute-force protection — rateLimit.js (5 attempts/30s), in StepPin + AthleteLogin
- ✅ Code splitting — React.lazy + Suspense in App.jsx, PageLoader fallback

**Type consistency verified:**
- `addAthlete({ name, position })` → returns `rawPin: string`
- `resetAthletePin(athleteId)` → returns `rawPin: string`
- `setFirstTimePin(athleteId, newPin)` → void
- `getConfig()` → `{ weeklyTarget: number | null }`
- `setWeeklyTarget(target)` → void
- `getAllCheckinsForExport()` → `[{ athlete, date, week }]`
- `enqueueCheckin(item)` / `getPendingQueue()` / `removeFromQueue(id)` / `clearQueue()` — all consistent
- `recordFailedAttempt(id)` / `isLockedOut(id)` / `getRemainingSeconds(id)` / `clearAttempts(id)` — all consistent
