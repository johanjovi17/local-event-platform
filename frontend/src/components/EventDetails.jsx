import { useEffect, useState } from 'react'
import { getEvent, getEventImageUrl } from '../api/events'
import { eventGalleryImages } from '../eventImages'
import Loader from './Loader'

function formatDate(value) {
  if (!value) return 'Date to be announced'
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(value) {
  if (!value) return ''
  const time = value.includes('T') ? value.slice(11, 16) : value.slice(0, 5)
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function EventDetails({
  eventId,
  organizerName,
  onOpenOrganizer,
  isOrganizer,
  isRegistered,
  isBusy,
  error,
  onBack,
  onRegistration,
}) {
  const [event, setEvent] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [activeImage, setActiveImage] = useState(0)
  const [loadVersion, setLoadVersion] = useState(0)

  useEffect(() => {
    let active = true
    getEvent(eventId)
      .then((result) => {
        if (active) setEvent(result)
      })
      .catch((requestError) => {
        if (active) setLoadError(requestError.message)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [eventId, loadVersion])

  function retryLoading() {
    setIsLoading(true)
    setLoadError('')
    setEvent(null)
    setLoadVersion((version) => version + 1)
  }

  if (isLoading) {
    return (
      <div className="event-detail-state">
        <Loader label="Loading event details" size="large" />
      </div>
    )
  }

  if (loadError) {
    return (
      <section className="event-detail-state" role="alert">
        <p>{loadError}</p>
        <button className="button button-quiet" onClick={retryLoading}>Try again</button>
        <button className="button button-quiet" onClick={onBack}>Back to events</button>
      </section>
    )
  }

  if (!event) return null

  const registrationClosed = event.registrationDeadline
    && event.registrationDeadline.slice(0, 10) < new Date().toISOString().slice(0, 10)
  const canRegister = !isOrganizer && event.status === 'Upcoming' && !registrationClosed
  const carouselImages = event.images?.length
    ? event.images.map((image, index) => ({
        src: getEventImageUrl(image.url),
        alt: `${event.title} event photo ${index + 1}`,
      }))
    : eventGalleryImages
  const currentImage = carouselImages[activeImage]

  function showImage(offset) {
    setActiveImage((current) => (
      (current + offset + carouselImages.length) % carouselImages.length
    ))
  }

  return (
    <article className="event-detail">
      <div className="event-detail-top">
        <button className="event-back-button" onClick={onBack}>
          <span aria-hidden="true">←</span> All events
        </button>
        <span className={`status-pill status-${event.status.toLowerCase()}`}>
          {event.status}
        </span>
      </div>

      <section className="event-gallery" aria-label="Event photos">
        <img key={currentImage.src} src={currentImage.src} alt={currentImage.alt} />
        <div className="gallery-shade" />
        <button
          className="gallery-arrow gallery-previous"
          onClick={() => showImage(-1)}
          aria-label="Previous image"
        >
          ‹
        </button>
        <button
          className="gallery-arrow gallery-next"
          onClick={() => showImage(1)}
          aria-label="Next image"
        >
          ›
        </button>
        <div className="gallery-indicators" aria-label="Choose image">
          {carouselImages.map((image, index) => (
            <button
              key={image.src}
              className={index === activeImage ? 'gallery-indicator active' : 'gallery-indicator'}
              onClick={() => setActiveImage(index)}
              aria-label={`Show image ${index + 1}`}
              aria-current={index === activeImage ? 'true' : undefined}
            />
          ))}
        </div>
        <div className="gallery-caption">
          <span>{event.category}</span>
          <span>{String(activeImage + 1).padStart(2, '0')} / {String(carouselImages.length).padStart(2, '0')}</span>
        </div>
      </section>

      <section className="event-detail-content">
        <div className="event-copy">
          <p className="event-detail-eyebrow">GOA COMMUNITY EVENT</p>
          <h1>{event.title}</h1>
          <p className="event-detail-description">{event.description}</p>
        </div>

        <aside className="event-facts" aria-label="Event information">
          <div className="event-fact">
            <span className="event-fact-icon" aria-hidden="true">◷</span>
            <div><span className="event-fact-label">When</span><strong>{formatDate(event.eventDate)}</strong></div>
          </div>
          <div className="event-fact">
            <span className="event-fact-icon" aria-hidden="true">◴</span>
            <div>
              <span className="event-fact-label">Time</span>
              <strong>{formatTime(event.startTime)} – {formatTime(event.endTime)}</strong>
            </div>
          </div>
          <div className="event-fact">
            <span className="event-fact-icon" aria-hidden="true">⌖</span>
            <div><span className="event-fact-label">Where</span><strong>{event.location}</strong></div>
          </div>
          <div className="event-fact">
            <span className="event-fact-icon" aria-hidden="true">♧</span>
            <div><span className="event-fact-label">Spaces</span><strong>Up to {event.maxAttendees} people</strong></div>
          </div>
          <div className="event-fact">
            <span className="event-fact-icon" aria-hidden="true">⌛</span>
            <div><span className="event-fact-label">Register by</span><strong>{formatDate(event.registrationDeadline)}</strong></div>
          </div>
          {organizerName && (
            <button
              className="event-detail-organizer"
              onClick={() => onOpenOrganizer(event.organizerId)}
              aria-label={`View organizer profile: ${organizerName}`}
            >
              <strong>{organizerName}</strong>
            </button>
          )}
        </aside>
      </section>

      {(error || (registrationClosed && !isRegistered && !isOrganizer)) && (
        <p className="event-detail-error" role="alert">
          {error || 'Registration for this event has closed.'}
        </p>
      )}

      {!isOrganizer && (
        <footer className="event-detail-footer">
          <span className="event-detail-footer-note">
            {isRegistered ? 'You’re on the guest list.' : 'Make a little room for something memorable.'}
          </span>
          <button
            className={isRegistered ? 'button button-quiet' : 'button button-primary'}
            onClick={() => onRegistration(event)}
            disabled={isBusy || (!isRegistered && !canRegister)}
          >
            {isBusy
              ? <Loader label="Updating registration" size="small" />
              : isRegistered
                ? 'Cancel registration'
                : canRegister
                  ? 'Register for event'
                  : 'Registration unavailable'}
          </button>
        </footer>
      )}
    </article>
  )
}

export default EventDetails
