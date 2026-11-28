import { useEffect, useState } from 'react'
import { getEventAttendees } from '../api/events'
import Loader from './Loader'

function formatRegistrationDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function OrganizerAttendees({ events }) {
  const [attendeesByEvent, setAttendeesByEvent] = useState({})
  const [isLoading, setIsLoading] = useState(events.length > 0)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let active = true

    if (events.length === 0) {
      return () => {
        active = false
      }
    }

    Promise.all(
      events.map(async (event) => [event.id, await getEventAttendees(event.id)]),
    )
      .then((results) => {
        if (active) setAttendeesByEvent(Object.fromEntries(results))
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [events, retryCount])

  function retry() {
    setIsLoading(true)
    setError('')
    setRetryCount((count) => count + 1)
  }

  return (
    <section className="organizer-attendees-page">
      <header className="page-heading">
        <div>
          <p className="role-label">ORGANIZER WORKSPACE</p>
          <h1>Registered attendees</h1>
        </div>
      </header>

      {isLoading ? (
        <div className="screen-state">
          <Loader label="Loading attendees" size="large" />
        </div>
      ) : error ? (
        <div className="notice notice-error" role="alert">
          <span>{error}</span>
          <button className="text-button" onClick={retry}>Try again</button>
        </div>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <h2>You have not created any events yet</h2>
        </div>
      ) : (
        <div className="attendee-event-list">
          {events.map((event) => {
            const attendees = attendeesByEvent[event.id] || []
            return (
              <section className="attendee-event-card" key={event.id}>
                <header className="attendee-event-header">
                  <div>
                    <p className="event-detail-eyebrow">{event.category}</p>
                    <h2>{event.title}</h2>
                  </div>
                  <span className="attendee-count">
                    {attendees.length} {attendees.length === 1 ? 'attendee' : 'attendees'}
                  </span>
                </header>
                {attendees.length === 0 ? (
                  <p className="attendee-empty">No one has registered for this event yet.</p>
                ) : (
                  <ul className="attendee-list">
                    {attendees.map((attendee) => (
                      <li className="attendee-item" key={attendee.id}>
                        <span className="attendee-avatar" aria-hidden="true">
                          {attendee.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="attendee-identity">
                          <strong>{attendee.name}</strong>
                          <span>{attendee.email}</span>
                        </span>
                        <time className="attendee-date" dateTime={attendee.registeredAt}>
                          {formatRegistrationDate(attendee.registeredAt)}
                        </time>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default OrganizerAttendees
