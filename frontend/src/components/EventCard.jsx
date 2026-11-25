function formatDate(value) {
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(value) {
  const time = value.includes('T') ? value.slice(11, 16) : value
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="2.1" y="3.2" width="11.8" height="10.5" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 2v2.5M11 2v2.5M2.5 6.2h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function LocationIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M13 6.5c0 3.4-5 7.3-5 7.3S3 9.9 3 6.5a5 5 0 1 1 10 0Z" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

function EventCard({ event, onEdit, onDelete }) {
  return (
    <article className="event-card">
      <div className="event-card-top">
        <span className="category-pill">{event.category}</span>
        <span className={`status-pill status-${event.status.toLowerCase()}`}>
          {event.status}
        </span>
      </div>
      <h3 title={event.title}>{event.title}</h3>
      <p className="event-description">{event.description}</p>
      <div className="event-details">
        <div className="detail-row">
          <CalendarIcon />
          <span>{formatDate(event.eventDate)} · {formatTime(event.startTime)}–{formatTime(event.endTime)}</span>
        </div>
        <div className="detail-row">
          <LocationIcon />
          <span title={event.location}>{event.location}</span>
        </div>
      </div>
      <div className="event-card-actions">
        <button className="icon-button" onClick={() => onEdit(event)} aria-label={`Edit ${event.title}`}>
          <svg aria-hidden="true" width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="m10.8 2.8 2.4 2.4M2.5 13.5l3-.6 7.5-7.5a1.7 1.7 0 0 0-2.4-2.4L3.1 10.5l-.6 3Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Edit
        </button>
        <button className="icon-button danger" onClick={() => onDelete(event)} aria-label={`Delete ${event.title}`}>
          <svg aria-hidden="true" width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M3.5 4.5h9M6 4.5V3h4v1.5m1.5 0-.5 8h-6l-.5-8M6.5 7v3.5M9.5 7v3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Delete
        </button>
      </div>
    </article>
  )
}

export default EventCard
