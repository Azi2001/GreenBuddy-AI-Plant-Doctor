import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_URL, apiFetch } from '../api'
import { useAuth } from '../AuthContext'

function formatDate(iso) {
  // The server sends UTC times without a timezone marker, so add one
  const utc = /Z|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`
  return new Date(utc).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function statusOf(scan) {
  if (scan.low_confidence) return { label: 'Unsure', className: 'bg-gray-100 text-gray-700' }
  if (scan.is_healthy) return { label: 'Healthy', className: 'bg-green-100 text-green-800' }
  return { label: 'Needs attention', className: 'bg-amber-100 text-amber-800' }
}

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-gray-900">{value}</p>
      {hint && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
    </div>
  )
}

function ActivityChart({ days }) {
  const max = Math.max(...days.map((d) => d.scans), 1)

  return (
    <div className="flex gap-3">
      {days.map((d) => (
        <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-xs font-semibold text-gray-600">{d.scans}</span>
          <div className="flex h-28 w-full items-end">
            <div
              className="w-full rounded-t-lg bg-green-500"
              style={{ height: `${Math.max((d.scans / max) * 100, 3)}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">
            {new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}
          </span>
        </div>
      ))}
    </div>
  )
}

function HealthSplit({ stats }) {
  if (stats.healthy + stats.diseased === 0) {
    return <p className="text-sm text-gray-500">No clear results yet.</p>
  }

  return (
    <>
      <div className="flex h-4 overflow-hidden rounded-full bg-gray-100">
        <div className="bg-green-500" style={{ width: `${stats.healthy_percent}%` }} />
        <div className="bg-amber-400" style={{ width: `${100 - stats.healthy_percent}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
        <span>
          <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
          Healthy: {stats.healthy}
        </span>
        <span>
          <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
          Needs attention: {stats.diseased}
        </span>
        {stats.unsure > 0 && <span>Unsure: {stats.unsure}</span>}
      </div>
    </>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [statsData, scansData] = await Promise.all([apiFetch('/stats'), apiFetch('/scans')])
        setStats(statsData)
        setScans(scansData)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const firstName = user.full_name.split(' ')[0]

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Hello, {firstName} 🌿</h1>
          <p className="mt-1 text-gray-600">Here is how your plants have been doing.</p>
        </div>
        <Link
          to="/scan"
          className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white shadow-lg shadow-green-600/20 hover:bg-green-700"
        >
          Scan a leaf
        </Link>
      </div>

      {loading && <p className="mt-8 text-gray-500">Loading your dashboard...</p>}

      {error && (
        <p className="mt-8 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {stats && stats.total_scans === 0 && (
        <div className="mt-8 rounded-2xl bg-white p-10 text-center shadow">
          <p className="text-lg font-semibold text-gray-800">No scans yet</p>
          <p className="mt-1 text-gray-500">
            Scan your first leaf and your statistics will appear here.
          </p>
        </div>
      )}

      {stats && stats.total_scans > 0 && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total scans" value={stats.total_scans} hint="All time" />
            <StatCard
              label="Healthy leaves"
              value={stats.healthy}
              hint={`${stats.healthy_percent}% of clear results`}
            />
            <StatCard label="Needs attention" value={stats.diseased} hint="Diseases or pests found" />
            <StatCard label="This week" value={stats.scans_this_week} hint="Last 7 days" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl bg-white p-6 shadow lg:col-span-2">
              <h2 className="font-bold text-gray-900">Scans in the last 7 days</h2>
              <div className="mt-5">
                <ActivityChart days={stats.scans_per_day} />
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl bg-white p-6 shadow">
                <h2 className="font-bold text-gray-900">Plant health</h2>
                <div className="mt-4">
                  <HealthSplit stats={stats} />
                </div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow">
                <h2 className="font-bold text-gray-900">Most common problem</h2>
                {stats.most_common_disease ? (
                  <p className="mt-3 text-gray-700">
                    <span className="font-semibold">
                      {stats.most_common_disease.crop}: {stats.most_common_disease.disease}
                    </span>{' '}
                    ({stats.most_common_disease.count} scan
                    {stats.most_common_disease.count === 1 ? '' : 's'})
                  </p>
                ) : (
                  <p className="mt-3 text-gray-500">None found yet. Good news!</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-white p-6 shadow">
            <h2 className="font-bold text-gray-900">Recent scans</h2>
            <div className="mt-3 space-y-1">
              {scans.slice(0, 5).map((scan) => {
                const status = statusOf(scan)
                return (
                  <Link
                    key={scan.id}
                    to={`/scans/${scan.id}`}
                    className="flex items-center gap-4 rounded-xl p-3 transition hover:bg-gray-50"
                  >
                    <img
                      src={`${API_URL}${scan.image_url}`}
                      alt=""
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-gray-900">
                        {scan.low_confidence
                          ? 'Could not identify'
                          : scan.is_healthy
                            ? `${scan.crop}: healthy`
                            : `${scan.crop}: ${scan.disease}`}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(scan.created_at)} · {Math.round(scan.confidence * 100)}%
                        confidence
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}