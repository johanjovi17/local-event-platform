const apiBaseUrl = import.meta.env.VITE_API_URL || '/api'

async function request(path, options = {}) {
  let response
  const token = sessionStorage.getItem('gather_token')
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new Error('Could not reach the API. Check that the backend is running.')
  }

  if (!response.ok) {
    let message = `Request failed (${response.status}).`
    try {
      const body = await response.json()
      if (Array.isArray(body.details)) {
        message = body.details.join(' ')
      } else if (body.error) {
        message = body.error
      }
    } catch {
      // Keep the HTTP status message when the server does not return JSON.
    }
    throw new Error(message)
  }

  if (response.status === 204) return null
  return response.json()
}

export async function getEvents() {
  const result = await request('/events')
  return result.data
}

export function createEvent(event) {
  return request('/events', {
    method: 'POST',
    body: JSON.stringify(event),
  })
}

export function updateEvent(id, event) {
  return request(`/events/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(event),
  })
}

export function deleteEvent(id) {
  return request(`/events/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function login(credentials) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export function register(details) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(details),
  })
}

export function getCurrentUser() {
  return request('/auth/me')
}
