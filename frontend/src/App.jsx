import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  cancelEventRegistration,
  createEvent,
  deleteEvent,
  getCurrentUser,
  getEventsPage,
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
import Loader from './components/Loader'
import OrganizerAttendees from './components/OrganizerAttendees'
import OrganizerProfile from './components/OrganizerProfile'
import ProfilePage from './components/ProfilePage'
import ToastViewport from './components/ToastViewport'
import './App.css'

const defaultEventQuery = {
  page: 1,
  pageSize: 9,
  category: '',
  location: '',
  dateFrom: '',
  dateTo: '',
  status: '',
  sortBy: 'eventDate',
  sortOrder: 'asc',
}
const eventCategories = [
  'Music',
  'Technology',
  'Arts',
  'Sports',
  'Food',
  'Business',
  'Education',
  'Community',
  'Other',
]

function filterAndSortEvents(events, query) {
  const filtered = events.filter((event) => (
    (!query.category || event.category === query.category)
    && (!query.status || event.status === query.status)
    && (!query.location || event.location.toLowerCase().includes(query.location.toLowerCase()))
    && (!query.dateFrom || event.eventDate.slice(0, 10) >= query.dateFrom)
    && (!query.dateTo || event.eventDate.slice(0, 10) <= query.dateTo)
  ))

  return filtered.sort((left, right) => {
    const leftValue = left[query.sortBy]
    const rightValue = right[query.sortBy]
    const comparison = query.sortBy === 'eventDate'
      ? leftValue.slice(0, 10).localeCompare(rightValue.slice(0, 10))
      : leftValue.localeCompare(rightValue, undefined, { sensitivity: 'base' })
    return query.sortOrder === 'asc' ? comparison : -comparison
  })
}

