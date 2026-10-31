import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_URL, apiFetch } from '../api'
import { formatDate, scanTitle, statusOf } from '../utils'

const tabs = [
  { key: 'all', label: 'All' },
  { key: 'healthy', label: 'Healthy' },
  { key: 'attention', label: 'Needs attention' },
  { key: 'unsure', label: 'Unsure' },
]

function statusKey(scan) {
  if (scan.low_confidence) return 'unsure'
  return scan.is_healthy ? 'healthy' : 'attention'
}

export default function History() {
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('all')
  const [crop, setCrop] = useState('all')

  useEffect(() => {
    apiFetch('/scans')
      .then(setScans)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // How many scans each tab would show
  const counts = useMemo(() => {
    const result = { all: scans.length, healthy: 0, attention: 0, unsure: 0 }
    scans.forEach((s) => {
      result[statusKey(s)] += 1
    })
    return result
  }, [scans])

  // Crops to choose from (unsure scans are left out, their crop is only a guess)
  const crops = useMemo(
    () => [...new Set(scans.filter((s) => !s.low_confidence).map((s) => s.crop))].sort(),
    [scans],
  )

  const visible = scans.filter(
    (s) =>
      (tab === 'all' || statusKey(s) === tab) &&
      (crop === 'all' || (!s.low_confidence && s.crop === crop)),
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-extrabold text-gray-900">Scan history</h1>
      <p className="mt-1 text-gray-600">Every leaf you have scanned, newest first.</p>

      {loading && <p className="mt-8 text-gray-500">Loading...</p>}

      {error && (
        <p className="mt-8 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && scans.length === 0 && (
        <div className="mt-8 rounded-2xl bg-white p-10 text-center shadow">
          <p className="text-lg font-semibold text-gray-800">No scans yet</p>
          <Link
            to="/scan"
            className="mt-4 inline-block rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700"
          >
            Scan your first leaf
          </Link>
        </div>
      )}

      {scans.length > 0 && (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    tab === t.key
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-700 shadow-sm hover:bg-gray-50'
                  }`}
                >
                  {t.label} ({counts[t.key]})
                </button>
              ))}
            </div>

            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
            >
              <option value="all">All crops</option>
              {crops.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {visible.length === 0 ? (
            <p className="mt-10 text-center text-gray-500">No scans match these filters.</p>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((scan) => {
                const status = statusOf(scan)
                return (
                  <Link
                    key={scan.id}
                    to={`/scans/${scan.id}`}
                    className="overflow-hidden rounded-2xl bg-white shadow transition hover:shadow-md"
                  >
                    <img
                      src={`${API_URL}${scan.image_url}`}
                      alt=""
                      className="h-44 w-full object-cover"
                    />
                    <div className="p-4">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
                      >
                        {status.label}
                      </span>
                      <p className="mt-2 font-semibold text-gray-900">{scanTitle(scan)}</p>
                      <p className="text-sm text-gray-500">
                        {formatDate(scan.created_at)} · {Math.round(scan.confidence * 100)}%
                        confidence
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}