import { useState, useEffect } from 'react'
import './PinPad.css'

// onComplete(pin: string) called when 4 digits entered
// error: boolean — triggers shake + clears after animation
export default function PinPad({ onComplete, error }) {
  const [digits, setDigits] = useState([])
  const [shaking, setShaking] = useState(false)

  useEffect(() => {
    if (error) {
      setShaking(true)
      const t = setTimeout(() => { setShaking(false); setDigits([]) }, 500)
      return () => clearTimeout(t)
    }
  }, [error])

  function press(key) {
    if (key === 'back') {
      setDigits(d => d.slice(0, -1))
      return
    }
    if (digits.length >= 4) return
    const next = [...digits, key]
    setDigits(next)
    if (next.length === 4) onComplete(next.join(''))
  }

  return (
    <div className="pinpad">
      <div className={`pinpad-dots${shaking ? ' shake' : ''}`}>
        {[0,1,2,3].map(i => (
          <div key={i} className={`pinpad-dot${i < digits.length ? ' filled' : ''}${error && shaking ? ' error' : ''}`} />
        ))}
      </div>
      <div className="pinpad-grid">
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} className="pinpad-key" onClick={() => press(String(n))}>{n}</button>
        ))}
        <button className="pinpad-key empty" disabled />
        <button className="pinpad-key" onClick={() => press('0')}>0</button>
        <button className="pinpad-key backspace" onClick={() => press('back')}>⌫</button>
      </div>
    </div>
  )
}
