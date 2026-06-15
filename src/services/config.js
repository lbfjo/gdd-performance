import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { hashPin } from '../lib/hash'

export async function verifyStaffPin(pin) {
  const snap = await getDoc(doc(db, 'config', 'app'))
  if (!snap.exists()) return false
  const entered = await hashPin(pin)
  return snap.data().staffPin === entered
}

export async function getConfig() {
  const snap = await getDoc(doc(db, 'config', 'app'))
  if (!snap.exists()) {
    return {
      weeklyTarget: null,
      nutritionAppointmentsEnabled: false,
    }
  }
  const data = snap.data()
  return {
    weeklyTarget: data.weeklyTarget ?? null,
    nutritionAppointmentsEnabled: data.nutritionAppointmentsEnabled === true,
  }
}

export async function setWeeklyTarget(target) {
  const ref = doc(db, 'config', 'app')
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Config doc not initialised — set staffPin first')
  await setDoc(ref, { weeklyTarget: target }, { merge: true })
}

export async function setNutritionAppointmentsEnabled(enabled) {
  const ref = doc(db, 'config', 'app')
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Config doc not initialised — set staffPin first')
  await setDoc(ref, {
    nutritionAppointmentsEnabled: enabled === true,
  }, { merge: true })
}
