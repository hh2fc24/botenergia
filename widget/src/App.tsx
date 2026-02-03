import { Navigate, Route, Routes } from 'react-router-dom'
import DashboardPage from './pages/DashboardPage'
import EmbedPage from './pages/EmbedPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/embed" replace />} />
      <Route path="/embed" element={<EmbedPage />} />
      <Route path="/widget" element={<EmbedPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="*" element={<Navigate to="/embed" replace />} />
    </Routes>
  )
}
