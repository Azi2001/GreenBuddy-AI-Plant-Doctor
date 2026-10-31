import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { LeafIcon } from './AuthLayout'

function linkClass({ isActive }) {
  return `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-green-100 text-green-800' : 'text-gray-600 hover:bg-gray-100'
  }`
}

export default function AppLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-green-50/60">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600 text-white">
                <LeafIcon />
              </span>
              <span className="text-lg font-extrabold tracking-tight text-green-900">GreenBuddy</span>
            </div>
            <nav className="flex gap-1">
              <NavLink to="/dashboard" className={linkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/scan" className={linkClass}>
                New scan
              </NavLink>
              <NavLink to="/history" className={linkClass}>
                History
              </NavLink>

            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-600 sm:block">{user.full_name}</span>
            <button
              onClick={logout}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  )
}