function App() {
  const [toasts, setToasts] = useState([])
  const nextToastId = useRef(0)
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(
    () => !sessionStorage.getItem('gather_token'),
  )
  const [profile, setProfile] = useState(null)
  const [events, setEvents] = useState([])
  const [eventQuery, setEventQuery] = useState(defaultEventQuery)
  const [filterDraft, setFilterDraft] = useState(defaultEventQuery)
  const [eventPagination, setEventPagination] = useState({
    currentPage: 1,
    pageSize: defaultEventQuery.pageSize,
    totalRecords: 0,
    totalPages: 0,
  })
  const eventQueryRef = useRef(defaultEventQuery)
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

  const notify = useCallback((message) => {
    const id = nextToastId.current + 1
    nextToastId.current = id
    setToasts((current) => [...current, { id, message }].slice(-4))
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const loadWorkspace = useCallback(async (query = eventQueryRef.current) => {
    setPageError('')
    setIsLoading(true)
    try {
      const [currentProfile, eventPage] = await Promise.all([
        getOwnProfile(),
        getEventsPage(query),
      ])
      const profileEvents = currentProfile.role === 'Organizer'
        ? currentProfile.events || []
        : (currentProfile.registrations || [])
          .map(({ event }) => event)
          .filter(Boolean)
      const directory = new Map(organizerProfilesCache.current)
      if (currentProfile.role === 'Organizer') {
        directory.set(currentProfile.id, currentProfile)
      }
      const organizerIds = [...new Set(
        [...eventPage.data, ...profileEvents]
          .map(({ organizerId }) => organizerId)
          .filter(Boolean),
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
      setEvents(eventPage.data)
      setEventPagination(eventPage.pagination)
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

  const isOrganizer = user?.role === 'Organizer'
  const myEvents = useMemo(
    () => (isOrganizer
      ? profile?.events || []
      : (profile?.registrations || [])
        .map(({ event }) => event)
        .filter(Boolean)),
    [isOrganizer, profile],
  )
  const filteredMyEvents = useMemo(
    () => filterAndSortEvents(myEvents, eventQuery),
    [myEvents, eventQuery],
  )
  const myEventsTotalPages = Math.ceil(filteredMyEvents.length / eventQuery.pageSize)
  const displayedEvents = eventTab === 'all'
    ? events
    : filteredMyEvents.slice(
        (eventQuery.page - 1) * eventQuery.pageSize,
        eventQuery.page * eventQuery.pageSize,
      )
  const displayedPagination = eventTab === 'all'
    ? eventPagination
    : {
        currentPage: eventQuery.page,
        pageSize: eventQuery.pageSize,
        totalRecords: filteredMyEvents.length,
        totalPages: myEventsTotalPages,
      }

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
    notify(wasCreating ? 'Event created.' : 'Event updated.')
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
      const nextQuery = {
        ...eventQueryRef.current,
        ...(displayedEvents.length === 1 && eventQueryRef.current.page > 1
          ? { page: eventQueryRef.current.page - 1 }
          : {}),
      }
      eventQueryRef.current = nextQuery
      setEventQuery(nextQuery)
      setFilterDraft(nextQuery)
      await loadWorkspace(nextQuery)
      notify('Event deleted.')
    } catch (error) {
      setPageError(error.message)
    }
  }

  async function handleRegistration(event) {
    setBusyEventId(event.id)
    setPageError('')
    try {
      const wasRegistered = registeredEventIds.has(event.id)
      if (wasRegistered) {
        await cancelEventRegistration(event.id)
      } else {
        await registerForEvent(event.id)
      }
      await loadWorkspace()
      notify(
        wasRegistered ? 'Registration cancelled.' : 'You’re registered for this event.',
      )
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
    notify('Signed in successfully.')
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
    notify('You’ve been signed out.')
  }

  if (!authReady) {
    return (
      <div className="screen-state">
        <Loader label="Loading your session" size="large" />
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <AuthPage onAuthenticated={handleAuthenticated} onToast={notify} />
        <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      </>
    )
  }

  async function applyEventQuery(nextQuery) {
    eventQueryRef.current = nextQuery
    setEventQuery(nextQuery)
    setFilterDraft(nextQuery)
    await loadWorkspace(nextQuery)
  }

  async function handleFilterSubmit(event) {
    event.preventDefault()
    await applyEventQuery({ ...filterDraft, page: 1 })
  }

  async function clearEventFilters() {
    await applyEventQuery(defaultEventQuery)
  }

  async function changeEventPage(page) {
    const nextQuery = { ...eventQueryRef.current, page }
    eventQueryRef.current = nextQuery
    setEventQuery(nextQuery)
    setFilterDraft(nextQuery)
    if (eventTab === 'all') {
      await loadWorkspace(nextQuery)
    }
  }

  async function changeEventTab(tab) {
    setEventTab(tab)
    const nextQuery = { ...eventQueryRef.current, page: 1 }
    eventQueryRef.current = nextQuery
    setEventQuery(nextQuery)
    setFilterDraft(nextQuery)
    if (tab === 'all') {
      await loadWorkspace(nextQuery)
    }
  }
  const selectedListEvent = events.find(({ id }) => id === selectedEventId)
    || myEvents.find(({ id }) => id === selectedEventId)
  const selectedOrganizer = selectedListEvent
    ? organizerProfiles[selectedListEvent.organizerId]
    : null

  return (
    <div className={`app-shell ${isOrganizer ? 'organizer-shell' : 'user-shell'}`}>
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
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
                onClick={() => changeEventTab('all')}
                aria-current={eventTab === 'all' ? 'page' : undefined}
              >
                All Events
              </button>
              <button
                className={eventTab === 'mine' ? 'event-tab active' : 'event-tab'}
                onClick={() => changeEventTab('mine')}
                aria-current={eventTab === 'mine' ? 'page' : undefined}
              >
                My Events
              </button>
            </nav>

            {pageError && (
              <div className="notice notice-error" role="alert">
                <span>{pageError}</span>
                <button className="text-button" onClick={() => loadWorkspace()}>
                  Try again
                </button>
              </div>
            )}

            <form className="event-filters" onSubmit={handleFilterSubmit}>
              <label className="event-filter-field">
                Category
                <select
                  value={filterDraft.category}
                  onChange={(event) => setFilterDraft((current) => ({
                    ...current,
                    category: event.target.value,
                  }))}
                >
                  <option value="">All categories</option>
                  {eventCategories.map((category) => <option key={category}>{category}</option>)}
                </select>
              </label>
              <label className="event-filter-field">
                Location
                <input
                  value={filterDraft.location}
                  onChange={(event) => setFilterDraft((current) => ({
                    ...current,
                    location: event.target.value,
                  }))}
                  placeholder="Filter by town or venue"
                />
              </label>
              <label className="event-filter-field">
                From
                <input
                  type="date"
                  value={filterDraft.dateFrom}
                  onChange={(event) => setFilterDraft((current) => ({
                    ...current,
                    dateFrom: event.target.value,
                  }))}
                />
              </label>
              <label className="event-filter-field">
                To
                <input
                  type="date"
                  value={filterDraft.dateTo}
                  onChange={(event) => setFilterDraft((current) => ({
                    ...current,
                    dateTo: event.target.value,
                  }))}
                />
              </label>
              <label className="event-filter-field">
                Status
                <select
                  value={filterDraft.status}
                  onChange={(event) => setFilterDraft((current) => ({
                    ...current,
                    status: event.target.value,
                  }))}
                >
                  <option value="">All statuses</option>
                  {['Upcoming', 'Ongoing', 'Completed', 'Cancelled']
                    .map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
              <label className="event-filter-field">
                Sort by
                <select
                  value={filterDraft.sortBy}
                  onChange={(event) => setFilterDraft((current) => ({
                    ...current,
                    sortBy: event.target.value,
                  }))}
                >
                  <option value="eventDate">Date</option>
                  <option value="title">Title</option>
                  <option value="location">Location</option>
                </select>
              </label>
              <label className="event-filter-field">
                Order
                <select
                  value={filterDraft.sortOrder}
                  onChange={(event) => setFilterDraft((current) => ({
                    ...current,
                    sortOrder: event.target.value,
                  }))}
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </label>
              <div className="event-filter-actions">
                <button className="button button-primary" type="submit">Apply filters</button>
                <button className="button button-quiet" type="button" onClick={clearEventFilters}>
                  Clear
                </button>
              </div>
            </form>

            {isLoading ? (
              <div className="screen-state">
                <Loader label="Loading events" size="large" />
              </div>
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
            {!isLoading && displayedPagination.totalRecords > 0 && (
              <nav className="event-pagination" aria-label="Event pages">
                <span>
                  Showing {(displayedPagination.currentPage - 1) * displayedPagination.pageSize + 1}
                  {'–'}
                  {Math.min(
                    displayedPagination.currentPage * displayedPagination.pageSize,
                    displayedPagination.totalRecords,
                  )}
                  {' '}of {displayedPagination.totalRecords}
                </span>
                <div>
                  <button
                    className="button button-quiet"
                    type="button"
                    onClick={() => changeEventPage(displayedPagination.currentPage - 1)}
                    disabled={displayedPagination.currentPage <= 1}
                  >
                    Previous
                  </button>
                  <span className="event-page-number">
                    Page {displayedPagination.currentPage} of {displayedPagination.totalPages}
                  </span>
                  <button
                    className="button button-quiet"
                    type="button"
                    onClick={() => changeEventPage(displayedPagination.currentPage + 1)}
                    disabled={displayedPagination.currentPage >= displayedPagination.totalPages}
                  >
                    Next
                  </button>
                </div>
              </nav>
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
