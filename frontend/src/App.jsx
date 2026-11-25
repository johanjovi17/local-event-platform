import { useCallback, useEffect, useMemo, useState } from 'react'
import { createEvent, deleteEvent, getEvents, updateEvent } from './api/events'
import EventCard from './components/EventCard'
import EventForm from './components/EventForm'
import './App.css'

function App() {
  const [events, setEvents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)

  const loadEvents = useCallback(async () => {
    setPageError('')
    setIsLoading(true)
    try {
      setEvents(await getEvents())
    } catch (error) {
      setPageError(error.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isActive = true

    getEvents()
      .then((loadedEvents) => {
        if (isActive) setEvents(loadedEvents)
      })
      .catch((error) => {
        if (isActive) setPageError(error.message)
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [])

  const upcomingCount = useMemo(
    () => events.filter((event) => event.status === 'Upcoming').length,
    [events],
  )

  function openCreateForm() {
    setSelectedEvent(null)
    setFormError('')
    setIsFormOpen(true)
  }

  function openEditForm(event) {
    setSelectedEvent(event)
    setFormError('')
    setIsFormOpen(true)
  }

  function closeForm() {
    if (isSaving) return
    setIsFormOpen(false)
    setSelectedEvent(null)
  }

  async function handleSave(eventData) {
    setIsSaving(true)
    setFormError('')
    try {
      if (selectedEvent) {
        await updateEvent(selectedEvent.id, eventData)
      } else {
        await createEvent(eventData)
      }
      setIsFormOpen(false)
      setSelectedEvent(null)
      await loadEvents()
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(event) {
    if (!window.confirm(`Delete "${event.title}"? This cannot be undone.`)) return

    setPageError('')
    try {
      await deleteEvent(event.id)
      setEvents((currentEvents) =>
        currentEvents.filter((item) => item.id !== event.id),
      )
    } catch (error) {
      setPageError(error.message)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Gather home">
          <span className="brand-mark" aria-hidden="true">
            g
          </span>
          <span>gather<span className="brand-period">.</span></span>
        </a>
        <div className="topbar-right">
          <span className="workspace-label">Event workspace</span>
          <span className="avatar" aria-label="Workspace profile">G</span>
        </div>
      </header>

      <main className="main-content">
        <section className="welcome-row">
          <div>
            <p className="eyebrow">YOUR COMMUNITY, TOGETHER</p>
            <h1>Make good things happen.</h1>
            <p className="welcome-copy">
              Plan your next gathering and keep every detail in one place.
            </p>
          </div>
          <button className="button button-primary create-button" onClick={openCreateForm}>
            <span className="plus-icon" aria-hidden="true">+</span>
            Create an event
          </button>
        </section>

        <section className="overview" aria-label="Event overview">
          <div className="overview-card">
            <span className="overview-icon icon-lilac" aria-hidden="true">✳</span>
            <div>
              <span className="overview-label">All events</span>
              <strong>{events.length}</strong>
            </div>
          </div>
          <div className="overview-card">
            <span className="overview-icon icon-peach" aria-hidden="true">↗</span>
            <div>
              <span className="overview-label">Upcoming</span>
              <strong>{upcomingCount}</strong>
            </div>
          </div>
          <div className="overview-note">
            <span className="note-sparkle" aria-hidden="true">✳</span>
            <p>Every great memory starts with an invitation.</p>
          </div>
        </section>

        <section className="events-section" aria-labelledby="events-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">THE GOOD STUFF</p>
              <h2 id="events-heading">Your events</h2>
            </div>
            <span className="event-count">
              {events.length} {events.length === 1 ? 'event' : 'events'}
            </span>
          </div>

          {pageError && (
            <div className="notice notice-error" role="alert">
              <span>{pageError}</span>
              <button className="text-button" onClick={loadEvents}>Try again</button>
            </div>
          )}

          {isLoading ? (
            <div className="empty-state" aria-live="polite">
              <span className="loading-dot" aria-hidden="true" />
              <p>Finding your events...</p>
            </div>
          ) : events.length === 0 && !pageError ? (
            <div className="empty-state">
              <span className="empty-illustration" aria-hidden="true">✳</span>
              <h3>A little space for something special.</h3>
              <p>Your events will show up here once you create one.</p>
              <button className="button button-secondary" onClick={openCreateForm}>
                Create your first event
              </button>
            </div>
          ) : (
            <div className="event-grid">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onEdit={openEditForm}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <span>gather<span className="brand-period">.</span></span>
        <span>Made for bringing people together.</span>
      </footer>

      {isFormOpen && (
        <EventForm
          event={selectedEvent}
          error={formError}
          isSaving={isSaving}
          onClose={closeForm}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

export default App
