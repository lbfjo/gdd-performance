# GDD Off-Season Gym Check-in — Design Spec

**Date:** 2026-06-03  
**Status:** Approved

---

## Overview

A mobile-first PWA for GDD's off-season period that lets athletes self-report gym attendance and gives coaching staff a real-time view of team compliance. Free to host indefinitely using Firebase's Spark (free) tier.

---

## Users

| Role | Count | Access |
|------|-------|--------|
| Athletes | ~100 | Check-in screen only |
| Coaches | 10 | Staff dashboard |
| Strength & Conditioning | 2 | Staff dashboard |
| Nutritionist | 1 | Staff dashboard |

---

## Stack

| Layer | Technology | Hosting |
|-------|-----------|---------|
| Frontend | React + Vite (PWA) | Firebase Hosting (free) |
| Database | Firebase Firestore | Spark free tier |
| Auth | PIN-based (no accounts) | — |

**Why Firebase over alternatives:** Firestore's Spark free tier never pauses (unlike Supabase), daily-reset limits (50K reads/day, 20K writes/day) are more than sufficient for 100 athletes, and Google has maintained this tier for 10+ years.

---

## Authentication

**Athletes — no accounts:**
- Pick name from a searchable list of all active athletes
- Enter personal 4-digit PIN
- No session persisted — screen auto-resets after 5 seconds

**Staff — shared PIN:**
- Single shared 4-digit PIN for all coaches, SC staff, and nutritionist
- Session stored in `sessionStorage` (clears on tab close)
- No individual staff accounts for this POC

**PIN storage:** PINs are hashed (SHA-256) before being stored in Firestore. Plain-text PINs never leave the client.

---

## Data Model

### `athletes` collection
```
{
  id: string,           // Firestore auto-ID
  name: string,         // "Carlos Vella"
  pin: string,          // SHA-256 hash of 4-digit PIN
  position: string,     // optional, e.g. "Midfielder"
  active: boolean       // false = hidden from check-in list
}
```

### `checkins` collection
```
{
  id: string,           // Firestore auto-ID
  athleteId: string,    // reference to athletes doc
  athleteName: string,  // denormalised for easy querying
  date: string,         // "2026-06-03" (Europe/Lisbon date, for day-level queries)
  timestamp: Timestamp  // Firestore server timestamp
}
```

### `config` document (single doc at `config/app`)
```
{
  staffPin: string      // SHA-256 hash of shared staff PIN
}
```

---

## Screens & Routes

### `/` — Athlete Check-in (public)

Three-step flow:
1. **Pick name** — searchable/scrollable list of all active athletes
2. **Enter PIN** — native numpad UI (4 dots + number grid)
3. **Confirmation** — success screen showing athlete name, timestamp, and weekly attendance summary. Auto-resets to step 1 after 5 seconds.
   - Weekly summary shows: current count (e.g. "4 of 7 days"), and which days were attended (e.g. Mon · Tue · Wed · Today)
   - Data sourced from the same `checkins` collection (athlete's check-ins filtered by current week)
   - Read-only — no editing or history beyond current week

Edge cases:
- Wrong PIN → shake animation, clear digits, stay on step 2
- Already checked in today → show "Already checked in today!" message instead of confirmation
- Athlete not found → search returns empty state with "Contact your coach"

### `/staff` — Staff Login (public entry, protected destination)

Simple full-screen PIN entry. On success, redirects to `/dashboard` and writes PIN verification to `sessionStorage`.

### `/dashboard` — Coach Dashboard (protected)

Redirects to `/staff` if no valid session. Four tabs:

**Tab 1 — Weekly Grid**
- Current week view (Mon–Sun)
- All active athletes as rows, days as columns
- Green cell = checked in, grey = absent
- Week navigation (← previous / next →)
- Shows athlete name truncated + day initial headers

**Tab 2 — Per Athlete**
- Search input to find an athlete
- Summary stats: total sessions (all time), sessions this week
- Weekly bar chart showing sessions per week across the off-season
- List of individual check-ins with date/time

**Tab 3 — Leaderboard**
- Ranked list of all athletes by session count for the current week
- Medal icons for top 3
- Athletes with 0 sessions highlighted in red
- Toggle between "this week" and "all-time"

**Tab 4 — Alerts**
- Athletes with 0 sessions in the current week
- Athletes with 0 sessions in both current and previous week (flagged more urgently)
- Sorted by severity (2-week misses first)

---

## PWA Configuration

- `manifest.json` with app name, icons, theme colour (club colours)
- Service worker via `vite-plugin-pwa`
- Installable prompt on iOS (Safari) and Android (Chrome)
- Offline: check-in screen shows "No internet connection — please try again" error banner. No offline queue in POC.
- Club logo used as PWA icon

---

## Admin Setup (out of scope for POC)

For the POC, athlete records are seeded directly in Firestore console. A future admin panel would allow coaches to add/remove athletes and reset PINs.

---

## Constraints

- Free deployment only — Firestore Spark tier, Firebase Hosting free tier
- No email/SMS notifications in POC
- No individual staff accounts — single shared PIN
- Athlete PIN distribution is out-of-scope — handled by coaches offline (e.g. WhatsApp message to each player)

---

## Success Criteria

- An athlete can check in in under 15 seconds
- Coaches can see the weekly grid within 2 taps of opening the app
- App is installable as PWA on iOS and Android
- Zero hosting cost for the foreseeable future

---

## Known Limitations & Future Improvements

Items identified during design review — acceptable for POC, should be addressed before production:

### Security
- **PIN hashing:** SHA-256 on a 4-digit PIN (10,000 combinations) is trivially reversible via lookup table. Future: add a per-athlete random salt, or switch to bcrypt/argon2.
- **No rate-limiting on PIN attempts:** brute-force of all 10,000 PINs is possible in seconds. Future: lockout after 5 failed attempts (30-second cooldown).
- **Firestore Security Rules not defined:** rules must prevent direct read access to `pin` fields and enforce that only hashed values are written. Must be configured before deployment.

### Data
- **No composite indexes documented:** queries like "all check-ins for athlete X in week Y" need Firestore composite indexes on `athleteId` + `date`.
- **Denormalised `athleteName` has no sync strategy:** if an athlete's name changes, historical check-in records retain the old name. Acceptable for POC.
- **No data retention policy:** the `checkins` collection grows unbounded across off-seasons. Low priority for POC.

### UX
- **Timezone:** all date logic (current day, week boundaries) uses `Europe/Lisbon`. Week is defined as Monday–Sunday (ISO week).
- **5-second auto-reset:** may be too short for athletes to read their weekly summary. Consider adding a "Done" button alongside the timer.
- **Offline is a blank screen:** without caching the athlete list, the app is non-functional offline — not just "can't check in" but no UI at all. The error banner only helps if the list was previously loaded.

### Free tier budget
- **Firestore reads:** each dashboard load reads ~100 athlete docs + ~500 check-in docs (100 athletes × ~5 check-ins/week). 10 coaches refreshing a few times daily consumes ~10K–15K of the 50K daily read limit. Sufficient but not as generous as "more than sufficient" implies.
