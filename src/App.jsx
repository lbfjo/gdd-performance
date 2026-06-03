import { Routes, Route, Navigate } from 'react-router-dom'
import CheckIn from './pages/CheckIn'
import Staff from './pages/Staff'
import Dashboard from './pages/Dashboard'
import Athlete from './pages/Athlete'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CheckIn />} />
      <Route path="/staff" element={<Staff />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/athlete" element={<Athlete />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
