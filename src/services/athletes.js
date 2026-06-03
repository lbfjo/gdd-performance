import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore'
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
  const snap = await getDoc(doc(db, 'athletes', athleteId))
  if (!snap.exists()) return false
  const stored = snap.data().pin
  const entered = await hashPin(pin)
  return stored === entered
}
