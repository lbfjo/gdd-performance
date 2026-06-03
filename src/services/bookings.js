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
  const q = query(
    collection(db, 'checkins'),
    where('date', '==', dateStr)
  )
  const snap = await getDocs(q)
  return new Set(snap.docs.map(d => d.data().athleteId))
}
