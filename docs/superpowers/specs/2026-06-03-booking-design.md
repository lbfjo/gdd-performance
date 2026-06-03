# GDD Performance — Gym Slot Booking Feature Design Spec

**Date:** 2026-06-03
**Status:** Approved

---

## Overview

Athletes can book one of three daily gym slots in advance. S&C coaches see who has booked each slot and track whether booked athletes actually checked in. Booking and check-in remain separate actions but are visually correlated — the kiosk confirmation screen acknowledges an existing booking when one matches the current slot.

---

## Slots

Three fixed weekday slots — not configurable via UI (hardcoded in the app):

| Key | Label | Time |
|-----|-------|------|
| `morning` | Manhã | 07:00–09:00 |
| `lunch` | Almoço | 12:00–14:00 |
| `evening` | Tarde | 18:00–20:00 |

- Available Monday–Friday only. Saturday and Sunday slots are shown as unavailable.
- A slot is bookable until its start time. After 07:00 the morning slot is closed, etc.
- Timezone: `Europe/Lisbon` for all time comparisons.

---

## Booking Rules

- **One booking per athlete per slot per day** — duplicate prevention enforced in the app (Firestore query before write) and optionally in security rules.
- **No cancellation** — bookings are permanent once made.
- **No capacity limit** — unlimited athletes per slot.
- **Weekdays only** — Saturday and Sunday render all three slots as unavailable (greyed out), no booking button shown.

---

## Data Model

### `bookings` collection

```
{
  id:          string    // Firestore auto-ID
  athleteId:   string    // reference to athletes doc
  athleteName: string    // denormalised for easy display
  date:        string    // "YYYY-MM-DD" (Europe/Lisbon date)
  slot:        string    // 'morning' | 'lunch' | 'evening'
  bookedAt:    Timestamp // Firestore server timestamp
}
```

Indexes required:
- `athleteId ASC + date ASC` — for athlete's own bookings
- `date ASC + slot ASC` — for staff view of a day's bookings

---

## Firestore Security Rules (additions)

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

---

## New Files

```
src/
  services/
    bookings.js                      CREATE — Firestore queries for bookings
  pages/
    Athlete/
      TabBookings.jsx                CREATE — athlete booking tab
    Dashboard/
      TabBookings.jsx                CREATE — staff bookings overview
  lib/
    slots.js                         CREATE — slot definitions + time helpers
```

**Modified files:**
```
src/pages/Athlete/index.jsx          MODIFY — add "Reservas" tab (4th tab)
src/pages/Dashboard/index.jsx        MODIFY — add "Reservas" tab (5th tab)
src/pages/CheckIn/StepConfirm.jsx   MODIFY — show booking match if slot is active
firestore.rules                      MODIFY — add bookings collection rules
firestore.indexes.json               MODIFY — add two composite indexes
```

---

## `src/lib/slots.js`

Centralised slot definitions and time utilities:

```js
export const SLOTS = {
  morning: { key: 'morning', label: 'Manhã',  start: '07:00', end: '09:00' },
  lunch:   { key: 'lunch',   label: 'Almoço', start: '12:00', end: '14:00' },
  evening: { key: 'evening', label: 'Tarde',  start: '18:00', end: '20:00' },
}

export const SLOT_ORDER = ['morning', 'lunch', 'evening']

// Returns the currently active slot key, or null if between slots / outside hours
export function getActiveSlot(now = new Date()) { ... }

// Returns true if a slot is still bookable (its start time has not passed)
export function isSlotBookable(slotKey, dateStr, now = new Date()) { ... }

// Returns true if dateStr falls on a weekday (Mon–Fri)
export function isWeekday(dateStr) { ... }
```

---

## `src/services/bookings.js`

```js
// Get all bookings for a specific athlete (all time, desc)
getBookingsForAthlete(athleteId): Promise<Booking[]>

// Get all bookings for a specific date across all athletes
getBookingsForDate(dateStr): Promise<Booking[]>

// Get bookings for an athlete on a specific date (max 3 results)
getBookingsForAthleteOnDate(athleteId, dateStr): Promise<Booking[]>

// Create a booking — caller must check for duplicates first
addBooking({ athleteId, athleteName, date, slot }): Promise<void>

// Check if athlete already has a booking for a specific slot+date
hasBooking(athleteId, dateStr, slot): Promise<boolean>
```

---

## Athlete "Reservas" Tab (`TabBookings.jsx`)

**Layout:**
1. **Day strip** — shows the current week (Mon–Fri). Clicking a day shows that day's slots. Current day is highlighted in red. Past days where all slots have started are dimmed.

2. **Slot cards** (3 per selected day):
   - `Terminado` (grey, disabled) — slot start time has passed
   - `Reservado ✓` (green pill) — athlete already has a booking for this slot
   - `Reservar` (red button) — slot is open, tap to book
   - `Fim de semana` (grey, no button) — Saturday or Sunday

3. **Próximas Reservas** — list of the athlete's upcoming bookings (future dates only), sorted by date ascending. Shows date + slot label + time.

**Booking action:**
- Check `hasBooking(athleteId, date, slot)` first to prevent duplicates
- Call `addBooking(...)` on success
- Optimistically update UI — slot card switches to "Reservado ✓" immediately

---

## Staff Dashboard "Reservas" Tab (`TabBookings.jsx`)

**Layout:**
1. **Day strip** — same Mon–Fri week strip as athlete view. Default: today.

2. **Three slot sections** per day, each showing:
   - Slot name + time range
   - Count of athletes booked (e.g. "8 atletas")
   - Expandable list of athlete names
   - Each athlete row shows booking status and, if slot is active/past today, whether they checked in (cross-reference with `checkins` collection)

**Check-in correlation:**
On the staff view, for today's slots, each booked athlete row shows:
- Green "Check-in ✓" if a check-in record exists for that athlete on today's date
- Grey "Reservado" if no check-in yet

This is read-only — coaches cannot modify bookings from this view.

---

## Kiosk Check-in Correlation (`StepConfirm.jsx`)

After a successful check-in, `StepConfirm` already fetches session count. Additionally:
- Query `getBookingsForAthleteOnDate(athleteId, today)` 
- Determine `getActiveSlot(now)` — the slot whose window currently contains the check-in timestamp
- If the athlete has a booking matching the active slot, display a small confirmation: `"Sessão reservada ✓"` badge in green below the session count

If no booking matches (athlete checked in outside a booked slot, or no booking at all), nothing extra is shown — the confirmation screen is unchanged.

---

## Day Strip — Week Range

The day strip shows **the current week (Mon–Fri)** only — 5 days. Athletes cannot book into future weeks from this view. Since slots are bookable until their start time, and the view only shows the current week, this naturally limits booking to "today until slot starts."

**Edge case — Friday after 20:00:** All slots for the week have passed. The strip shows the current week greyed out. Next Monday's strip becomes available when the new week starts.

---

## Constraints

- No push notifications (out of scope)
- No admin slot management — slots are fixed in code, not configurable via UI
- No booking for weekends
- Staff cannot book on behalf of athletes
- Staff cannot cancel bookings

---

## Success Criteria

- Athlete can book a slot for today in under 3 taps from the Reservas tab
- Athlete cannot book the same slot twice
- Athlete cannot book a slot whose start time has passed
- Staff can see all booked athletes for any weekday in the current week
- Staff can see which booked athletes checked in vs. didn't show
- Kiosk check-in confirmation acknowledges the booking when slot matches
