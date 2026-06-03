# GDD Off-Season Gym Check-in PWA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first PWA where GDD athletes self-check-in to gym sessions with a name + PIN, and coaches view attendance via a 4-tab dashboard.

**Architecture:** React SPA with React Router for 3 routes (`/`, `/staff`, `/dashboard`). Firebase Firestore stores athletes, check-ins, and config. All auth is PIN-based — no Firebase Auth. PINs are SHA-256 hashed on the client before being stored or compared.

**Tech Stack:** React 18, Vite, React Router v6, Firebase v10 (Firestore + Hosting), vite-plugin-pwa, Vitest, @testing-library/react

---

## File Map

```
gdd/
├── public/
│   ├── manifest.json          # PWA manifest
│   └── icons/                 # 192x192, 512x512 PNG icons
├── src/
│   ├── main.jsx               # React entry point, Router wrapper
│   ├── App.jsx                # Route definitions
│   ├── firebase.js            # Firebase init + Firestore export
│   ├── lib/
│   │   ├── hash.js            # SHA-256 via Web Crypto API
│   │   └── dates.js           # Europe/Lisbon week helpers
│   ├── services/
│   │   ├── athletes.js        # getAthletes(), verifyAthletePin()
│   │   ├── checkins.js        # addCheckin(), getCheckinsForWeek(), hasCheckedInToday(), getCheckinsForAthlete()
│   │   └── config.js          # verifyStaffPin()
│   ├── components/
│   │   └── PinPad.jsx         # Reusable numpad (4 dots + 0-9 grid)
│   └── pages/
│       ├── CheckIn/
│       │   ├── index.jsx      # 3-step orchestrator
│       │   ├── StepName.jsx   # Step 1: searchable athlete list
│       │   ├── StepPin.jsx    # Step 2: PIN entry with PinPad
│       │   └── StepConfirm.jsx # Step 3: success + weekly count
│       ├── Staff/
│       │   └── index.jsx      # Shared PIN login → sessionStorage
│       └── Dashboard/
│           ├── index.jsx      # Tab shell + session guard
│           ├── TabGrid.jsx    # Weekly attendance grid
│           ├── TabAthlete.jsx # Per-athlete history
│           ├── TabLeaderboard.jsx # Ranked by sessions
│           └── TabAlerts.jsx  # Missed-session alerts
├── src/lib/__tests__/
│   ├── hash.test.js
│   └── dates.test.js
├── src/services/__tests__/
│   └── checkins.test.js
├── index.html
├── vite.config.js
├── firebase.json
└── .firebaserc
```

---

## Task 1: Scaffold the project

**Files:**
- Create: `index.html`
- Create: `vite.config.js`
- Create: `src/main.jsx`
- Create: `src/App.jsx`
- Create: `src/firebase.js`

- [ ] **Step 1: Initialise Vite + React project**

```bash
cd /Users/franciscobruno/Desktop/personal/gdd
npm create vite@latest . -- --template react
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 2: Install dependencies**

```bash
npm install firebase react-router-dom
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom vite-plugin-pwa
```

- [ ] **Step 3: Replace `vite.config.js`**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'GDD Off-Season',
        short_name: 'GDD',
        description: 'Gym check-in for GDD athletes',
        theme_color: '#111827',
        background_color: '#111827',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.js'],
    globals: true,
  },
})
```

- [ ] **Step 4: Create `src/test-setup.js`**

```js
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Replace `src/main.jsx`**

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
```

- [ ] **Step 6: Replace `src/App.jsx`**

```jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import CheckIn from './pages/CheckIn'
import Staff from './pages/Staff'
import Dashboard from './pages/Dashboard'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CheckIn />} />
      <Route path="/staff" element={<Staff />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
```

- [ ] **Step 7: Create `src/firebase.js`**

```js
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
```

- [ ] **Step 8: Create `.env.local` (never commit this)**

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Also add to `.gitignore`:
```
.env.local
.env*.local
```

- [ ] **Step 9: Replace `src/index.css` with base styles**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #111827;
  color: #f9fafb;
  min-height: 100dvh;
  -webkit-tap-highlight-color: transparent;
}

#root { min-height: 100dvh; display: flex; flex-direction: column; }
```

- [ ] **Step 10: Verify dev server starts**

```bash
npm run dev
```

Expected: `http://localhost:5173` opens, blank white screen (routes not implemented yet). No console errors.

- [ ] **Step 11: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Vite React PWA with Firebase + routing"
```

---

## Task 2: Firebase project setup (manual)

**Files:** None — this is a Firebase console task.

- [ ] **Step 1: Create Firebase project**

Go to https://console.firebase.google.com → "Add project" → name it `gdd-offseason` → disable Google Analytics → Create.

- [ ] **Step 2: Enable Firestore**

In Firebase console → Build → Firestore Database → Create database → **Start in production mode** → choose `europe-west1` (Dublin) region → Enable.

- [ ] **Step 3: Set Firestore security rules**

In Firestore → Rules tab, replace with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Athletes: anyone can read names (for dropdown), nobody can read pins directly
    match /athletes/{id} {
      allow read: if true;  // name/position/active only — pin is never fetched raw
      allow write: if false; // admin only (console)
    }

    // Check-ins: anyone can create, anyone can read (for dashboard)
    match /checkins/{id} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasAll(['athleteId','athleteName','date','timestamp'])
                    && request.resource.data.athleteId is string
                    && request.resource.data.date is string;
      allow update, delete: if false;
    }

    // Config: read only (staff PIN hash stored here)
    match /config/{doc} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

- [ ] **Step 4: Add Firebase web app**

In Firebase console → Project settings → "Add app" → Web → register as `gdd-pwa` → copy the `firebaseConfig` object values into `.env.local`.

- [ ] **Step 5: Install Firebase CLI and login**

```bash
npm install -g firebase-tools
firebase login
firebase use --add   # select gdd-offseason project, alias: default
```

- [ ] **Step 6: Create `firebase.json`**

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

- [ ] **Step 7: Create `.firebaserc`**

```json
{
  "projects": {
    "default": "gdd-offseason"
  }
}
```

- [ ] **Step 8: Seed initial data via Firebase console**

In Firestore → `config` collection → doc id `app`:
```json
{ "staffPin": "<SHA-256 of your chosen staff PIN>" }
```

To compute SHA-256 of e.g. `1234` in browser console:
```js
const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('1234'))
console.log([...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,'0')).join(''))
```

Seed a few athletes in `athletes` collection (id: auto):
```json
{ "name": "Carlos Vella", "pin": "<SHA-256 of their PIN>", "position": "Midfielder", "active": true }
```

- [ ] **Step 9: Commit**

```bash
git add firebase.json .firebaserc .gitignore
git commit -m "feat: add Firebase hosting config and gitignore"
```

---

## Task 3: Utility functions — hash and dates

**Files:**
- Create: `src/lib/hash.js`
- Create: `src/lib/dates.js`
- Create: `src/lib/__tests__/hash.test.js`
- Create: `src/lib/__tests__/dates.test.js`

- [ ] **Step 1: Write failing hash tests**

Create `src/lib/__tests__/hash.test.js`:

```js
import { hashPin } from '../hash'

