import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../api'
import { useAuth } from '../AuthContext'
import ScanResult from '../components/ScanResult'

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB, same limit as the backend

export default function Scan() {
  const { logout } = useAuth()
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  // Free the memory used by the preview when it changes
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  function chooseFile(selected) {
    setError('')
    setResult(null)
    if (!selected) return

    if (!['image/jpeg', 'image/png'].includes(selected.type)) {
      setError('Please choose a JPG or PNG photo.')
      return
    }
    if (selected.size > MAX_SIZE) {
      setError('That photo is too large. Please choose one under 5 MB.')
      return
    }
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    chooseFile(e.dataTransfer.files[0])
  }

  async function handleDiagnose() {
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const data = await apiFetch('/predict', { method: 'POST', body: formData })
      setResult(data)
    } catch (err) {
      if (err.status === 401) {
        logout() // the login expired, so go back to the login page
        return
      }
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setFile(null)
    setPreview(null)
    setResult(null)
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-extrabold text-gray-900">Scan a leaf</h1>
      <p className="mt-1 text-gray-600">
        Take a clear, close-up photo of one leaf in good daylight, with the leaf filling most of
        the picture.
      </p>

      {!result && (
        <div className="mt-6 rounded-2xl bg-white p-6 shadow">
          <div
            onClick={() => inputRef.current.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`flex min-h-64 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition ${
              dragging ? 'border-green-600 bg-green-50' : 'border-gray-300 hover:border-green-500'
            }`}
          >
            {preview ? (
              <img src={preview} alt="Your leaf" className="max-h-80 rounded-lg object-contain" />
            ) : (
              <div className="text-gray-500">
                <p className="text-lg font-semibold text-gray-700">Drop a leaf photo here</p>
                <p className="mt-1 text-sm">or click to choose one (JPG or PNG, up to 5 MB)</p>
              </div>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(e) => chooseFile(e.target.files[0])}
          />

          {error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => inputRef.current.click()}
              className="rounded-xl border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
            >
              {file ? 'Choose another photo' : 'Choose a photo'}
            </button>
            <button
              onClick={handleDiagnose}
              disabled={!file || loading}
              className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-lg shadow-green-600/20 transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Analysing your leaf...' : 'Diagnose'}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-5">
          <ScanResult result={result} />
          <button
            onClick={reset}
            className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
          >
            Scan another leaf
          </button>
        </div>
      )}
    </div>
  )
}