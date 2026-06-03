# GDD Gym Slot Booking — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add gym slot booking (3 daily weekday slots) — athletes book from their personal area, staff see bookings and check-in correlation in the dashboard.

**Architecture:** New `bookings` Firestore collection. `lib/slots.js` owns all slot/time logic. `services/bookings.js` owns Firestore ops. Two new tab components (Athlete + Dashboard), one tab registration each, and a lightweight kiosk confirmation badge. No new routes.

**Tech Stack:** React 18, Vite, Firebase Firestore, Vitest, Europe/Lisbon timezone

---

## File Map

```
src/
  lib/
    slots.js                          CREATE — slot definitions + isWeekday/getActiveSlot/isSlotBookable
    __tests__/slots.test.js           CREATE — unit tests (TDD)
  services/
    bookings.js                       CREATE — Firestore CRUD: getBookingsForAthlete, getBookingsForDate,
                                               getBookingsForAthleteOnDate, addBooking, hasBooking,
                                               getCheckinsForDate (new helper)
  pages/
    Athlete/
      TabBookings.jsx                 CREATE — day strip + slot cards + upcoming list
      index.jsx                       MODIFY — add "Reservas" 4th tab with calendar icon
    Dashboard/
      TabBookings.jsx                 CREATE — day strip + per-slot athlete list + check-in correlation
      index.jsx                       MODIFY — add "Reservas" 5th tab
  pages/CheckIn/
    StepConfirm.jsx                   MODIFY — fetch today's bookings, show "Sessão reservada ✓" badge
firestore.rules                       MODIFY — add bookings collection rules
firestore.indexes.json                MODIFY — add 2 composite indexes for bookings
```

---

## Task 1: `lib/slots.js` with TDD

**Files:**
- Create: `src/lib/slots.js`
- Create: `src/lib/__tests__/slots.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/slots.test.js`:

```js
import { isWeekday, getActiveSlot, isSlotBookable, SLOTS, SLOT_ORDER } from '../slots'

describe('isWeekday', () => {
  it('returns true for Monday 2026-06-01', () => expect(isWeekday('2026-06-01')).toBe(true))
  it('returns true for Friday 2026-06-05', () => expect(isWeekday('2026-06-05')).toBe(true))
  it('returns false for Saturday 2026-06-06', () => expect(isWeekday('2026-06-06')).toBe(false))
  it('returns false for Sunday 2026-06-07', () => expect(isWeekday('2026-06-07')).toBe(false))
})

describe('getActiveSlot', () => {
  // UTC+1 in summer (Lisbon WEST)
  it('returns morning at 07:30 Lisbon (06:30 UTC)', () => {
    expect(getActiveSlot(new Date('2026-06-03T06:30:00Z'))).toBe('morning')
  })
  it('returns null at 10:00 Lisbon (09:00 UTC) — between slots', () => {
    expect(getActiveSlot(new Date('2026-06-03T09:00:00Z'))).toBe(null)
  })
  it('returns lunch at 13:00 Lisbon (12:00 UTC)', () => {
    expect(getActiveSlot(new Date('2026-06-03T12:00:00Z'))).toBe('lunch')
  })
  it('returns null at 15:00 Lisbon (14:00 UTC) — after lunch', () => {
    expect(getActiveSlot(new Date('2026-06-03T14:00:00Z'))).toBe(null)
  })
  it('returns evening at 19:00 Lisbon (18:00 UTC)', () => {
    expect(getActiveSlot(new Date('2026-06-03T18:00:00Z'))).toBe('evening')
  })
  it('returns null after 20:00 Lisbon (19:00 UTC)', () => {
    expect(getActiveSlot(new Date('2026-06-03T19:00:00Z'))).toBe(null)
  })
})

describe('isSlotBookable', () => {
  it('returns false for Saturday', () => {
    expect(isSlotBookable('morning', '2026-06-06', new Date('2026-06-06T06:00:00Z'))).toBe(false)
  })
  it('returns false for past day', () => {
    expect(isSlotBookable('morning', '2026-06-01', new Date('2026-06-03T08:00:00Z'))).toBe(false)
  })
  it('returns false for same-day slot already started (morning after 07:00 Lisbon)', () => {
    // 06:30 UTC = 07:30 Lisbon — after 07:00 start
    expect(isSlotBookable('morning', '2026-06-03', new Date('2026-06-03T06:30:00Z'))).toBe(false)
  })
  it('returns true for same-day slot not yet started (lunch before 12:00 Lisbon)', () => {
    // 08:00 UTC = 09:00 Lisbon — before 12:00 lunch start
    expect(isSlotBookable('lunch', '2026-06-03', new Date('2026-06-03T08:00:00Z'))).toBe(true)
  })
  it('returns true for any slot on future weekday', () => {
    // Wednesday 23:00 UTC = Thursday 00:00 Lisbon — Thursday morning is future
    expect(isSlotBookable('morning', '2026-06-04', new Date('2026-06-03T23:00:00Z'))).toBe(true)
  })
})

describe('SLOTS and SLOT_ORDER', () => {
  it('SLOT_ORDER has 3 entries in correct order', () => {
    expect(SLOT_ORDER).toEqual(['morning', 'lunch', 'evening'])
  })
  it('each slot has key, label, start, end', () => {
    for (const key of SLOT_ORDER) {
      expect(SLOTS[key]).toMatchObject({ key, label: expect.any(String), start: expect.any(String), end: expect.any(String) })
    }
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd /Users/franciscobruno/Desktop/personal/gdd && npx vitest run src/lib/__tests__/slots.test.js 2>&1 | tail -5
```
Expected: FAIL — `slots.js` not found.

