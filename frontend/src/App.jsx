import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  cancelEventRegistration,
  createEvent,
  deleteEvent,
  getCurrentUser,
  getAllEvents,
  getOrganizerProfile,
  getOwnProfile,
  registerForEvent,
  updateEvent,
  updateOwnOrganizerProfile,
  updateOwnProfile,
  uploadEventImages,
} from './api/events'
import AuthPage from './components/AuthPage'
import EventCard from './components/EventCard'
import EventDetails from './components/EventDetails'
import EventForm from './components/EventForm'
import OrganizerAttendees from './components/OrganizerAttendees'
import OrganizerProfile from './components/OrganizerProfile'
import ProfilePage from './components/ProfilePage'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(
    () => !sessionStorage.getItem('gather_token'),
  )
  const [profile, setProfile] = useState(null)
  const [events, setEvents] = useState([])
  const [organizerProfiles, setOrganizerProfiles] = useState({})
  const organizerProfilesCache = useRef(new Map())
  const [view, setView] = useState('events')
  const [eventTab, setEventTab] = useState('all')
  const [isLoading, setIsLoading] = useState(false)
  const [pageError, setPageError] = useState('')
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [busyEventId, setBusyEventId] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [selectedOrganizerId, setSelectedOrganizerId] = useState(null)
  const [organizerBackView, setOrganizerBackView] = useState('events')

  const loadWorkspace = useCallback(async () => {
    setPageError('')
    setIsLoading(true)
    try {
      const [currentProfile, allEvents] = await Promise.all([
        getOwnProfile(),
        getAllEvents(),
      ])
      const directory = new Map(organizerProfilesCache.current)
      if (currentProfile.role === 'Organizer') {
        directory.set(currentProfile.id, currentProfile)
      }
      const organizerIds = [...new Set(
        allEvents.map(({ organizerId }) => organizerId).filter(Boolean),
      )]
      const missingOrganizerIds = organizerIds.filter((id) => !directory.has(id))
      const fetchedProfiles = await Promise.all(
        missingOrganizerIds.map(async (id) => {
          const result = await getOrganizerProfile(id)
          return [id, result.profile]
        }),
      )
      fetchedProfiles.forEach(([id, organizer]) => directory.set(id, organizer))
      organizerProfilesCache.current = directory
      setOrganizerProfiles(Object.fromEntries(directory))
      setProfile(currentProfile)
      setEvents(allEvents)
    } catch (error) {
      setPageError(error.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    if (!sessionStorage.getItem('gather_token')) return undefined

    getCurrentUser()
      .then(async ({ user: currentUser }) => {
        if (!active) return
        setUser(currentUser)
        await loadWorkspace()
      })
      .catch(() => {
        if (active) sessionStorage.removeItem('gather_token')
      })
      .finally(() => {
        if (active) setAuthReady(true)
      })

    return () => {
      active = false
    }
  }, [loadWorkspace])

  const registeredEventIds = useMemo(
    () => new Set(
      (profile?.registrations || [])
        .map(({ eventId, event }) => eventId || event?.id)
        .filter(Boolean),
    ),
    [profile],
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

  function openEventDetails(event) {
    setPageError('')
    setSelectedEventId(event.id)
    setView('event')
  }

  function openOrganizerProfile(organizerId) {
    if (!organizerId) return
    setOrganizerBackView(view)
    setSelectedOrganizerId(organizerId)
    setView('organizer')
  }

  function closeForm() {
    if (isSaving) return
    setIsFormOpen(false)
    setSelectedEvent(null)
  }

  async function handleSave(eventData, imageFiles) {
    setIsSaving(true)
    setFormError('')
    const wasCreating = !selectedEvent
    let savedEvent
    try {
      if (selectedEvent) {
        savedEvent = await updateEvent(selectedEvent.id, eventData)
      } else {
        savedEvent = await createEvent(eventData)
      }
      if (imageFiles.length > 0) {
        await uploadEventImages(savedEvent.id, imageFiles)
      }
    } catch (error) {
      if (savedEvent) {
        setSelectedEvent(savedEvent)
        setFormError(
          `${wasCreating ? 'Event created' : 'Event updated'}, but image upload failed: ${error.message}`,
        )
        await loadWorkspace()
      } else {
        setFormError(error.message)
      }
      return
    } finally {
      setIsSaving(false)
    }
    setIsFormOpen(false)
    setSelectedEvent(null)
    await loadWorkspace()
  }

  async function handleDelete(event) {
    if (!window.confirm(`Delete "${event.title}"?`)) return

    setPageError('')
    try {
      await deleteEvent(event.id)
      setEvents((currentEvents) =>
        currentEvents.filter((item) => item.id !== event.id),
      )
      setProfile((currentProfile) => currentProfile
        ? {
            ...currentProfile,
            events: currentProfile.events?.filter((item) => item.id !== event.id),
          }
        : currentProfile)
    } catch (error) {
      setPageError(error.message)
    }
  }

  async function handleRegistration(event) {
    setBusyEventId(event.id)
    setPageError('')
    try {
      if (registeredEventIds.has(event.id)) {
        await cancelEventRegistration(event.id)
      } else {
        await registerForEvent(event.id)
      }
      await loadWorkspace()
    } catch (error) {
      setPageError(error.message)
    } finally {
      setBusyEventId(null)
    }
  }

  async function handleAuthenticated(result) {
    sessionStorage.setItem('gather_token', result.token)
    setUser(result.user)
    setView('events')
    setEventTab('all')
    setSelectedEventId(null)
    await loadWorkspace()
  }

  async function handleProfileSave(updatedProfile) {
    setIsSaving(true)
    setPageError('')
    try {
      const saved = user.role === 'Organizer'
        ? await updateOwnOrganizerProfile(updatedProfile)
        : await updateOwnProfile(updatedProfile)
      setProfile((current) => ({ ...current, ...saved }))
      setUser((current) => ({ ...current, ...saved }))
      if (user.role === 'Organizer') {
        const directory = new Map(organizerProfilesCache.current)
        directory.set(saved.id, saved)
        organizerProfilesCache.current = directory
        setOrganizerProfiles(Object.fromEntries(directory))
      }
    } catch (error) {
      setPageError(error.message)
      throw error
    } finally {
      setIsSaving(false)
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('gather_token')
    setUser(null)
    setProfile(null)
    setEvents([])
    setView('events')
    setEventTab('all')
    setSelectedEventId(null)
    setIsFormOpen(false)
    setSelectedEvent(null)
  }

  if (!authReady) {
    return <div className="screen-state" role="status">Loading…</div>
  }

  if (!user) {
    return <AuthPage onAuthenticated={handleAuthenticated} />
  }

  const isOrganizer = user.role === 'Organizer'
  const myEvents = isOrganizer
    ? profile?.events || []
    : (profile?.registrations || [])
      .map(({ event }) => event)
      .filter(Boolean)
  const displayedEvents = eventTab === 'all' ? events : myEvents
  const selectedListEvent = events.find(({ id }) => id === selectedEventId)
    || myEvents.find(({ id }) => id === selectedEventId)
  const selectedOrganizer = selectedListEvent
    ? organizerProfiles[selectedListEvent.organizerId]
    : null

  return (
    <div className={`app-shell ${isOrganizer ? 'organizer-shell' : 'user-shell'}`}>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Gather home">gather<span>.</span></a>
        <nav className="main-nav" aria-label="Main navigation">
          <button
            className={view === 'events' ? 'nav-link active' : 'nav-link'}
            onClick={() => {
              setView('events')
              setEventTab('all')
            }}
          >
            Events
          </button>
          <button
            className={view === 'profile' ? 'nav-link active' : 'nav-link'}
            onClick={() => setView('profile')}
          >
            Profile
          </button>
          {isOrganizer && (
            <button
              className={view === 'attendees' ? 'nav-link active' : 'nav-link'}
              onClick={() => setView('attendees')}
            >
              Attendees
            </button>
          )}
        </nav>
        <div className="account-nav">
          <span className="role-label">{isOrganizer ? 'Organizer' : 'Member'}</span>
          <span className="avatar" aria-hidden="true">
            {user.name.charAt(0).toUpperCase()}
          </span>
          <button className="logout-button" onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <main className="main-content">
        {view === 'profile' ? (
          <ProfilePage
            key={profile?.id || 'loading'}
            profile={profile}
            isOrganizer={isOrganizer}
            isSaving={isSaving}
            error={pageError}
            onSave={handleProfileSave}
          />
        ) : view === 'event' ? (
          <EventDetails
            key={selectedEventId}
            eventId={selectedEventId}
            organizerName={selectedOrganizer?.organizationName || selectedOrganizer?.name}
            onOpenOrganizer={openOrganizerProfile}
            isOrganizer={isOrganizer}
            isRegistered={registeredEventIds.has(selectedEventId)}
            isBusy={busyEventId === selectedEventId}
            error={pageError}
            onBack={() => {
              setPageError('')
              setView('events')
            }}
            onRegistration={handleRegistration}
          />
        ) : view === 'organizer' ? (
          <OrganizerProfile
            key={selectedOrganizerId}
            organizerId={selectedOrganizerId}
            onBack={() => setView(organizerBackView)}
          />
        ) : view === 'attendees' && isOrganizer ? (
          <OrganizerAttendees
            key={(profile?.events || []).map(({ id }) => id).join(':')}
            events={profile?.events || []}
          />
        ) : (
          <>
            <section className="page-heading">
              <div>
                <p className="role-label">GOA COMMUNITY</p>
                <h1>Events</h1>
              </div>
              {isOrganizer && (
                <button className="button button-primary" onClick={openCreateForm}>
                  <span aria-hidden="true">+</span> Create event
                </button>
              )}
            </section>

            <nav className="event-tabs" aria-label="Event lists">
              <button
                className={eventTab === 'all' ? 'event-tab active' : 'event-tab'}
                onClick={() => setEventTab('all')}
                aria-current={eventTab === 'all' ? 'page' : undefined}
              >
                All Events
              </button>
              <button
                className={eventTab === 'mine' ? 'event-tab active' : 'event-tab'}
                onClick={() => setEventTab('mine')}
                aria-current={eventTab === 'mine' ? 'page' : undefined}
              >
                My Events
              </button>
            </nav>

            {pageError && (
              <div className="notice notice-error" role="alert">
                <span>{pageError}</span>
                <button className="text-button" onClick={loadWorkspace}>
                  Try again
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="screen-state" role="status">Loading events…</div>
            ) : displayedEvents.length === 0 && !pageError ? (
              <div className="empty-state">
                <h2>
                  {eventTab === 'mine'
                    ? isOrganizer ? 'You have not created any events yet' : 'You have not registered for any events yet'
                    : 'No events found'}
                </h2>
                {isOrganizer && eventTab === 'mine' && (
                  <button className="button button-primary" onClick={openCreateForm}>
                    Create event
                  </button>
                )}
              </div>
            ) : (
              <section className="event-grid" aria-label={eventTab === 'mine' ? 'My events' : 'All events'}>
                {displayedEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    organizerName={
                      organizerProfiles[event.organizerId]?.organizationName
                      || organizerProfiles[event.organizerId]?.name
                    }
                    onOpenOrganizer={openOrganizerProfile}
                    canManage={isOrganizer && eventTab === 'mine'}
                    onViewDetails={openEventDetails}
                    onEdit={openEditForm}
                    onDelete={handleDelete}
                  />
                ))}
              </section>
            )}
          </>
        )}
      </main>

      {isFormOpen && isOrganizer && (
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
