import { useState } from 'react'
import { MAX_EVENT_IMAGES } from '../eventImages'
import Loader from './Loader'

const categories = [
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
const statuses = ['Upcoming', 'Ongoing', 'Completed', 'Cancelled']

function dateValue(value) {
  return value ? value.slice(0, 10) : ''
}

function timeValue(value) {
  return value ? (value.includes('T') ? value.slice(11, 16) : value.slice(0, 5)) : ''
}

function getInitialForm(event) {
  if (!event) {
    return {
      title: '',
      description: '',
      category: '',
      location: '',
      eventDate: '',
      startTime: '',
      endTime: '',
      maxAttendees: '',
      registrationDeadline: '',
      status: 'Upcoming',
    }
  }

  return {
    title: event.title,
    description: event.description,
    category: event.category,
    location: event.location,
    eventDate: dateValue(event.eventDate),
    startTime: timeValue(event.startTime),
    endTime: timeValue(event.endTime),
    maxAttendees: String(event.maxAttendees),
    registrationDeadline: dateValue(event.registrationDeadline),
    status: event.status,
  }
}

function EventForm({ event, error, isSaving, onClose, onSave }) {
  const [form, setForm] = useState(() => getInitialForm(event))
  const [imageFiles, setImageFiles] = useState([])
  const [imageError, setImageError] = useState('')
  const existingImageCount = event?.images?.length || 0

  function handleChange(e) {
    const { name, value } = e.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function handleImageChange(e) {
    const selectedFiles = Array.from(e.target.files || [])
    if (existingImageCount + selectedFiles.length > MAX_EVENT_IMAGES) {
      setImageFiles([])
      setImageError(`An event can have no more than ${MAX_EVENT_IMAGES} images total.`)
      e.target.value = ''
      return
    }
    setImageError('')
    setImageFiles(selectedFiles)
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSave({
      ...form,
      maxAttendees: Number(form.maxAttendees),
      ...(event ? {} : { status: undefined }),
    }, imageFiles)
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <section
        className="event-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-form-title"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">{event ? 'MAKE IT JUST RIGHT' : 'START SOMETHING GOOD'}</p>
            <h2 id="event-form-title">{event ? 'Edit event' : 'Create an event'}</h2>
            <p>Good plans start with the little details.</p>
          </div>
          <button className="form-close" type="button" onClick={onClose} aria-label="Close form">
            ×
          </button>
        </div>

        <form className="event-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="form-field full-width">
              Event name
              <input
                autoFocus
                required
                maxLength={200}
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Sunday in the garden"
              />
            </label>

            <label className="form-field full-width">
              Description
              <textarea
                required
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="What are you bringing everyone together for?"
              />
            </label>

            <label className="form-field">
              Category
              <select required name="category" value={form.category} onChange={handleChange}>
                <option value="" disabled>Choose a category</option>
                {categories.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>

            {event && (
              <label className="form-field">
                Status
                <select name="status" value={form.status} onChange={handleChange}>
                  {statuses.map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
            )}

            <label className="form-field full-width">
              Location
              <input
                required
                maxLength={255}
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="Where is it happening?"
              />
            </label>

            <label className="form-field">
              Event date
              <input required type="date" name="eventDate" value={form.eventDate} onChange={handleChange} />
            </label>
            <label className="form-field">
              Registration deadline
              <input required type="date" name="registrationDeadline" value={form.registrationDeadline} onChange={handleChange} />
            </label>

            <label className="form-field">
              Start time
              <input required type="time" name="startTime" value={form.startTime} onChange={handleChange} />
            </label>
            <label className="form-field">
              End time
              <input required type="time" name="endTime" value={form.endTime} onChange={handleChange} />
            </label>

            <label className="form-field">
              Maximum attendees
              <input required min="1" step="1" type="number" name="maxAttendees" value={form.maxAttendees} onChange={handleChange} placeholder="e.g. 50" />
            </label>

            <label className="form-field full-width">
              Event images
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleImageChange}
                disabled={existingImageCount >= MAX_EVENT_IMAGES}
              />
              <span className="field-hint">
                {existingImageCount + imageFiles.length} of {MAX_EVENT_IMAGES} images · JPEG, PNG, or WebP, up to 8 MB each
              </span>
            </label>
          </div>

          {imageError && <p className="form-error" role="alert">{imageError}</p>}
          {error && <p className="form-error" role="alert">{error}</p>}

          <div className="modal-actions">
            <button className="button button-secondary" type="button" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button
              className="button button-primary"
              type="submit"
              disabled={isSaving || Boolean(imageError)}
            >
              {isSaving
                ? <Loader label="Saving event" size="small" />
                : event ? 'Save changes' : 'Create event'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default EventForm