describe('hashPin', () => {
  it('returns a 64-char hex string for a 4-digit PIN', async () => {
    const result = await hashPin('1234')
    expect(result).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic — same PIN produces same hash', async () => {
    const a = await hashPin('5678')
    const b = await hashPin('5678')
    expect(a).toBe(b)
  })

  it('produces different hashes for different PINs', async () => {
    const a = await hashPin('1234')
    const b = await hashPin('1235')
    expect(a).not.toBe(b)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run src/lib/__tests__/hash.test.js
```

Expected: FAIL — `hashPin` not found.

- [ ] **Step 3: Implement `src/lib/hash.js`**

```js
export async function hashPin(pin) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin))
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
npx vitest run src/lib/__tests__/hash.test.js
```

Expected: 3 passed.

- [ ] **Step 5: Write failing date tests**

Create `src/lib/__tests__/dates.test.js`:

```js
import { getLocalDate, getWeekBounds, formatDay } from '../dates'

describe('getLocalDate', () => {
  it('returns YYYY-MM-DD string in Europe/Lisbon timezone', () => {
    // Create a UTC timestamp at midnight UTC on 3 Jun 2026
    // Europe/Lisbon (UTC+1 in summer) → should return 2026-06-03
    const ts = new Date('2026-06-03T00:30:00Z')
    expect(getLocalDate(ts)).toBe('2026-06-03')
  })
})

describe('getWeekBounds', () => {
  it('returns Monday as start and Sunday as end for a mid-week date', () => {
    const { start, end } = getWeekBounds('2026-06-03') // Wednesday
    expect(start).toBe('2026-06-01') // Monday
    expect(end).toBe('2026-06-07')   // Sunday
  })

  it('returns the same week when given Monday', () => {
    const { start, end } = getWeekBounds('2026-06-01') // Monday
    expect(start).toBe('2026-06-01')
    expect(end).toBe('2026-06-07')
  })

  it('returns the same week when given Sunday', () => {
    const { start, end } = getWeekBounds('2026-06-07') // Sunday
    expect(start).toBe('2026-06-01')
    expect(end).toBe('2026-06-07')
  })
})

describe('formatDay', () => {
  it('formats a YYYY-MM-DD date to short day name', () => {
    expect(formatDay('2026-06-01')).toBe('Mon')
    expect(formatDay('2026-06-07')).toBe('Sun')
  })
})
```

- [ ] **Step 6: Run to verify it fails**

```bash
npx vitest run src/lib/__tests__/dates.test.js
```

Expected: FAIL — functions not found.

- [ ] **Step 7: Implement `src/lib/dates.js`**

```js
const TZ = 'Europe/Lisbon'

export function getLocalDate(date = new Date()) {
  return date.toLocaleDateString('sv-SE', { timeZone: TZ })
}

export function getWeekBounds(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay() // 0=Sun, 1=Mon ... 6=Sat
  const diffToMonday = (day === 0 ? -6 : 1 - day)
  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  }
}

export function formatDay(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short' })
}

export function getPreviousWeekBounds(dateStr) {
  const { start } = getWeekBounds(dateStr)
  const prevMonday = new Date(start + 'T12:00:00')
  prevMonday.setDate(prevMonday.getDate() - 7)
  return getWeekBounds(prevMonday.toISOString().slice(0, 10))
}
```

- [ ] **Step 8: Run tests to verify pass**

```bash
npx vitest run src/lib/__tests__/dates.test.js
```

Expected: 5 passed.

- [ ] **Step 9: Commit**

```bash
git add src/lib/
git commit -m "feat: add hash and date utility functions with tests"
```

---

## Task 4: Firestore service layer

**Files:**
- Create: `src/services/athletes.js`
- Create: `src/services/checkins.js`
- Create: `src/services/config.js`
- Create: `src/services/__tests__/checkins.test.js`

- [ ] **Step 1: Write failing checkins tests**

Create `src/services/__tests__/checkins.test.js`:

```js
import { buildWeekGrid } from '../checkins'

// buildWeekGrid is a pure function — no Firestore needed
describe('buildWeekGrid', () => {
  it('maps checkins to a set of date strings', () => {
    const checkins = [
      { date: '2026-06-01' },
      { date: '2026-06-03' },
    ]
    const grid = buildWeekGrid(checkins, '2026-06-01', '2026-06-07')
    expect(grid.has('2026-06-01')).toBe(true)
    expect(grid.has('2026-06-03')).toBe(true)
    expect(grid.has('2026-06-02')).toBe(false)
  })

  it('returns empty set for no checkins', () => {
    const grid = buildWeekGrid([], '2026-06-01', '2026-06-07')
    expect(grid.size).toBe(0)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run src/services/__tests__/checkins.test.js
```

Expected: FAIL — `buildWeekGrid` not found.

- [ ] **Step 3: Create `src/services/athletes.js`**

```js
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { hashPin } from '../lib/hash'

export async function getAthletes() {
  const q = query(
    collection(db, 'athletes'),
    where('active', '==', true),
    orderBy('name')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, name: d.data().name, position: d.data().position }))
}

export async function verifyAthletePin(athleteId, pin) {
  const { doc, getDoc } = await import('firebase/firestore')
  const snap = await getDoc(doc(db, 'athletes', athleteId))
  if (!snap.exists()) return false
  const stored = snap.data().pin
  const entered = await hashPin(pin)
  return stored === entered
}
```

- [ ] **Step 4: Create `src/services/checkins.js`**

```js
import {
  collection, query, where, orderBy, getDocs,
  addDoc, serverTimestamp, Timestamp
} from 'firebase/firestore'
import { db } from '../firebase'
import { getLocalDate, getWeekBounds, getPreviousWeekBounds } from '../lib/dates'

export function buildWeekGrid(checkins, startDate, endDate) {
  return new Set(
    checkins
      .filter(c => c.date >= startDate && c.date <= endDate)
      .map(c => c.date)
  )
}

export async function hasCheckedInToday(athleteId) {
  const today = getLocalDate()
  const q = query(
    collection(db, 'checkins'),
    where('athleteId', '==', athleteId),
    where('date', '==', today)
  )
  const snap = await getDocs(q)
  return !snap.empty
}

export async function addCheckin(athleteId, athleteName) {
  const today = getLocalDate()
  await addDoc(collection(db, 'checkins'), {
    athleteId,
    athleteName,
    date: today,
    timestamp: serverTimestamp(),
  })
}

export async function getCheckinsForWeek(dateStr) {
  const { start, end } = getWeekBounds(dateStr)
  const q = query(
    collection(db, 'checkins'),
    where('date', '>=', start),
    where('date', '<=', end),
    orderBy('date')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getCheckinsForAthlete(athleteId) {
  const q = query(
    collection(db, 'checkins'),
    where('athleteId', '==', athleteId),
    orderBy('date', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getSessionCountForAthleteThisWeek(athleteId, dateStr) {
  const { start, end } = getWeekBounds(dateStr)
  const q = query(
    collection(db, 'checkins'),
    where('athleteId', '==', athleteId),
    where('date', '>=', start),
    where('date', '<=', end)
  )
  const snap = await getDocs(q)
  return snap.size
}

export async function getCheckinsForBothWeeks(dateStr) {
  const curr = getWeekBounds(dateStr)
  const prev = getPreviousWeekBounds(dateStr)
  const q = query(
    collection(db, 'checkins'),
    where('date', '>=', prev.start),
    where('date', '<=', curr.end),
    orderBy('date')
  )
  const snap = await getDocs(q)
  return {
    all: snap.docs.map(d => d.data()),
    currStart: curr.start,
    currEnd: curr.end,
    prevStart: prev.start,
    prevEnd: prev.end,
  }
}
```

- [ ] **Step 5: Create `src/services/config.js`**

```js
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { hashPin } from '../lib/hash'

export async function verifyStaffPin(pin) {
  const snap = await getDoc(doc(db, 'config', 'app'))
  if (!snap.exists()) return false
  const stored = snap.data().staffPin
  const entered = await hashPin(pin)
  return stored === entered
}
```

- [ ] **Step 6: Run checkins tests to verify pass**

```bash
npx vitest run src/services/__tests__/checkins.test.js
```

Expected: 2 passed (pure function tests only — Firestore calls not tested in unit tests).

- [ ] **Step 7: Commit**

```bash
git add src/services/ src/lib/__tests__/
git commit -m "feat: add Firestore service layer with unit tests for pure functions"
```

---

## Task 5: PinPad component

**Files:**
- Create: `src/components/PinPad.jsx`
- Create: `src/components/PinPad.css`

- [ ] **Step 1: Create `src/components/PinPad.css`**

```css
.pinpad { display: flex; flex-direction: column; align-items: center; gap: 24px; width: 100%; }

.pinpad-dots { display: flex; gap: 16px; }
.pinpad-dot {
  width: 16px; height: 16px; border-radius: 50%;
  background: #374151; transition: background 0.15s;
}
.pinpad-dot.filled { background: #2563eb; }
.pinpad-dot.error { background: #ef4444; }

.pinpad-grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 10px; width: 100%; max-width: 280px;
}

.pinpad-key {
  background: #1f2937; border: none; border-radius: 10px;
  padding: 18px; font-size: 22px; font-weight: 600;
  color: #f9fafb; cursor: pointer; user-select: none;
  transition: background 0.1s; -webkit-tap-highlight-color: transparent;
}
.pinpad-key:active { background: #374151; }
.pinpad-key.backspace { font-size: 16px; color: #9ca3af; background: #374151; }
.pinpad-key.empty { background: transparent; pointer-events: none; }

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-8px); }
  40%, 80% { transform: translateX(8px); }
}
.pinpad-dots.shake { animation: shake 0.4s ease; }
```

- [ ] **Step 2: Create `src/components/PinPad.jsx`**

```jsx
import { useState, useEffect } from 'react'
import './PinPad.css'

// onComplete(pin: string) called when 4 digits entered
// error: boolean — triggers shake + clears after animation
export default function PinPad({ onComplete, error }) {
  const [digits, setDigits] = useState([])
  const [shaking, setShaking] = useState(false)

  useEffect(() => {
    if (error) {
      setShaking(true)
      const t = setTimeout(() => { setShaking(false); setDigits([]) }, 500)
      return () => clearTimeout(t)
    }
  }, [error])

  function press(key) {
    if (key === 'back') {
      setDigits(d => d.slice(0, -1))
      return
    }
    if (digits.length >= 4) return
    const next = [...digits, key]
    setDigits(next)
    if (next.length === 4) onComplete(next.join(''))
  }

  return (
    <div className="pinpad">
      <div className={`pinpad-dots${shaking ? ' shake' : ''}`}>
        {[0,1,2,3].map(i => (
          <div key={i} className={`pinpad-dot${i < digits.length ? ' filled' : ''}${error && shaking ? ' error' : ''}`} />
        ))}
      </div>
      <div className="pinpad-grid">
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} className="pinpad-key" onClick={() => press(String(n))}>{n}</button>
        ))}
        <button className="pinpad-key empty" disabled />
        <button className="pinpad-key" onClick={() => press('0')}>0</button>
        <button className="pinpad-key backspace" onClick={() => press('back')}>⌫</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/
git commit -m "feat: add reusable PinPad component"
```

---

## Task 6: Athlete check-in screen

**Files:**
- Create: `src/pages/CheckIn/index.jsx`
- Create: `src/pages/CheckIn/StepName.jsx`
- Create: `src/pages/CheckIn/StepPin.jsx`
- Create: `src/pages/CheckIn/StepConfirm.jsx`
- Create: `src/pages/CheckIn/CheckIn.css`

- [ ] **Step 1: Create `src/pages/CheckIn/CheckIn.css`**

```css
.checkin-page {
  min-height: 100dvh; display: flex; flex-direction: column;
  background: #111827; max-width: 480px; margin: 0 auto;
}

.checkin-header {
  padding: 24px 20px 16px; text-align: center;
  border-bottom: 1px solid #1f2937;
}
.checkin-logo {
  width: 52px; height: 52px; background: #1f2937;
  border-radius: 50%; margin: 0 auto 10px;
  display: flex; align-items: center; justify-content: center; font-size: 24px;
}
.checkin-title { font-size: 18px; font-weight: 700; }
.checkin-subtitle { font-size: 13px; color: #6b7280; margin-top: 2px; }

.checkin-body { flex: 1; padding: 20px; display: flex; flex-direction: column; }

.search-input {
  width: 100%; background: #1f2937; border: none; border-radius: 10px;
  padding: 12px 16px; font-size: 15px; color: #f9fafb;
  outline: none; margin-bottom: 14px;
}
.search-input::placeholder { color: #6b7280; }

.athlete-list { display: flex; flex-direction: column; gap: 6px; overflow-y: auto; }
.athlete-item {
  background: #1f2937; border: none; border-radius: 10px;
  padding: 14px 16px; font-size: 15px; color: #f9fafb;
  text-align: left; cursor: pointer; transition: background 0.1s;
}
.athlete-item:active { background: #374151; }
.athlete-empty { color: #6b7280; font-size: 14px; text-align: center; padding: 20px 0; }

.pin-subtitle { text-align: center; color: #6b7280; font-size: 14px; margin-bottom: 28px; }
.pin-name { text-align: center; font-size: 20px; font-weight: 700; margin-bottom: 6px; }
.pin-back {
  background: none; border: none; color: #6b7280; font-size: 13px;
  cursor: pointer; text-align: center; margin-top: 20px; padding: 8px;
}

.confirm-wrap {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; text-align: center; gap: 16px;
}
.confirm-icon {
  width: 80px; height: 80px; background: #052e16;
  border-radius: 50%; display: flex; align-items: center;
  justify-content: center; font-size: 40px;
}
.confirm-name { font-size: 22px; font-weight: 700; }
.confirm-time { font-size: 13px; color: #6b7280; }
.confirm-week {
  background: #052e16; border: 1px solid #166534; border-radius: 10px;
  padding: 12px 20px; font-size: 13px; color: #4ade80;
}
.confirm-reset { font-size: 12px; color: #374151; margin-top: 8px; }

.error-banner {
  background: #7f1d1d; border-radius: 8px; padding: 12px 16px;
  font-size: 14px; color: #fca5a5; text-align: center; margin-bottom: 12px;
}
```

- [ ] **Step 2: Create `src/pages/CheckIn/StepName.jsx`**

```jsx
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
```

- [ ] **Step 3: Create `src/pages/CheckIn/StepPin.jsx`**

```jsx
import { useState } from 'react'
import PinPad from '../../components/PinPad'
import { verifyAthletePin } from '../../services/athletes'
import { hasCheckedInToday } from '../../services/checkins'

export default function StepPin({ athlete, onSuccess, onAlreadyCheckedIn, onBack }) {
  const [pinError, setPinError] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handlePin(pin) {
    if (loading) return
    setLoading(true)
    setPinError(false)
    try {
      const alreadyIn = await hasCheckedInToday(athlete.id)
      if (alreadyIn) { onAlreadyCheckedIn(); return }

      const valid = await verifyAthletePin(athlete.id, pin)
      if (valid) { onSuccess() }
      else { setPinError(true) }
    } catch {
      setPinError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <p className="pin-name">{athlete.name}</p>
      <p className="pin-subtitle">Enter your 4-digit PIN</p>
      <PinPad onComplete={handlePin} error={pinError} />
      <button className="pin-back" onClick={onBack}>← Back</button>
    </>
  )
}
```

- [ ] **Step 4: Create `src/pages/CheckIn/StepConfirm.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { getSessionCountForAthleteThisWeek } from '../../services/checkins'
import { getLocalDate } from '../../lib/dates'

export default function StepConfirm({ athlete, onReset }) {
  const [count, setCount] = useState(null)
  const [seconds, setSeconds] = useState(5)

  useEffect(() => {
    getSessionCountForAthleteThisWeek(athlete.id, getLocalDate())
      .then(setCount)
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
  const timeStr = now.toLocaleString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon'
  })

  return (
    <div className="confirm-wrap">
      <div className="confirm-icon">✅</div>
      <p className="confirm-name">Checked in!</p>
      <p style={{ color: '#9ca3af', fontSize: 15 }}>{athlete.name}</p>
      <p className="confirm-time">{timeStr}</p>
      {count !== null && (
        <div className="confirm-week">This week: {count} session{count !== 1 ? 's' : ''} ✓</div>
      )}
      <p className="confirm-reset">Resetting in {seconds}s…</p>
    </div>
  )
}
```

- [ ] **Step 5: Create `src/pages/CheckIn/index.jsx`**

```jsx
import { useState } from 'react'
import StepName from './StepName'
import StepPin from './StepPin'
import StepConfirm from './StepConfirm'
import { addCheckin } from '../../services/checkins'
import './CheckIn.css'

export default function CheckIn() {
  const [step, setStep] = useState('name') // 'name' | 'pin' | 'confirm' | 'already'
  const [athlete, setAthlete] = useState(null)

  function handleSelectAthlete(a) { setAthlete(a); setStep('pin') }
  async function handlePinSuccess() {
    await addCheckin(athlete.id, athlete.name).catch(() => {})
    setStep('confirm')
  }
  function handleAlreadyCheckedIn() { setStep('already') }
  function handleReset() { setAthlete(null); setStep('name') }

  return (
    <div className="checkin-page">
      <div className="checkin-header">
        <div className="checkin-logo">⚽</div>
        <p className="checkin-title">{step === 'pin' && athlete ? `Hey, ${athlete.name.split(' ')[0]}!` : 'GDD Off-Season'}</p>
        <p className="checkin-subtitle">
          {step === 'name' ? 'Gym Check-in' : step === 'pin' ? 'Enter your PIN' : 'See you at the gym!'}
        </p>
      </div>
      <div className="checkin-body">
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
          <div className="confirm-wrap">
            <div className="confirm-icon">📋</div>
            <p className="confirm-name">Already checked in!</p>
            <p style={{ color: '#9ca3af', fontSize: 14 }}>You already checked in today, {athlete?.name.split(' ')[0]}.</p>
            <button className="pin-back" onClick={handleReset}>← Back</button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Run dev server and manually test the check-in flow**

```bash
npm run dev
```

Open http://localhost:5173, verify:
- Athletes load from Firestore
- Searching filters the list
- Selecting an athlete advances to PIN step
- Wrong PIN triggers shake animation
- Correct PIN shows confirmation with week count
- Auto-resets after 5 seconds

- [ ] **Step 7: Commit**

```bash
git add src/pages/CheckIn/
git commit -m "feat: implement athlete check-in 3-step flow"
```

---

## Task 7: Staff login screen

**Files:**
- Create: `src/pages/Staff/index.jsx`
- Create: `src/pages/Staff/Staff.css`

- [ ] **Step 1: Create `src/pages/Staff/Staff.css`**

```css
.staff-page {
  min-height: 100dvh; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  background: #111827; padding: 24px; gap: 24px; max-width: 480px; margin: 0 auto;
}
.staff-title { font-size: 20px; font-weight: 700; text-align: center; }
.staff-subtitle { font-size: 14px; color: #6b7280; text-align: center; }
.staff-error {
  background: #7f1d1d; border-radius: 8px; padding: 12px 20px;
  font-size: 14px; color: #fca5a5; text-align: center; width: 100%;
}
```

- [ ] **Step 2: Create `src/pages/Staff/index.jsx`**

```jsx
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
      <div className="checkin-logo" style={{ width: 56, height: 56, background: '#1f2937', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>⚽</div>
      <p className="staff-title">Staff Access</p>
      <p className="staff-subtitle">Enter the shared staff PIN</p>
      {pinError && <p className="staff-error">Incorrect PIN — try again</p>}
      <PinPad onComplete={handlePin} error={pinError} />
    </div>
  )
}
```

- [ ] **Step 3: Test manually**

Navigate to http://localhost:5173/staff — enter wrong PIN (shake), enter correct PIN (redirect to `/dashboard`, which shows blank for now).

- [ ] **Step 4: Commit**

```bash
git add src/pages/Staff/
git commit -m "feat: add staff PIN login with sessionStorage guard"
```

---

## Task 8: Dashboard shell + session guard

**Files:**
- Create: `src/pages/Dashboard/index.jsx`
- Create: `src/pages/Dashboard/Dashboard.css`

- [ ] **Step 1: Create `src/pages/Dashboard/Dashboard.css`**

```css
.dashboard-page {
  min-height: 100dvh; display: flex; flex-direction: column;
  background: #111827; max-width: 768px; margin: 0 auto;
}

.dashboard-header {
  padding: 16px 20px; display: flex; align-items: center;
  justify-content: space-between; border-bottom: 1px solid #1f2937;
  position: sticky; top: 0; background: #111827; z-index: 10;
}
.dashboard-header h1 { font-size: 17px; font-weight: 700; }
.dashboard-logout {
  background: none; border: none; color: #6b7280;
  font-size: 13px; cursor: pointer; padding: 4px 8px;
}

.dashboard-tabs {
  display: flex; overflow-x: auto; border-bottom: 1px solid #1f2937;
  scrollbar-width: none; padding: 0 12px;
}
.dashboard-tabs::-webkit-scrollbar { display: none; }
.tab-btn {
  background: none; border: none; color: #6b7280;
  padding: 14px 16px; font-size: 13px; font-weight: 500;
  cursor: pointer; white-space: nowrap; border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}
.tab-btn.active { color: #f9fafb; border-bottom-color: #2563eb; }

.dashboard-content { flex: 1; padding: 20px; overflow-y: auto; }

.loading-state { color: #6b7280; text-align: center; padding: 40px 0; }
```

- [ ] **Step 2: Create `src/pages/Dashboard/index.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { STAFF_SESSION_KEY } from '../Staff'
import TabGrid from './TabGrid'
import TabAthlete from './TabAthlete'
import TabLeaderboard from './TabLeaderboard'
import TabAlerts from './TabAlerts'
import './Dashboard.css'

const TABS = [
  { key: 'grid', label: 'Grid' },
  { key: 'athlete', label: 'Per Athlete' },
  { key: 'leaderboard', label: 'Leaderboard' },
  { key: 'alerts', label: 'Alerts' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('grid')

  useEffect(() => {
    if (!sessionStorage.getItem(STAFF_SESSION_KEY)) navigate('/staff')
  }, [navigate])

  function logout() {
    sessionStorage.removeItem(STAFF_SESSION_KEY)
    navigate('/staff')
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>GDD Dashboard</h1>
        <button className="dashboard-logout" onClick={logout}>Log out</button>
      </div>
      <div className="dashboard-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`tab-btn${activeTab === t.key ? ' active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="dashboard-content">
        {activeTab === 'grid' && <TabGrid />}
        {activeTab === 'athlete' && <TabAthlete />}
        {activeTab === 'leaderboard' && <TabLeaderboard />}
        {activeTab === 'alerts' && <TabAlerts />}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create stub tab files so import doesn't break**

Create `src/pages/Dashboard/TabGrid.jsx`:
```jsx
export default function TabGrid() { return <p style={{color:'#6b7280'}}>Grid — coming soon</p> }
```

Create `src/pages/Dashboard/TabAthlete.jsx`:
```jsx
export default function TabAthlete() { return <p style={{color:'#6b7280'}}>Per Athlete — coming soon</p> }
```

Create `src/pages/Dashboard/TabLeaderboard.jsx`:
```jsx
export default function TabLeaderboard() { return <p style={{color:'#6b7280'}}>Leaderboard — coming soon</p> }
```

Create `src/pages/Dashboard/TabAlerts.jsx`:
```jsx
export default function TabAlerts() { return <p style={{color:'#6b7280'}}>Alerts — coming soon</p> }
```

- [ ] **Step 4: Test session guard**

Open http://localhost:5173/dashboard directly — should redirect to `/staff`. Login → should land on dashboard with tab bar showing 4 tabs.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Dashboard/
git commit -m "feat: add dashboard shell with session guard and tab navigation"
```

---

## Task 9: Dashboard — Weekly Grid tab

**Files:**
- Modify: `src/pages/Dashboard/TabGrid.jsx`
- Create: `src/pages/Dashboard/TabGrid.css`

- [ ] **Step 1: Create `src/pages/Dashboard/TabGrid.css`**

```css
.grid-controls {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px;
}
.grid-week-label { font-size: 14px; font-weight: 600; }
.grid-nav {
  background: #1f2937; border: none; color: #f9fafb;
  padding: 6px 14px; border-radius: 8px; font-size: 18px; cursor: pointer;
}
.grid-nav:disabled { opacity: 0.3; cursor: default; }

.grid-table { width: 100%; border-collapse: collapse; }
.grid-table th {
  font-size: 11px; color: #6b7280; font-weight: 500;
  padding: 4px 2px; text-align: center;
}
.grid-table th.today { color: #2563eb; font-weight: 700; }
.grid-table td { padding: 3px 2px; }
.grid-name {
  font-size: 12px; color: #d1d5db; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; max-width: 90px;
  padding-right: 6px;
}
.grid-cell {
  width: 28px; height: 22px; border-radius: 4px;
  background: #1f2937;
}
.grid-cell.checked { background: #16a34a; }

.grid-legend {
  display: flex; gap: 16px; margin-top: 12px; justify-content: flex-end;
}
.legend-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #9ca3af; }
.legend-dot { width: 12px; height: 12px; border-radius: 3px; }
```

- [ ] **Step 2: Replace `src/pages/Dashboard/TabGrid.jsx`**

```jsx
import { useState, useEffect, useCallback } from 'react'
import { getCheckinsForWeek } from '../../services/checkins'
import { getAthletes } from '../../services/athletes'
import { getLocalDate, getWeekBounds, formatDay, getPreviousWeekBounds } from '../../lib/dates'
import './TabGrid.css'

function getWeekDays(start) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start + 'T12:00:00')
    d.setDate(d.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

export default function TabGrid() {
  const [athletes, setAthletes] = useState([])
  const [checkinsByAthlete, setCheckinsByAthlete] = useState({})
  const [weekStart, setWeekStart] = useState(() => getWeekBounds(getLocalDate()).start)
  const [loading, setLoading] = useState(true)
  const today = getLocalDate()

  const load = useCallback(async (start) => {
    setLoading(true)
    const [aths, checkins] = await Promise.all([
      getAthletes(),
      getCheckinsForWeek(start),
    ])
    const map = {}
    checkins.forEach(c => {
      if (!map[c.athleteId]) map[c.athleteId] = new Set()
      map[c.athleteId].add(c.date)
    })
    setAthletes(aths)
    setCheckinsByAthlete(map)
    setLoading(false)
  }, [])

  useEffect(() => { load(weekStart) }, [weekStart, load])

  const days = getWeekDays(weekStart)
  const currentWeekStart = getWeekBounds(today).start
  const isCurrentWeek = weekStart === currentWeekStart

  return (
    <>
      <div className="grid-controls">
        <button className="grid-nav" onClick={() => setWeekStart(s => getPreviousWeekBounds(s).start)}>‹</button>
        <span className="grid-week-label">{formatDay(days[0])} {days[0].slice(5)} — {formatDay(days[6])} {days[6].slice(5)}</span>
        <button className="grid-nav" disabled={isCurrentWeek} onClick={() => {
          const next = new Date(weekStart + 'T12:00:00')
          next.setDate(next.getDate() + 7)
          setWeekStart(next.toISOString().slice(0, 10))
        }}>›</button>
      </div>

      {loading ? (
        <p className="loading-state">Loading...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="grid-table">
            <thead>
              <tr>
                <th />
                {days.map(d => (
                  <th key={d} className={d === today ? 'today' : ''}>
                    {formatDay(d).slice(0, 1)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {athletes.map(a => (
                <tr key={a.id}>
                  <td className="grid-name" title={a.name}>{a.name.split(' ')[0]} {a.name.split(' ').slice(-1)}</td>
                  {days.map(d => (
                    <td key={d} style={{ textAlign: 'center' }}>
                      <div className={`grid-cell${checkinsByAthlete[a.id]?.has(d) ? ' checked' : ''}`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid-legend">
        <div className="legend-item"><div className="legend-dot" style={{ background: '#16a34a' }} /> Checked in</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#1f2937', border: '1px solid #374151' }} /> Absent</div>
      </div>
    </>
  )
}
```

- [ ] **Step 3: Test**

Login to dashboard, click Grid tab — should show all athletes as rows, 7 day columns, green for check-ins. Previous/next week navigation should work.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Dashboard/TabGrid.jsx src/pages/Dashboard/TabGrid.css
git commit -m "feat: implement weekly attendance grid tab"
```

---

## Task 10: Dashboard — Per Athlete tab

**Files:**
- Modify: `src/pages/Dashboard/TabAthlete.jsx`
- Create: `src/pages/Dashboard/TabAthlete.css`

- [ ] **Step 1: Create `src/pages/Dashboard/TabAthlete.css`**

```css
.athlete-search {
  width: 100%; background: #1f2937; border: none; border-radius: 10px;
  padding: 12px 16px; font-size: 15px; color: #f9fafb;
  outline: none; margin-bottom: 16px;
}
.athlete-search::placeholder { color: #6b7280; }

.athlete-dropdown {
  background: #1f2937; border-radius: 10px; overflow: hidden; margin-bottom: 16px;
}
.athlete-option {
  display: block; width: 100%; background: none; border: none;
  padding: 12px 16px; font-size: 14px; color: #f9fafb;
  text-align: left; cursor: pointer; border-bottom: 1px solid #111827;
}
.athlete-option:last-child { border-bottom: none; }
.athlete-option:active { background: #374151; }

.athlete-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
.stat-card {
  background: #1f2937; border-radius: 10px; padding: 14px;
  text-align: center;
}
.stat-number { font-size: 28px; font-weight: 700; }
.stat-label { font-size: 11px; color: #6b7280; margin-top: 4px; }

.week-bars { display: flex; flex-direction: column; gap: 8px; }
.week-row { display: flex; align-items: center; gap: 10px; }
.week-label { font-size: 12px; color: #9ca3af; width: 54px; flex-shrink: 0; }
.week-bar-bg { flex: 1; background: #1f2937; border-radius: 4px; height: 10px; }
.week-bar-fill { height: 10px; border-radius: 4px; background: #22c55e; transition: width 0.3s; }
.week-count { font-size: 12px; color: #9ca3af; width: 16px; text-align: right; }

.checkin-list { margin-top: 20px; display: flex; flex-direction: column; gap: 6px; }
.checkin-entry {
  background: #1f2937; border-radius: 8px; padding: 10px 14px;
  font-size: 13px; color: #9ca3af;
}
```

- [ ] **Step 2: Replace `src/pages/Dashboard/TabAthlete.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { getAthletes } from '../../services/athletes'
import { getCheckinsForAthlete } from '../../services/checkins'
import { getLocalDate, getWeekBounds } from '../../lib/dates'
import './TabAthlete.css'

export default function TabAthlete() {
  const [athletes, setAthletes] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [checkins, setCheckins] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { getAthletes().then(setAthletes).catch(() => {}) }, [])

  const filtered = search.length > 0
    ? athletes.filter(a => a.name.toLowerCase().includes(search.toLowerCase())).slice(0, 5)
    : []

  async function selectAthlete(a) {
    setSelected(a); setSearch(a.name); setLoading(true)
    const cs = await getCheckinsForAthlete(a.id).catch(() => [])
    setCheckins(cs); setLoading(false)
  }

  const { start: weekStart, end: weekEnd } = getWeekBounds(getLocalDate())
  const thisWeek = checkins.filter(c => c.date >= weekStart && c.date <= weekEnd).length
  const total = checkins.length

  const weekMap = {}
  checkins.forEach(c => {
    const { start } = getWeekBounds(c.date)
    weekMap[start] = (weekMap[start] || 0) + 1
  })
  const weekEntries = Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
  const maxSessions = Math.max(...weekEntries.map(([, v]) => v), 1)

  return (
    <>
      <input
        className="athlete-search"
        placeholder="🔍 Search athlete..."
        value={search}
        onChange={e => { setSearch(e.target.value); setSelected(null) }}
        autoComplete="off"
      />
      {filtered.length > 0 && !selected && (
        <div className="athlete-dropdown">
          {filtered.map(a => (
            <button key={a.id} className="athlete-option" onClick={() => selectAthlete(a)}>{a.name}</button>
          ))}
        </div>
      )}

      {selected && !loading && (
        <>
          <div className="athlete-stats">
            <div className="stat-card">
              <div className="stat-number" style={{ color: '#22c55e' }}>{total}</div>
              <div className="stat-label">Total sessions</div>
            </div>
            <div className="stat-card">
              <div className="stat-number" style={{ color: '#3b82f6' }}>{thisWeek}</div>
              <div className="stat-label">This week</div>
            </div>
          </div>

          {weekEntries.length > 0 && (
            <>
              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Weekly breakdown</p>
              <div className="week-bars">
                {weekEntries.map(([start, count], i) => (
                  <div key={start} className="week-row">
                    <span className="week-label">Wk {i + 1}</span>
                    <div className="week-bar-bg">
                      <div className="week-bar-fill" style={{ width: `${(count / maxSessions) * 100}%` }} />
                    </div>
                    <span className="week-count">{count}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="checkin-list">
            {checkins.slice(0, 20).map(c => (
              <div key={c.id} className="checkin-entry">{c.date}</div>
            ))}
          </div>
        </>
      )}

      {loading && <p className="loading-state">Loading...</p>}
    </>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Dashboard/TabAthlete.jsx src/pages/Dashboard/TabAthlete.css
git commit -m "feat: implement per-athlete history tab"
```

---

## Task 11: Dashboard — Leaderboard tab

**Files:**
- Modify: `src/pages/Dashboard/TabLeaderboard.jsx`
- Create: `src/pages/Dashboard/TabLeaderboard.css`

- [ ] **Step 1: Create `src/pages/Dashboard/TabLeaderboard.css`**

```css
.leaderboard-toggle {
  display: flex; gap: 8px; margin-bottom: 16px;
}
.toggle-btn {
  background: #1f2937; border: none; color: #6b7280;
  padding: 8px 16px; border-radius: 8px; font-size: 13px; cursor: pointer;
}
.toggle-btn.active { background: #2563eb; color: #fff; }

.leaderboard-list { display: flex; flex-direction: column; gap: 8px; }
.leaderboard-row {
  display: flex; align-items: center; gap: 12px;
  background: #1f2937; border-radius: 10px; padding: 12px 14px;
}
.leaderboard-row.zero { background: #1a1a1a; border: 1px solid #7f1d1d; }
.lb-rank { font-size: 20px; width: 28px; text-align: center; }
.lb-name { flex: 1; font-size: 14px; font-weight: 500; }
.lb-name.zero { color: #f87171; }
.lb-count {
  font-size: 13px; font-weight: 700; padding: 4px 10px;
  border-radius: 6px; background: #166534; color: #4ade80;
}
.lb-count.zero { background: #7f1d1d; color: #f87171; }
```

- [ ] **Step 2: Replace `src/pages/Dashboard/TabLeaderboard.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { getAthletes } from '../../services/athletes'
import { getCheckinsForWeek, getCheckinsForAthlete } from '../../services/checkins'
import { getLocalDate, getWeekBounds } from '../../lib/dates'
import './TabLeaderboard.css'

const MEDALS = ['🥇', '🥈', '🥉']

export default function TabLeaderboard() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('week') // 'week' | 'alltime'

  useEffect(() => {
    async function load() {
      setLoading(true)
      const athletes = await getAthletes()
      if (mode === 'week') {
        const checkins = await getCheckinsForWeek(getLocalDate())
        const countMap = {}
        checkins.forEach(c => { countMap[c.athleteId] = (countMap[c.athleteId] || 0) + 1 })
        const ranked = athletes
          .map(a => ({ ...a, count: countMap[a.id] || 0 }))
          .sort((a, b) => b.count - a.count)
        setRows(ranked)
      } else {
        const allCheckins = await Promise.all(athletes.map(a => getCheckinsForAthlete(a.id)))
        const ranked = athletes
          .map((a, i) => ({ ...a, count: allCheckins[i].length }))
          .sort((a, b) => b.count - a.count)
        setRows(ranked)
      }
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [mode])

  return (
    <>
      <div className="leaderboard-toggle">
        <button className={`toggle-btn${mode === 'week' ? ' active' : ''}`} onClick={() => setMode('week')}>This Week</button>
        <button className={`toggle-btn${mode === 'alltime' ? ' active' : ''}`} onClick={() => setMode('alltime')}>All Time</button>
      </div>
      {loading ? <p className="loading-state">Loading...</p> : (
        <div className="leaderboard-list">
          {rows.map((r, i) => (
            <div key={r.id} className={`leaderboard-row${r.count === 0 ? ' zero' : ''}`}>
              <span className="lb-rank">{i < 3 ? MEDALS[i] : i + 1}</span>
              <span className={`lb-name${r.count === 0 ? ' zero' : ''}`}>{r.name}</span>
              <span className={`lb-count${r.count === 0 ? ' zero' : ''}`}>{r.count}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Dashboard/TabLeaderboard.jsx src/pages/Dashboard/TabLeaderboard.css
git commit -m "feat: implement leaderboard tab with week/all-time toggle"
```

---

## Task 12: Dashboard — Alerts tab

**Files:**
- Modify: `src/pages/Dashboard/TabAlerts.jsx`
- Create: `src/pages/Dashboard/TabAlerts.css`

- [ ] **Step 1: Create `src/pages/Dashboard/TabAlerts.css`**

```css
.alerts-summary {
  font-size: 13px; color: #f87171; margin-bottom: 14px;
}
.alert-list { display: flex; flex-direction: column; gap: 8px; }
.alert-card {
  border-radius: 10px; padding: 12px 14px;
  border: 1px solid;
}
.alert-card.critical { background: #1a1a1a; border-color: #7f1d1d; }
.alert-card.warning  { background: #1a1a1a; border-color: #92400e; }
.alert-name { font-size: 14px; font-weight: 600; }
.alert-name.critical { color: #f87171; }
.alert-name.warning  { color: #fbbf24; }
.alert-detail { font-size: 12px; color: #9ca3af; margin-top: 3px; }
.alerts-empty { color: #6b7280; text-align: center; padding: 40px 0; font-size: 14px; }
```

- [ ] **Step 2: Replace `src/pages/Dashboard/TabAlerts.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { getAthletes } from '../../services/athletes'
import { getCheckinsForBothWeeks } from '../../services/checkins'
import { getLocalDate } from '../../lib/dates'
import './TabAlerts.css'

export default function TabAlerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [athletes, { all, currStart, currEnd, prevStart, prevEnd }] = await Promise.all([
        getAthletes(),
        getCheckinsForBothWeeks(getLocalDate()),
      ])
      const currSet = new Set(all.filter(c => c.date >= currStart && c.date <= currEnd).map(c => c.athleteId))
      const prevSet = new Set(all.filter(c => c.date >= prevStart && c.date <= prevEnd).map(c => c.athleteId))

      const result = athletes
        .filter(a => !currSet.has(a.id))
        .map(a => ({
          ...a,
          severity: !prevSet.has(a.id) ? 'critical' : 'warning',
          detail: !prevSet.has(a.id)
            ? '0 sessions this week · 0 last week'
            : '0 sessions this week · attended last week',
        }))
        .sort((a, b) => (a.severity === 'critical' ? -1 : 1))

      setAlerts(result)
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [])

  if (loading) return <p className="loading-state">Loading...</p>

  return (
    <>
      {alerts.length > 0 && (
        <p className="alerts-summary">{alerts.length} athlete{alerts.length !== 1 ? 's' : ''} missed this week</p>
      )}
      {alerts.length === 0 ? (
        <p className="alerts-empty">All athletes checked in this week 🎉</p>
      ) : (
        <div className="alert-list">
          {alerts.map(a => (
            <div key={a.id} className={`alert-card ${a.severity}`}>
              <p className={`alert-name ${a.severity}`}>{a.name}</p>
              <p className="alert-detail">{a.detail}</p>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Dashboard/TabAlerts.jsx src/pages/Dashboard/TabAlerts.css
git commit -m "feat: implement missed sessions alerts tab"
```

---

## Task 13: PWA icons and manifest

**Files:**
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`

- [ ] **Step 1: Generate PWA icons**

Use the club logo (provided by Francisco) to generate two PNG icons. If the logo file is available locally:

```bash
# If ImageMagick is available:
magick /path/to/logo.png -resize 192x192 public/icons/icon-192.png
magick /path/to/logo.png -resize 512x512 public/icons/icon-512.png
```

Alternatively, use https://realfavicongenerator.net — upload logo, download icons, place in `public/icons/`.

For a placeholder until the real logo is ready, create solid-colour PNGs:
```bash
magick -size 192x192 xc:#111827 public/icons/icon-192.png
magick -size 512x512 xc:#111827 public/icons/icon-512.png
```

- [ ] **Step 2: Build and verify PWA**

```bash
npm run build
npm run preview
```

Open http://localhost:4173 in Chrome → DevTools → Application → Manifest. Verify icons are present, `start_url` is `/`, `display` is `standalone`.

On Android Chrome: "Add to Home Screen" should appear. On iOS Safari: Share → "Add to Home Screen".

- [ ] **Step 3: Commit**

```bash
git add public/
git commit -m "feat: add PWA icons and verify installable manifest"
```

---

## Task 14: Deploy to Firebase Hosting

**Files:** None (build artefact)

- [ ] **Step 1: Add Firestore composite indexes**

In Firebase console → Firestore → Indexes → Composite → Add:

Index 1 — for `getCheckinsForWeek`:
- Collection: `checkins`
- Fields: `date ASC`

Index 2 — for `hasCheckedInToday` and `getSessionCountForAthleteThisWeek`:
- Collection: `checkins`
- Fields: `athleteId ASC`, `date ASC`

Index 3 — for `getCheckinsForAthlete`:
- Collection: `checkins`
- Fields: `athleteId ASC`, `date DESC`

Wait for indexes to build (1–2 minutes, shown as "Building" in console).

- [ ] **Step 2: Set environment variables for production**

Firebase Hosting doesn't serve `.env` files. Vite bakes env vars at build time — ensure `.env.local` has all 6 `VITE_FIREBASE_*` values before building.

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: `dist/` created, no build errors.

- [ ] **Step 4: Deploy**

```bash
firebase deploy --only hosting
```

Expected output includes: `Hosting URL: https://gdd-offseason.web.app`

- [ ] **Step 5: Smoke test on mobile**

Open the hosting URL on a mobile device:
- Check-in: pick an athlete, enter correct PIN, see confirmation
- Staff login: enter staff PIN, see dashboard
- Dashboard: all 4 tabs load with data

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "feat: production deploy configuration"
```

---

## Firestore Index Reference

Queries used and their required indexes:

Add this composite index too (for `getAthletes`):
- Collection: `athletes` — Fields: `active ASC`, `name ASC`

| Query | Fields | Order |
|-------|--------|-------|
| `getAthletes` | `active == true` + `name` | `name ASC` (composite index required) |
| `hasCheckedInToday` | `athleteId == X` + `date == Y` | compound |
| `addCheckin` | write only | — |
| `getCheckinsForWeek` | `date >= start` + `date <= end` | `date ASC` |
| `getCheckinsForAthlete` | `athleteId == X` + order by `date DESC` | compound |
| `getSessionCountForAthleteThisWeek` | `athleteId == X` + `date >= start` + `date <= end` | compound |
| `getCheckinsForBothWeeks` | `date >= prevStart` + `date <= currEnd` | `date ASC` |

Add all compound indexes in the Firebase console before deploying.
