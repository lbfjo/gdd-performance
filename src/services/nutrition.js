import {
  collection, query, where, orderBy, limit,
  getDocs, addDoc, updateDoc, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'
import { getLocalDate } from '../lib/dates'

export async function getTodayWeight(athleteId) {
  const today = getLocalDate()
  const q = query(
    collection(db, 'nutrition_logs'),
    where('athleteId', '==', athleteId),
    where('date', '==', today)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const doc = snap.docs[0]
  return { id: doc.id, ...doc.data() }
}

export async function getWeightHistory(athleteId, days = 7) {
  const q = query(
    collection(db, 'nutrition_logs'),
    where('athleteId', '==', athleteId),
    orderBy('date', 'desc'),
    limit(days)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function logWeight(athleteId, athleteName, weight) {
  const today = getLocalDate()
  const q = query(
    collection(db, 'nutrition_logs'),
    where('athleteId', '==', athleteId),
    where('date', '==', today)
  )
  const snap = await getDocs(q)

  if (!snap.empty) {
    await updateDoc(snap.docs[0].ref, { weight, timestamp: serverTimestamp() })
  } else {
    await addDoc(collection(db, 'nutrition_logs'), {
      athleteId,
      athleteName,
      date: today,
      weight,
      timestamp: serverTimestamp(),
    })
  }
}