- [ ] **Step 3: Implement `src/lib/slots.js`**

```js
const TZ = 'Europe/Lisbon'

export const SLOTS = {
  morning: { key: 'morning', label: 'Manhã',  start: '07:00', end: '09:00' },
  lunch:   { key: 'lunch',   label: 'Almoço', start: '12:00', end: '14:00' },
  evening: { key: 'evening', label: 'Tarde',  start: '18:00', end: '20:00' },
}

export const SLOT_ORDER = ['morning', 'lunch', 'evening']

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function nowInLisbonMinutes(now) {
  const str = now.toLocaleTimeString('sv-SE', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
  return toMinutes(str)
}

export function isWeekday(dateStr) {
  const day = new Date(dateStr + 'T12:00:00').getDay()
  return day >= 1 && day <= 5
}

export function getActiveSlot(now = new Date()) {
  const mins = nowInLisbonMinutes(now)
  for (const key of SLOT_ORDER) {
    const s = SLOTS[key]
    if (mins >= toMinutes(s.start) && mins < toMinutes(s.end)) return key
  }
  return null
}

export function isSlotBookable(slotKey, dateStr, now = new Date()) {
  if (!isWeekday(dateStr)) return false
  const todayStr = now.toLocaleDateString('sv-SE', { timeZone: TZ })
  if (dateStr < todayStr) return false
  if (dateStr > todayStr) return true
  // Same day: check if slot start time has passed
  return nowInLisbonMinutes(now) < toMinutes(SLOTS[slotKey].start)
}
```

- [ ] **Step 4: Run tests — must pass**

```bash
npx vitest run src/lib/__tests__/slots.test.js 2>&1 | tail -5
```
Expected: 14 passed.

- [ ] **Step 5: Run all tests**

```bash
npx vitest run 2>&1 | tail -3
```
Expected: 34 passed (20 existing + 14 new).

- [ ] **Step 6: Commit**

```bash
git add src/lib/slots.js src/lib/__tests__/slots.test.js
git commit -m "feat: slot definitions and time helpers with tests (TDD)"
```

---

## Task 2: Firestore rules + indexes + `services/bookings.js`

**Files:**
- Modify: `firestore.rules`
- Modify: `firestore.indexes.json`
- Create: `src/services/bookings.js`

- [ ] **Step 1: Add bookings rules to `firestore.rules`**

Read the file first, then add the `bookings` block inside the `match /databases/{database}/documents` section (after the `config` block):

```
match /bookings/{id} {
  allow read: if true;
  allow create: if request.resource.data.keys().hasAll(['athleteId','athleteName','date','slot','bookedAt'])
                && request.resource.data.athleteId is string
                && request.resource.data.date is string
                && request.resource.data.slot in ['morning','lunch','evening'];
  allow update, delete: if false;
}
```

- [ ] **Step 2: Add composite indexes to `firestore.indexes.json`**

Add two entries to the `indexes` array (preserve existing entries):

```json
{
  "collectionGroup": "bookings",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "athleteId", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "bookings",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "date", "order": "ASCENDING" },
    { "fieldPath": "slot", "order": "ASCENDING" }
  ]
}
```

