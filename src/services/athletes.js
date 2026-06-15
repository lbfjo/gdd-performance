import {
  collection, query, where, orderBy, getDocs,
  doc, getDoc, addDoc, updateDoc
} from 'firebase/firestore'
import { db } from '../firebase'
import { hashPin } from '../lib/hash'

export async function getAthletes() {
  const q = query(collection(db, 'athletes'), where('active', '==', true), orderBy('name'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, name: d.data().name, position: d.data().position }))
}

export async function getAllAthletes() {
  const q = query(collection(db, 'athletes'), orderBy('name'))
  const snap = await getDocs(q)
  return snap.docs.map(d => {
    const { pin: _, ...rest } = d.data()
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
