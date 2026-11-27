import { useEffect, useState } from 'react'
import { getOrganizerProfile } from '../api/events'

function OrganizerProfile({ organizerId, onBack }) {
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let active = true
    getOrganizerProfile(organizerId)
      .then((profileResult) => {
        if (active) setResult(profileResult)
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
  }, [organizerId, retryCount])

  function retry() {
    setIsLoading(true)
    setError('')
    setResult(null)
    setRetryCount((count) => count + 1)
  }

  if (isLoading) {
    return <div className="organizer-profile-state" role="status">Loading organizer profile…</div>
  }

  if (error) {
    return (
      <section className="organizer-profile-state" role="alert">
        <p>{error}</p>
        <button className="button button-quiet" onClick={retry}>Try again</button>
        <button className="button button-quiet" onClick={onBack}>Go back</button>
      </section>
    )
  }

  if (!result) return null

  const { profile } = result
  const displayName = profile.organizationName || profile.name

  return (
    <article className="organizer-profile">
      <button className="event-back-button" onClick={onBack}>
        <span aria-hidden="true">←</span> Go back
      </button>

      <header className="organizer-profile-header">
        <div className="organizer-profile-avatar" aria-hidden="true">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="event-detail-eyebrow">GOA COMMUNITY ORGANIZER</p>
          <h1>{displayName}</h1>
          {profile.organizationName && (
            <p className="organizer-profile-name">Organized by {profile.name}</p>
          )}
        </div>
      </header>

      <section className="organizer-profile-information" aria-label="Organizer profile details">
        <h2>About</h2>
        <p className="organizer-profile-description">
          {profile.description || 'This organizer has not added a description yet.'}
        </p>
        {profile.contactInfo && (
          <div className="organizer-profile-contact">
            <span className="event-fact-label">Contact</span>
            <strong>{profile.contactInfo}</strong>
          </div>
        )}
      </section>
    </article>
  )
}

export default OrganizerProfile