- [ ] **Step 3: Deploy rules + indexes**

```bash
cd /Users/franciscobruno/Desktop/personal/gdd && npx firebase-tools@latest deploy --only firestore 2>&1 | tail -6
```
Expected: `✔ firestore: released rules` and `✔ firestore: deployed indexes`.

- [ ] **Step 4: Create `src/services/bookings.js`**

```js
import {
  collection, query, where, orderBy, getDocs,
  addDoc, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'

export async function getBookingsForAthlete(athleteId) {
  const q = query(
    collection(db, 'bookings'),
    where('athleteId', '==', athleteId),
    orderBy('date', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getBookingsForDate(dateStr) {
  const q = query(
    collection(db, 'bookings'),
    where('date', '==', dateStr),
    orderBy('slot', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getBookingsForAthleteOnDate(athleteId, dateStr) {
  const q = query(
    collection(db, 'bookings'),
    where('athleteId', '==', athleteId),
    where('date', '==', dateStr)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function hasBooking(athleteId, dateStr, slot) {
  const q = query(
    collection(db, 'bookings'),
    where('athleteId', '==', athleteId),
    where('date', '==', dateStr),
    where('slot', '==', slot)
  )
  const snap = await getDocs(q)
  return !snap.empty
}

export async function addBooking({ athleteId, athleteName, date, slot }) {
  await addDoc(collection(db, 'bookings'), {
    athleteId,
    athleteName,
    date,
    slot,
    bookedAt: serverTimestamp(),
  })
}

export async function getCheckinsForDate(dateStr) {
  const { getDocs: gd, query: q, collection: col, where: w } = await import('firebase/firestore')
  const snap = await gd(q(col(db, 'checkins'), w('date', '==', dateStr)))
  return new Set(snap.docs.map(d => d.data().athleteId))
}
```

**Note:** `getCheckinsForDate` returns a `Set<athleteId>` for O(1) lookup in the staff view.

- [ ] **Step 5: Verify build**

```bash
npm run build 2>&1 | grep -E "(built|error|Error)"
```
Expected: `✓ built`

- [ ] **Step 6: Commit**

```bash
git add firestore.rules firestore.indexes.json src/services/bookings.js
git commit -m "feat: bookings Firestore rules, indexes, and service layer"
```

---

## Task 3: Athlete `TabBookings.jsx`

**Files:**
- Create: `src/pages/Athlete/TabBookings.jsx`
- Modify: `src/pages/Athlete/Athlete.css` (append booking styles)

- [ ] **Step 1: Append booking styles to `src/pages/Athlete/Athlete.css`**

```css
/* ── Booking tab ── */
.booking-day-strip {
  display: flex; gap: 6px; margin-bottom: 20px; overflow-x: auto;
  scrollbar-width: none;
}
.booking-day-strip::-webkit-scrollbar { display: none; }
.booking-day-btn {
  display: flex; flex-direction: column; align-items: center;
  min-width: 52px; padding: 8px 6px; border-radius: 4px;
  background: var(--card2); border: 1px solid var(--border);
  cursor: pointer; transition: all 0.15s;
}
.booking-day-btn.active { background: var(--red); border-color: var(--red); }
.booking-day-btn.dimmed { opacity: 0.4; }
.booking-day-name {
  font-family: 'Saira Condensed', sans-serif;
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--muted);
}
.booking-day-btn.active .booking-day-name { color: rgba(255,255,255,0.8); }
.booking-day-num {
  font-family: 'Saira Condensed', sans-serif;
  font-size: 18px; font-weight: 700; color: var(--white);
  line-height: 1.1;
}

.slot-card {
  background: var(--card); border: 1px solid var(--border);
  border-radius: 4px; padding: 14px 16px;
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 8px;
}
.slot-card.booked { border-color: rgba(0,200,83,0.3); }
.slot-card.closed { opacity: 0.4; }
.slot-card.weekend { opacity: 0.3; }
.slot-info {}
.slot-label {
  font-family: 'Saira Condensed', sans-serif;
  font-size: 16px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.04em; color: var(--white);
}
.slot-time {
  font-family: 'Inter', sans-serif;
  font-size: 12px; color: var(--muted); margin-top: 2px;
}

.slot-book-btn {
  background: var(--red); color: var(--white); border: none;
  border-radius: 4px; padding: 7px 16px;
  font-family: 'Saira Condensed', sans-serif;
  font-size: 12px; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
  cursor: pointer; transition: background 0.15s;
}
.slot-book-btn:active { background: var(--red-dark); }
.slot-book-btn:disabled { opacity: 0.5; cursor: default; }

.slot-status-closed {
  font-family: 'Saira Condensed', sans-serif;
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--muted);
}

.upcoming-section { margin-top: 24px; }
.upcoming-title {
  font-family: 'Saira Condensed', sans-serif;
  font-size: 13px; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--muted); margin-bottom: 10px;
}
.upcoming-item {
  background: var(--card); border: 1px solid var(--border);
  border-radius: 4px; padding: 10px 14px;
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 6px;
}
.upcoming-date {
  font-family: 'Inter', sans-serif; font-size: 13px;
  font-weight: 500; color: var(--white);
}
.upcoming-slot {
  font-family: 'Saira Condensed', sans-serif;
  font-size: 12px; color: var(--muted);
  text-transform: uppercase; letter-spacing: 0.06em;
}
```

