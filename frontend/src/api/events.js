const apiBaseUrl = import.meta.env.VITE_API_URL || '/api'

async function request(path, options = {}) {
  let response
  const token = sessionStorage.getItem('gather_token')
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers: {
        ...(options.body && !(options.body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
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

export async function getEvents(options = {}) {
  const query = new URLSearchParams({ pageSize: '50', ...options })
  const result = await request(`/events?${query}`)
  return result.data
}

export async function getAllEvents(options = {}) {
  const { page: initialPage = 1, pageSize = 50, ...filters } = options
  const allEvents = []
  let page = Number(initialPage)
  let totalPages = page

  while (page <= totalPages) {
    const query = new URLSearchParams({
      ...filters,
      page: String(page),
      pageSize: String(pageSize),
    })
    const result = await request(`/events?${query}`)
    allEvents.push(...result.data)
    totalPages = result.pagination.totalPages
    page += 1
  }

  return allEvents
}

export function getEvent(id) {
  return request(`/events/${encodeURIComponent(id)}`)
}

export function getEventImageUrl(imagePath) {
  if (/^https?:\/\//i.test(imagePath)) return imagePath
  const imageBase = `${apiBaseUrl.replace(/\/$/, '')}${imagePath.startsWith('/') ? imagePath : `/${imagePath}`}`
  return /^https?:\/\//i.test(imageBase) ? new URL(imageBase).href : imageBase
}

export function uploadEventImages(eventId, files) {
  const body = new FormData()
  files.forEach((file) => body.append('images', file))
  return request(`/events/${encodeURIComponent(eventId)}/images`, {
    method: 'POST',
    body,
  })
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

export function getOwnProfile() {
  return request('/users/me/profile')
}

export function getOrganizerProfile(id) {
  return request(`/organizers/${encodeURIComponent(id)}/profile`)
}

export function getEventAttendees(eventId) {
  return request(`/events/${encodeURIComponent(eventId)}/attendees`)
}

export function updateOwnProfile(profile) {
  return request('/users/me/profile', {
    method: 'PUT',
    body: JSON.stringify(profile),
  })
}

export function updateOwnOrganizerProfile(profile) {
  return request('/organizers/me/profile', {
    method: 'PUT',
    body: JSON.stringify(profile),
  })
}

export function registerForEvent(eventId) {
  return request(`/events/${encodeURIComponent(eventId)}/registrations`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export function cancelEventRegistration(eventId) {
  return request(`/events/${encodeURIComponent(eventId)}/registrations`, {
    method: 'DELETE',
  })
}
