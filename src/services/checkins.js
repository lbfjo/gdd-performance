import {
  collection, query, where, orderBy, getDocs,
  addDoc, serverTimestamp, getCountFromServer,
  deleteDoc, doc
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

export async function getCheckinsCountForAthleteToday(athleteId) {
  const today = getLocalDate()
  const q = query(
    collection(db, 'checkins'),
    where('athleteId', '==', athleteId),
    where('date', '==', today)
  )
  const snap = await getCountFromServer(q)
  return snap.data().count
}

export async function addCheckin(athleteId, athleteName) {
  const today = getLocalDate()
  await addCheckinForDate(athleteId, athleteName, today)
}

export async function addCheckinForDate(athleteId, athleteName, date, source = 'athlete') {
  await addDoc(collection(db, 'checkins'), {
    athleteId,
    athleteName,
    date,
    source,
    timestamp: serverTimestamp(),
  })
}

export async function addStaffCheckin(athleteId, athleteName, date) {
  await addCheckinForDate(athleteId, athleteName, date, 'staff')
}

export async function getCheckinsForAthleteOnDate(athleteId, date) {
  const q = query(
    collection(db, 'checkins'),
    where('athleteId', '==', athleteId),
    where('date', '==', date)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const aTime = a.timestamp?.seconds ?? 0
      const bTime = b.timestamp?.seconds ?? 0
      return aTime - bTime
    })
}

export async function removeCheckin(checkinId) {
  await deleteDoc(doc(db, 'checkins', checkinId))
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
  const snap = await getCountFromServer(q)
  return snap.data().count
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
    all: snap.docs.map(d => ({ id: d.id, ...d.data() })),
    currStart: curr.start,
    currEnd: curr.end,
    prevStart: prev.start,
    prevEnd: prev.end,
  }
}

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
