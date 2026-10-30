import { Navigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <p className="p-8 text-center text-gray-500">Loading...</p>
  if (!user) return <Navigate to="/login" replace />
  return children
}