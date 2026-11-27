import { eventGalleryImages } from '../eventImages'
import { getEventImageUrl } from '../api/events'

function EventCard({
  event,
  organizerName,
  canManage,
  onViewDetails,
  onOpenOrganizer,
  onEdit,
  onDelete,
}) {
  function handleCardKeyDown(keyEvent) {
    if (keyEvent.target !== keyEvent.currentTarget || keyEvent.key !== 'Enter') return
    keyEvent.preventDefault()
    onViewDetails(event)
  }

  return (
    <article
      className="event-card"
      role="link"
      tabIndex={0}
      aria-label={`View details for ${event.title}`}
      onClick={() => onViewDetails(event)}
      onKeyDown={handleCardKeyDown}
    >
      <img
        className="event-card-image"
        src={event.images?.length
          ? getEventImageUrl(event.images[0].url)
          : eventGalleryImages[0].src}
        alt={event.images?.length ? `${event.title} event photo` : eventGalleryImages[0].alt}
        loading="lazy"
      />
      <div className="event-card-body">
        <h2>{event.title}</h2>
        <span className={`status-pill status-${event.status.toLowerCase()}`}>
          {event.status}
        </span>
        {organizerName && (
          <button
            className="event-card-organizer"
            onClick={(clickEvent) => {
              clickEvent.stopPropagation()
              onOpenOrganizer(event.organizerId)
            }}
            onKeyDown={(keyEvent) => keyEvent.stopPropagation()}
            aria-label={`View organizer profile: ${organizerName}`}
          >
            <strong>{organizerName}</strong>
          </button>
        )}
      </div>
      {canManage && (
        <div
          className="event-card-actions"
          onClick={(clickEvent) => clickEvent.stopPropagation()}
          onKeyDown={(keyEvent) => keyEvent.stopPropagation()}
        >
          <button className="button button-quiet" onClick={() => onEdit(event)}>Edit</button>
          <button className="button button-danger" onClick={() => onDelete(event)}>Delete</button>
        </div>
      )}
    </article>
  )
}

export default EventCard
