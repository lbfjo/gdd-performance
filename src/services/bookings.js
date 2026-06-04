import {
  collection, query, where, orderBy, getDocs,
  addDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'

const TZ = 'Europe/Lisbon'

const SLOT_START_HOURS = {
  morning: 7,
  lunch:   12,
  evening: 18,
}

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
  const q = query(
    collection(db, 'checkins'),
    where('date', '==', dateStr)
  )
  const snap = await getDocs(q)
  return new Set(snap.docs.map(d => d.data().athleteId))
}

export async function getBookingCountForSlot(dateStr, slotKey) {
  const q = query(
    collection(db, 'bookings'),
    where('date', '==', dateStr),
    where('slot', '==', slotKey)
  )
  const snap = await getDocs(q)
  return snap.size
}

export async function cancelBooking(bookingId) {
  await deleteDoc(doc(db, 'bookings', bookingId))
}

export function isCancellable(slotKey, dateStr) {
  const startHour = SLOT_START_HOURS[slotKey]
  if (startHour === undefined) return false

  // Find the UTC instant that corresponds to `startHour:00` in Europe/Lisbon
  // on `dateStr`. We do this by guessing the slot as UTC, then computing the
  // Lisbon wall-clock offset at that instant, and correcting the direction.
  //
  // e.g. In summer (WEST = UTC+1): 07:00 Lisbon = 06:00 UTC
  //   approxUtc = Date('2026-06-05T07:00Z')   ← wrong, Lisbon sees 08:00 here
  //   lisbonHour = 8 (Intl tells us Lisbon is at 08:00 when UTC is 07:00)
  //   diff = lisbonHour - startHour = 8 - 7 = +1 hour ahead of UTC
  //   slotStartUtc = approxUtc - diff = 07:00Z - 1h = 06:00Z ✓
  const approxUtc = new Date(`${dateStr}T${String(startHour).padStart(2, '0')}:00:00Z`)
  const lisbonParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(approxUtc)
  const lisbonHour = Number(lisbonParts.find(p => p.type === 'hour').value)
  const lisbonMin  = Number(lisbonParts.find(p => p.type === 'minute').value)

  // diff: how many minutes Lisbon is *ahead* of UTC at this instant
  const diffMs = (lisbonHour * 60 + lisbonMin - startHour * 60) * 60 * 1000
  const slotStartUtc = new Date(approxUtc.getTime() - diffMs)

  const now = new Date()
  const msUntilSlot = slotStartUtc.getTime() - now.getTime()
  return msUntilSlot > 60 * 60 * 1000 // more than 60 minutes before slot start
}
