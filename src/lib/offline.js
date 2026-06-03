const KEY = 'gdd_offline_queue'

export function getPendingQueue() {
  try { return JSON.parse(localStorage.getItem(KEY)) || [] }
  catch { return [] }
}

function saveQueue(q) {
  localStorage.setItem(KEY, JSON.stringify(q))
}

export function enqueueCheckin(item) {
  const q = getPendingQueue()
  q.push({ ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` })
  saveQueue(q)
}

export function removeFromQueue(id) {
  saveQueue(getPendingQueue().filter(item => item.id !== id))
}

export function clearQueue() {
  localStorage.removeItem(KEY)
}
