import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { hashPin } from '../lib/hash'

export async function verifyStaffPin(pin) {
  const snap = await getDoc(doc(db, 'config', 'app'))
  if (!snap.exists()) return false
  const stored = snap.data().staffPin
  const entered = await hashPin(pin)
  return stored === entered
}
