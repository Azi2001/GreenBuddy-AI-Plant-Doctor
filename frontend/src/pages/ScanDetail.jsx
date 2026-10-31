import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../api'
import ScanResult from '../components/ScanResult'

export default function ScanDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    apiFetch(`/scans/${id}`)
      .then(setResult)
      .catch((err) => setError(err.message))
  }, [id])

  async function handleDelete() {
    if (!window.confirm('Delete this scan? This cannot be undone.')) return
    setDeleting(true)
    try {
      await apiFetch(`/scans/${id}`, { method: 'DELETE' })
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/dashboard" className="text-sm font-medium text-green-700 hover:underline">
        ← Back to dashboard
      </Link>

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!result && !error && <p className="mt-6 text-gray-500">Loading...</p>}

      {result && (
        <div className="mt-4 space-y-5">
          <ScanResult result={result} />
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-xl border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete this scan'}
          </button>
        </div>
      )}
    </div>
  )
}