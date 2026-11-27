import { useState } from 'react'

function ProfilePage({ profile, isOrganizer, isSaving, error, onSave }) {
  const [form, setForm] = useState(() => ({
    name: profile?.name || '',
    email: profile?.email || '',
    organizationName: profile?.organizationName || '',
    description: profile?.description || '',
    contactInfo: profile?.contactInfo || '',
  }))
  const [saveError, setSaveError] = useState('')

  function handleChange(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaveError('')
    const data = isOrganizer
      ? {
          name: form.name,
          organizationName: form.organizationName || null,
          description: form.description || null,
          contactInfo: form.contactInfo || null,
        }
      : { name: form.name, email: form.email }

    try {
      await onSave(data)
    } catch (requestError) {
      setSaveError(requestError.message)
    }
  }

  if (!profile) {
    return <div className="screen-state" role="status">Loading profile…</div>
  }

  return (
    <section className="profile-layout">
      <header className="page-heading">
        <div>
          <p className="role-label">{isOrganizer ? 'ORGANIZER' : 'MEMBER'}</p>
          <h1>Profile</h1>
        </div>
      </header>

      <div className="profile-grid">
        <form className="profile-card profile-form" onSubmit={handleSubmit}>
          <label className="form-field">
            Name
            <input
              name="name"
              maxLength={120}
              value={form.name}
              onChange={handleChange}
              required
            />
          </label>

          {!isOrganizer && (
            <label className="form-field">
              Email
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </label>
          )}

          {isOrganizer && (
            <>
              <label className="form-field">
                Organization
                <input
                  name="organizationName"
                  maxLength={160}
                  value={form.organizationName}
                  onChange={handleChange}
                />
              </label>
              <label className="form-field">
                About
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                />
              </label>
              <label className="form-field">
                Contact information
                <input
                  name="contactInfo"
                  maxLength={255}
                  value={form.contactInfo}
                  onChange={handleChange}
                />
              </label>
            </>
          )}

          {(saveError || error) && (
            <p className="form-error" role="alert">{saveError || error}</p>
          )}
          <button className="button button-primary" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save profile'}
          </button>
        </form>

        <section className="profile-card">
          <h2>{isOrganizer ? 'Your events' : 'Your registrations'}</h2>
          {isOrganizer ? (
            profile.events?.length ? (
              <ul className="profile-list">
                {profile.events.map((event) => (
                  <li key={event.id}>
                    <strong>{event.title}</strong>
                    <span>{event.eventDate.slice(0, 10)} · {event.location}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="muted-copy">No events yet.</p>
          ) : (
            profile.registrations?.length ? (
              <ul className="profile-list">
                {profile.registrations.map((registration) => (
                  <li key={registration.id}>
                    <strong>{registration.event.title}</strong>
                    <span>
                      {registration.event.eventDate.slice(0, 10)} · {registration.event.location}
                    </span>
                  </li>
                ))}
              </ul>
            ) : <p className="muted-copy">No registrations yet.</p>
          )}
        </section>
      </div>
    </section>
  )
}

export default ProfilePage
