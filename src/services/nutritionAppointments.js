import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'
import { getLocalDate } from '../lib/dates'
import {
  buildNutritionSlotTimes,
  isNutritionSlotPast,
  nutritionSlotId,
} from '../lib/nutritionSlots'

const COLLECTION = 'nutrition_slots'

function mapSlot(snapshot) {
  return { id: snapshot.id, ...snapshot.data() }
}

export async function getUpcomingNutritionSlots() {
  const today = getLocalDate()
  const q = query(
    collection(db, COLLECTION),
    where('date', '>=', today),
    orderBy('date', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(mapSlot)
    .filter(slot => !isNutritionSlotPast(slot))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
}

export async function createNutritionSlots({
  date,
  startTime,
  endTime,
  intervalMinutes = 15,
}) {
  const times = buildNutritionSlotTimes(startTime, endTime, intervalMinutes)
    .filter(time => !isNutritionSlotPast({ date, time }))
  if (times.length === 0) throw new Error('INVALID_SLOT_RANGE')

  const slots = await Promise.all(times.map(async time => {
    const slotRef = doc(db, COLLECTION, nutritionSlotId(date, time))
    const snapshot = await getDoc(slotRef)
    return { slotRef, time, exists: snapshot.exists() }
  }))

  const batch = writeBatch(db)
  const newSlots = slots.filter(slot => !slot.exists)
  newSlots.forEach(({ slotRef, time }) => {
    batch.set(slotRef, {
      date,
      time,
      status: 'available',
      athleteId: null,
      athleteName: null,
      createdAt: serverTimestamp(),
      bookedAt: null,
    })
  })
  if (newSlots.length > 0) await batch.commit()
  return newSlots.length
}

export async function bookNutritionSlot(slotId, athlete) {
  const slotRef = doc(db, COLLECTION, slotId)
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(slotRef)
    if (!snapshot.exists()) throw new Error('SLOT_NOT_FOUND')

    const slot = { id: snapshot.id, ...snapshot.data() }
    if (slot.status !== 'available' || isNutritionSlotPast(slot)) {
      throw new Error('SLOT_UNAVAILABLE')
    }

    transaction.update(slotRef, {
      status: 'booked',
      athleteId: athlete.id,
      athleteName: athlete.name,
      bookedAt: serverTimestamp(),
    })
  })
}

export async function cancelNutritionBooking(slotId, athleteId) {
  const slotRef = doc(db, COLLECTION, slotId)
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(slotRef)
    if (!snapshot.exists()) throw new Error('SLOT_NOT_FOUND')
    const slot = snapshot.data()
    if (slot.status !== 'booked' || slot.athleteId !== athleteId) {
      throw new Error('BOOKING_NOT_OWNED')
    }
    transaction.update(slotRef, {
      status: 'available',
      athleteId: null,
      athleteName: null,
      bookedAt: null,
    })
  })
}

export async function removeNutritionSlot(slotId) {
  const slotRef = doc(db, COLLECTION, slotId)
  const snapshot = await getDoc(slotRef)
  if (!snapshot.exists() || snapshot.data().status !== 'available') {
    throw new Error('ONLY_AVAILABLE_SLOTS_CAN_BE_REMOVED')
  }
  await deleteDoc(slotRef)
}

export async function reopenNutritionSlot(slotId) {
  await setDoc(doc(db, COLLECTION, slotId), {
    status: 'available',
    athleteId: null,
    athleteName: null,
    bookedAt: null,
  }, { merge: true })
}
