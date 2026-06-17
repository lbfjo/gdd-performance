import {
  collection, query, where, orderBy, getDocs,
  doc, getDoc, addDoc, updateDoc, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'
import { hashPin } from '../lib/hash'

export async function getAthletes() {
  const q = query(collection(db, 'athletes'), where('active', '==', true), orderBy('name'))
  const snap = await getDocs(q)
  return snap.docs.map(d => {
    const data = d.data()
    return {
      id: d.id,
      name: data.name,
      position: data.position,
      staffStatus: data.staffStatus,
    }
  })
}

export async function getAllAthletes() {
  const q = query(collection(db, 'athletes'), orderBy('name'))
  const snap = await getDocs(q)
  return snap.docs.map(d => {
    const rest = { ...d.data() }
    delete rest.pin
    return { id: d.id, ...rest }
  })
}

export async function verifyAthletePin(athleteId, pin) {
  const snap = await getDoc(doc(db, 'athletes', athleteId))
  if (!snap.exists()) return false
  const data = snap.data()
  if (!data.pin) return false
  const entered = await hashPin(pin)
  return data.pin === entered
}

export async function athleteHasPinSet(athleteId) {
  const snap = await getDoc(doc(db, 'athletes', athleteId))
  if (!snap.exists()) return false
  return snap.data().pinSet === true
}

export async function addAthlete({ name, position }) {
  const rawPin = String(Math.floor(1000 + Math.random() * 9000))
  const pinHash = await hashPin(rawPin)
  await addDoc(collection(db, 'athletes'), {
    name,
    position: position || '',
    pin: pinHash,
    pinSet: false,
    active: true,
  })
  return rawPin
}

export async function deactivateAthlete(athleteId) {
  await updateDoc(doc(db, 'athletes', athleteId), { active: false })
}

export async function reactivateAthlete(athleteId) {
  await updateDoc(doc(db, 'athletes', athleteId), { active: true })
}

export async function resetAthletePin(athleteId) {
  const rawPin = String(Math.floor(1000 + Math.random() * 9000))
  const pinHash = await hashPin(rawPin)
  await updateDoc(doc(db, 'athletes', athleteId), { pin: pinHash, pinSet: false })
  return rawPin
}

export async function setFirstTimePin(athleteId, newPin) {
  const pinHash = await hashPin(newPin)
  await updateDoc(doc(db, 'athletes', athleteId), { pin: pinHash, pinSet: true })
}

export async function getAthleteMealPlan(athleteId) {
  const snap = await getDoc(doc(db, 'athletes', athleteId))
  if (!snap.exists()) return null
  const data = snap.data().mealPlan
  if (!data || typeof data === 'string') return null
  return data
}

export async function updateAthleteMealPlan(athleteId, mealPlan) {
  await updateDoc(doc(db, 'athletes', athleteId), { mealPlan })
}

export async function updateAthleteStatus(athleteId, staffStatus) {
  await updateDoc(doc(db, 'athletes', athleteId), {
    staffStatus: {
      type: staffStatus.type,
      note: staffStatus.note || '',
      updatedAt: serverTimestamp(),
    },
  })
}
