export const API_URL = 'http://127.0.0.1:8000'

export function getToken() {
  return localStorage.getItem('token')
}

export function setToken(token) {
  localStorage.setItem('token', token)
}

export function clearToken() {
  localStorage.removeItem('token')
}

function errorMessage(data) {
  if (!data || !data.detail) return 'Something went wrong. Please try again.'
  if (typeof data.detail === 'string') return data.detail
  if (Array.isArray(data.detail)) return data.detail.map((d) => d.msg).join('. ')
  return 'Something went wrong. Please try again.'
}

// Sends a request to the backend and adds the login token automatically
export async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers })
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?')
  }

  if (response.status === 204) return null

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(errorMessage(data))
    error.status = response.status
    throw error
  }
  return data
}