- [ ] **Step 2: Create `src/pages/Athlete/TabBookings.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { getBookingsForAthlete, getBookingsForAthleteOnDate, addBooking, hasBooking } from '../../services/bookings'
import { getLocalDate, getWeekBounds } from '../../lib/dates'
import { SLOTS, SLOT_ORDER, isWeekday, isSlotBookable } from '../../lib/slots'

const PT_DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

function getWeekdays(mondayStr) {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(mondayStr + 'T12:00:00')
    d.setDate(d.getDate() + i)
    return d.toLocaleDateString('sv-SE')
  })
}

export default function TabBookings({ athlete }) {
  const today = getLocalDate()
  const { start: monday } = getWeekBounds(today)
  const weekdays = getWeekdays(monday)

  const [selectedDay, setSelectedDay] = useState(today)
  const [allBookings, setAllBookings] = useState([])
  const [booking, setBooking] = useState(null) // slotKey being booked
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getBookingsForAthlete(athlete.id)
      .then(setAllBookings)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [athlete.id])

  // Set of "date|slot" keys the athlete has already booked
  const bookedSet = new Set(allBookings.map(b => `${b.date}|${b.slot}`))

  async function handleBook(slot) {
    if (booking) return
    const already = await hasBooking(athlete.id, selectedDay, slot)
    if (already) {
      setAllBookings(prev => [...prev, { id: Date.now(), athleteId: athlete.id, date: selectedDay, slot }])
      return
    }
    setBooking(slot)
    try {
      await addBooking({ athleteId: athlete.id, athleteName: athlete.name, date: selectedDay, slot })
      setAllBookings(prev => [...prev, { id: Date.now(), athleteId: athlete.id, date: selectedDay, slot }])
    } catch { /* silently fail */ }
    finally { setBooking(null) }
  }

  const now = new Date()
  const upcomingBookings = allBookings
    .filter(b => b.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot))

  if (loading) return <p className="loading-state">A carregar…</p>

  return (
    <>
      {/* Day strip */}
      <div className="booking-day-strip">
        {weekdays.map(dateStr => {
          const d = new Date(dateStr + 'T12:00:00')
          const allPast = SLOT_ORDER.every(s => !isSlotBookable(s, dateStr, now))
          return (
            <button
              key={dateStr}
              className={`booking-day-btn${selectedDay === dateStr ? ' active' : ''}${allPast && dateStr < today ? ' dimmed' : ''}`}
              onClick={() => setSelectedDay(dateStr)}
            >
              <span className="booking-day-name">{PT_DAYS[d.getDay()]}</span>
              <span className="booking-day-num">{d.getDate()}</span>
            </button>
          )
        })}
      </div>

      {/* Slot cards */}
      {!isWeekday(selectedDay) ? (
        <p style={{ color: 'var(--muted)', fontFamily: 'Inter, sans-serif', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
          Sem treinos ao fim de semana.
        </p>
      ) : (
        SLOT_ORDER.map(slotKey => {
          const slot = SLOTS[slotKey]
          const isBooked = bookedSet.has(`${selectedDay}|${slotKey}`)
          const bookable = isSlotBookable(slotKey, selectedDay, now)

          return (
            <div
              key={slotKey}
              className={`slot-card${isBooked ? ' booked' : ''}${!bookable && !isBooked ? ' closed' : ''}`}
            >
              <div className="slot-info">
                <p className="slot-label">{slot.label}</p>
                <p className="slot-time">{slot.start} – {slot.end}</p>
              </div>

              {isBooked ? (
                <span className="pill pill-green">✓ Reservado</span>
              ) : bookable ? (
                <button
                  className="slot-book-btn"
                  onClick={() => handleBook(slotKey)}
                  disabled={booking === slotKey}
                >
                  {booking === slotKey ? '…' : 'Reservar'}
                </button>
              ) : (
                <span className="slot-status-closed">Terminado</span>
              )}
            </div>
          )
        })
      )}

      {/* Upcoming bookings */}
      {upcomingBookings.length > 0 && (
        <div className="upcoming-section">
          <p className="upcoming-title">Próximas Reservas</p>
          {upcomingBookings.map(b => {
            const d = new Date(b.date + 'T12:00:00')
            const dateLabel = d.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'short' })
            const slot = SLOTS[b.slot]
            return (
              <div key={b.id} className="upcoming-item">
                <span className="upcoming-date">{dateLabel}</span>
                <span className="upcoming-slot">{slot.label} · {slot.start}</span>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/franciscobruno/Desktop/personal/gdd && npm run build 2>&1 | grep -E "(built|error|Error)"
```
Expected: `✓ built`

