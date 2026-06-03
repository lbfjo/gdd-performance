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
  if (!snap.exists()) return { weeklyTarget: null }
  const data = snap.data()
  return { weeklyTarget: data.weeklyTarget ?? null }
}

export async function setWeeklyTarget(target) {
  const snap = await getDoc(doc(db, 'config', 'app'))
  if (!snap.exists()) return
  const current = snap.data()
  await setDoc(doc(db, 'config', 'app'), { ...current, weeklyTarget: target })
}
