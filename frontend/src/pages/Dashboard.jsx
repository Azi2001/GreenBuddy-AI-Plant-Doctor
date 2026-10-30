import { useAuth } from '../AuthContext'

export default function Dashboard() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-green-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-green-700">Welcome, {user.full_name} 🌿</h1>
          <button
            onClick={logout}
            className="bg-white border border-gray-300 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm"
          >
            Log out
          </button>
        </div>
        <p className="mt-6 text-gray-600">Your dashboard will appear here.</p>
      </div>
    </div>
  )
}