- [ ] **Step 4: Commit**

```bash
git add src/pages/Athlete/TabBookings.jsx src/pages/Athlete/Athlete.css
git commit -m "feat: athlete booking tab — slot cards, day strip, upcoming list"
```

---

## Task 4: Add "Reservas" tab to athlete area

**Files:**
- Modify: `src/pages/Athlete/index.jsx`

- [ ] **Step 1: Update `src/pages/Athlete/index.jsx`**

Add `TabBookings` import after `TabRanking`:
```jsx
import TabBookings from './TabBookings'
```

Add the 4th tab to the `TABS` array (after the ranking entry):
```jsx
  {
    key: 'bookings', label: 'Reservas',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
```

Add the tab content render inside `.athlete-content` (after the ranking line):
```jsx
{activeTab === 'bookings' && <TabBookings athlete={athlete} />}
```

- [ ] **Step 2: Verify build and run tests**

```bash
cd /Users/franciscobruno/Desktop/personal/gdd && npm run build 2>&1 | grep -E "(built|error)" && npx vitest run 2>&1 | tail -3
```
Expected: `✓ built`, 34 passed.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Athlete/index.jsx
git commit -m "feat: add Reservas tab to athlete personal area"
```

---

## Task 5: Staff `Dashboard/TabBookings.jsx`

**Files:**
- Create: `src/pages/Dashboard/TabBookings.jsx`
- Modify: `src/pages/Dashboard/Dashboard.css` (append booking styles)

- [ ] **Step 1: Append booking styles to `src/pages/Dashboard/Dashboard.css`**

```css
/* ── Dashboard booking tab ── */
.db-booking-strip {
  display: flex; gap: 6px; margin-bottom: 20px; overflow-x: auto;
  scrollbar-width: none;
}
.db-booking-strip::-webkit-scrollbar { display: none; }
.db-day-btn {
  display: flex; flex-direction: column; align-items: center;
  min-width: 52px; padding: 8px 6px; border-radius: 4px;
  background: var(--card2); border: 1px solid var(--border);
  cursor: pointer; transition: all 0.15s;
}
.db-day-btn.active { background: var(--red); border-color: var(--red); }
.db-day-btn.past { opacity: 0.5; }
.db-day-name {
  font-family: 'Saira Condensed', sans-serif;
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted);
}
.db-day-btn.active .db-day-name { color: rgba(255,255,255,0.8); }
.db-day-num {
  font-family: 'Saira Condensed', sans-serif;
  font-size: 18px; font-weight: 700; color: var(--white); line-height: 1.1;
}

.db-slot-section {
  background: var(--card); border: 1px solid var(--border);
  border-radius: 4px; margin-bottom: 10px; overflow: hidden;
}
.db-slot-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer; user-select: none;
}
.db-slot-header-left {}
.db-slot-name {
  font-family: 'Saira Condensed', sans-serif;
  font-size: 15px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.04em; color: var(--white);
}
.db-slot-time { font-family: 'Inter', sans-serif; font-size: 12px; color: var(--muted); }
.db-slot-count {
  font-family: 'Saira Condensed', sans-serif;
  font-size: 13px; color: var(--muted); letter-spacing: 0.04em;
}

.db-athlete-list { border-top: 1px solid var(--border); }
.db-athlete-row {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 16px; border-bottom: 1px solid var(--border);
}
.db-athlete-row:last-child { border-bottom: none; }
.db-athlete-dot {
  width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
}
.db-athlete-dot.checked { background: var(--green); }
.db-athlete-dot.pending { background: var(--muted); opacity: 0.5; }
.db-athlete-name {
  flex: 1; font-family: 'Inter', sans-serif;
  font-size: 13px; font-weight: 500; color: var(--white);
}
.db-checkin-badge {
  font-family: 'Saira Condensed', sans-serif;
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
}
.db-checkin-badge.done { color: var(--green); }
.db-checkin-badge.pending { color: var(--muted); }
```

- [ ] **Step 2: Create `src/pages/Dashboard/TabBookings.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { getBookingsForDate, getCheckinsForDate } from '../../services/bookings'
import { getLocalDate, getWeekBounds } from '../../lib/dates'
import { SLOTS, SLOT_ORDER, isWeekday } from '../../lib/slots'

const PT_DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

function getWeekdays(mondayStr) {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(mondayStr + 'T12:00:00')
    d.setDate(d.getDate() + i)
    return d.toLocaleDateString('sv-SE')
  })
}

export default function TabBookings() {
  const today = getLocalDate()
  const { start: monday } = getWeekBounds(today)
  const weekdays = getWeekdays(monday)

  const [selectedDay, setSelectedDay] = useState(today)
  const [bookings, setBookings] = useState([])
  const [checkedInIds, setCheckedInIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({ morning: true, lunch: true, evening: true })

  useEffect(() => {
    setLoading(true)
    const fetchCheckins = selectedDay === today
      ? getCheckinsForDate(selectedDay)
      : Promise.resolve(new Set())

    Promise.all([getBookingsForDate(selectedDay), fetchCheckins])
      .then(([b, c]) => { setBookings(b); setCheckedInIds(c) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedDay, today])

  function toggleSlot(key) {
    setExpanded(e => ({ ...e, [key]: !e[key] }))
  }

  const bySlot = {}
  for (const key of SLOT_ORDER) {
    bySlot[key] = bookings.filter(b => b.slot === key)
      .sort((a, b) => a.athleteName.localeCompare(b.athleteName))
  }

  return (
    <>
      {/* Day strip */}
      <div className="db-booking-strip">
        {weekdays.map(dateStr => {
          const d = new Date(dateStr + 'T12:00:00')
          return (
            <button
              key={dateStr}
              className={`db-day-btn${selectedDay === dateStr ? ' active' : ''}${dateStr < today ? ' past' : ''}`}
              onClick={() => setSelectedDay(dateStr)}
            >
              <span className="db-day-name">{PT_DAYS[d.getDay()]}</span>
              <span className="db-day-num">{d.getDate()}</span>
            </button>
          )
        })}
      </div>

      {loading ? (
        <p className="loading-state">A carregar…</p>
      ) : (
        SLOT_ORDER.map(key => {
          const slot = SLOTS[key]
          const athletes = bySlot[key]
          const isOpen = expanded[key]

          return (
            <div key={key} className="db-slot-section">
              <div className="db-slot-header" onClick={() => toggleSlot(key)}>
                <div className="db-slot-header-left">
                  <p className="db-slot-name">{slot.label}</p>
                  <p className="db-slot-time">{slot.start} – {slot.end}</p>
                </div>
                <span className="db-slot-count">
                  {athletes.length} atleta{athletes.length !== 1 ? 's' : ''} {isOpen ? '▴' : '▾'}
                </span>
              </div>

              {isOpen && athletes.length > 0 && (
                <div className="db-athlete-list">
                  {athletes.map(b => {
                    const didCheckIn = selectedDay === today && checkedInIds.has(b.athleteId)
                    return (
                      <div key={b.id} className="db-athlete-row">
                        <div className={`db-athlete-dot ${didCheckIn ? 'checked' : 'pending'}`} />
                        <span className="db-athlete-name">{b.athleteName}</span>
                        {selectedDay === today && (
                          <span className={`db-checkin-badge ${didCheckIn ? 'done' : 'pending'}`}>
                            {didCheckIn ? 'Check-in ✓' : 'Reservado'}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {isOpen && athletes.length === 0 && (
                <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'var(--muted)' }}>
                    Sem reservas para este slot.
                  </p>
                </div>
              )}
            </div>
          )
        })
      )}
    </>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/franciscobruno/Desktop/personal/gdd && npm run build 2>&1 | grep -E "(built|error|Error)"
```
Expected: `✓ built`

- [ ] **Step 4: Commit**

```bash
git add src/pages/Dashboard/TabBookings.jsx src/pages/Dashboard/Dashboard.css
git commit -m "feat: staff booking overview tab with check-in correlation"
```

---

## Task 6: Add "Reservas" tab to dashboard

**Files:**
- Modify: `src/pages/Dashboard/index.jsx`

- [ ] **Step 1: Update `src/pages/Dashboard/index.jsx`**

Add `TabBookings` import after `TabAlerts`:
```jsx
import TabBookings from './TabBookings'
```

Add 5th entry to `TABS` array:
```jsx
{ key: 'bookings', label: 'Reservas' },
```

Add tab content render inside `.dashboard-content` (after alerts line):
```jsx
{activeTab === 'bookings' && <TabBookings />}
```

- [ ] **Step 2: Verify build and tests**

```bash
cd /Users/franciscobruno/Desktop/personal/gdd && npm run build 2>&1 | grep -E "(built|error)" && npx vitest run 2>&1 | tail -3
```
Expected: `✓ built`, 34 passed.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Dashboard/index.jsx
git commit -m "feat: add Reservas tab to staff dashboard"
```

---

## Task 7: Kiosk check-in booking correlation

**Files:**
- Modify: `src/pages/CheckIn/StepConfirm.jsx`

- [ ] **Step 1: Update `src/pages/CheckIn/StepConfirm.jsx`**

Replace the entire file:

```jsx
import { useEffect, useState } from 'react'
import { getSessionCountForAthleteThisWeek } from '../../services/checkins'
import { getBookingsForAthleteOnDate } from '../../services/bookings'
import { getConfig } from '../../services/config'
import { getLocalDate } from '../../lib/dates'
import { getActiveSlot, SLOTS } from '../../lib/slots'

export default function StepConfirm({ athlete, onReset }) {
  const [count, setCount]               = useState(null)
  const [weeklyTarget, setWeeklyTarget] = useState(null)
  const [bookedSlot, setBookedSlot]     = useState(null)
  const [seconds, setSeconds]           = useState(8)

  useEffect(() => {
    const today = getLocalDate()
    const activeSlot = getActiveSlot()

    Promise.all([
      getSessionCountForAthleteThisWeek(athlete.id, today),
      getConfig(),
      activeSlot ? getBookingsForAthleteOnDate(athlete.id, today) : Promise.resolve([]),
    ])
      .then(([c, cfg, bookings]) => {
        setCount(c)
        setWeeklyTarget(cfg.weeklyTarget)
        if (activeSlot && bookings.some(b => b.slot === activeSlot)) {
          setBookedSlot(activeSlot)
        }
      })
      .catch(() => {})
  }, [athlete.id])

  useEffect(() => {
    const t = setInterval(() => setSeconds(s => {
      if (s <= 1) { clearInterval(t); onReset(); return 0 }
      return s - 1
    }), 1000)
    return () => clearInterval(t)
  }, [onReset])

  const timeStr = new Date().toLocaleString('pt-PT', {
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

      {bookedSlot && (
        <div style={{
          background: 'var(--green-bg)', border: '1px solid rgba(0,200,83,0.2)',
          borderRadius: 4, padding: '10px 20px', marginTop: -8,
          fontFamily: 'Saira Condensed, sans-serif', fontSize: 13, fontWeight: 700,
          letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--green)',
        }}>
          Sessão reservada ✓ — {SLOTS[bookedSlot].label}
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

- [ ] **Step 2: Verify build and tests**

```bash
cd /Users/franciscobruno/Desktop/personal/gdd && npm run build 2>&1 | grep -E "(built|error)" && npx vitest run 2>&1 | tail -3
```
Expected: `✓ built`, 34 passed.

- [ ] **Step 3: Commit**

```bash
git add src/pages/CheckIn/StepConfirm.jsx
git commit -m "feat: show booking confirmation on kiosk check-in when slot matches"
```

---

## Task 8: Fix `getCheckinsForDate` in bookings.js

The Task 2 implementation of `getCheckinsForDate` used a dynamic import which is unnecessary. Replace with a static import pattern consistent with the rest of the service layer.

**Files:**
- Modify: `src/services/bookings.js`

- [ ] **Step 1: Fix `getCheckinsForDate`**

In `src/services/bookings.js`, the current `getCheckinsForDate` uses `await import('firebase/firestore')`. Replace it with a static import. Read the file, then update the imports at the top to add `getDocs as gDocs` alias isn't needed — just add the missing function to the existing import:

The file already imports: `collection, query, where, orderBy, getDocs, addDoc, serverTimestamp`.

Replace the `getCheckinsForDate` function body:

```js
export async function getCheckinsForDate(dateStr) {
  const q = query(
    collection(db, 'checkins'),
    where('date', '==', dateStr)
  )
  const snap = await getDocs(q)
  return new Set(snap.docs.map(d => d.data().athleteId))
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/franciscobruno/Desktop/personal/gdd && npm run build 2>&1 | grep -E "(built|error)"
```
Expected: `✓ built`

- [ ] **Step 3: Commit**

```bash
git add src/services/bookings.js
git commit -m "fix: use static import in getCheckinsForDate"
```

---

## Task 9: Deploy

- [ ] **Step 1: Production build**

```bash
cd /Users/franciscobruno/Desktop/personal/gdd && npm run build 2>&1 | grep -E "(built|warn|error)"
```
Expected: `✓ built` with multiple chunks.

- [ ] **Step 2: Run all tests**

```bash
npx vitest run 2>&1 | tail -5
```
Expected: 34 passed.

- [ ] **Step 3: Deploy**

```bash
npx firebase-tools@latest deploy 2>&1 | tail -8
```
Expected: hosting + firestore rules + firestore indexes deployed.

- [ ] **Step 4: Smoke test athlete booking**

Open https://gdd-gym.web.app/athlete → log in as Duarte Diniz (PIN 2916) → tap "Reservas" tab → verify:
- Day strip shows Mon–Fri current week
- Today's past slots show "Terminado"
- Available slots show red "Reservar" button
- Tapping "Reservar" switches card to "✓ Reservado" (green)
- Booked slot appears in "Próximas Reservas" list

- [ ] **Step 5: Smoke test staff view**

Open https://gdd-gym.web.app/dashboard → staff PIN 3847 → "Reservas" tab → verify:
- Day strip shows Mon–Fri
- Each slot section shows count + athlete list
- Today's section shows "Check-in ✓" / "Reservado" status correctly

- [ ] **Step 6: Final commit**

```bash
git add -A && git commit -m "chore: deploy booking feature to production"
```

---

## Self-Review

**Spec coverage:**
- ✅ 3 fixed weekday slots (morning/lunch/evening) — `SLOTS` in `lib/slots.js`
- ✅ Weekdays only — `isWeekday()` gates rendering in both tab components
- ✅ Bookable until slot start — `isSlotBookable()` used in `TabBookings.jsx`
- ✅ One booking per slot per day — `hasBooking()` called before `addBooking()`
- ✅ No cancellation — Firestore rules have `allow update, delete: if false`
- ✅ No capacity limit — no count check anywhere
- ✅ Athlete "Reservas" tab — Task 3 + 4
- ✅ Staff "Reservas" tab — Task 5 + 6
- ✅ Check-in correlation on staff view — `getCheckinsForDate` + `checkedInIds` Set in `TabBookings.jsx`
- ✅ Kiosk booking badge — `StepConfirm.jsx` Task 7
- ✅ Upcoming bookings list — bottom of athlete `TabBookings.jsx`
- ✅ Firestore indexes — Task 2

**Type consistency:**
- `getBookingsForAthleteOnDate(athleteId, dateStr)` — defined Task 2, used Task 7 ✓
- `getBookingsForDate(dateStr)` — defined Task 2, used Task 5 ✓
- `getCheckinsForDate(dateStr)` — returns `Set<athleteId>`, consumed as `Set` in Task 5 ✓
- `addBooking({ athleteId, athleteName, date, slot })` — defined Task 2, used Task 3 ✓
- `hasBooking(athleteId, dateStr, slot)` — defined Task 2, used Task 3 ✓
- `isSlotBookable(slotKey, dateStr, now)` — defined Task 1, used Task 3 ✓
- `getActiveSlot(now?)` — defined Task 1, used Task 7 ✓
- `isWeekday(dateStr)` — defined Task 1, used Tasks 3 + 5 ✓
- `SLOTS[key]` shape `{ key, label, start, end }` — consistent across all consumers ✓
