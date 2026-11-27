import { useState } from 'react'
import { login, register } from '../api/events'

function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'User',
  })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isRegistering = mode === 'register'

  function changeMode(nextMode) {
    setMode(nextMode)
    setError('')
    setMessage('')
  }

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsSubmitting(true)

    try {
      if (isRegistering) {
        await register(form)
        setMode('login')
        setForm((current) => ({ ...current, password: '' }))
        setMessage('Your account is ready. Sign in to continue.')
      } else {
        const result = await login({
          email: form.email,
          password: form.password,
        })
        onAuthenticated(result)
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <aside className="auth-intro">
          <p className="auth-brand"><span>Local</span> events</p>
          <div className="auth-intro-copy">
            <p className="auth-kicker">YOUR COMMUNITY STARTS HERE</p>
            <h1>Find something worth showing up for.</h1>
            <p>Discover local happenings, save your plans, and meet the people making things happen nearby.</p>
          </div>
          <div className="auth-preview" aria-hidden="true">
            <span className="auth-preview-dot"></span>
            <div>
              <small>THIS WEEKEND</small>
              <strong>Community meetups</strong>
            </div>
            <span className="auth-preview-arrow">→</span>
          </div>
        </aside>

        <div className={`auth-card${isRegistering ? ' auth-card-register' : ''}`}>
          <p className="eyebrow">{isRegistering ? 'JOIN THE COMMUNITY' : 'WELCOME BACK'}</p>
          <h2>{isRegistering ? 'Create account' : 'Sign in'}</h2>
          <p className="auth-subtitle">
            {isRegistering
              ? 'Set up your account to start discovering events.'
              : 'Enter your details to pick up where you left off.'}
          </p>

          <div className="auth-tabs" role="tablist" aria-label="Account options">
            <button
              type="button"
              role="tab"
              aria-selected={!isRegistering}
              className={!isRegistering ? 'active' : ''}
              onClick={() => changeMode('login')}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isRegistering}
              className={isRegistering ? 'active' : ''}
              onClick={() => changeMode('register')}
            >
              Create account
            </button>
          </div>

          {message && <p className="auth-message" role="status">{message}</p>}
          {error && <p className="auth-error" role="alert">{error}</p>}

          <form className="auth-form" onSubmit={handleSubmit}>
            {isRegistering && (
              <>
                <label className="auth-field">
                  Full name
                  <input
                    autoComplete="name"
                    maxLength={120}
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    required
                  />
                </label>
                <label className="auth-field">
                  I’m joining as
                  <select name="role" value={form.role} onChange={handleChange}>
                    <option value="User">Community member</option>
                    <option value="Organizer">Event organizer</option>
                  </select>
                </label>
              </>
            )}

            <label className="auth-field">
              Email address
              <input
                autoComplete="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
              />
            </label>

            <label className="auth-field">
              Password
              <input
                autoComplete={isRegistering ? 'new-password' : 'current-password'}
                minLength={isRegistering ? 8 : undefined}
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder={isRegistering ? 'At least 8 characters' : 'Your password'}
                required
              />
            </label>

            <button className={`button button-primary auth-submit${isRegistering ? ' auth-submit-register' : ''}`} type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Please wait...'
                : isRegistering
                  ? 'Create account'
                  : 'Sign in'}
              {!isSubmitting && <span aria-hidden="true">→</span>}
            </button>
          </form>

        </div>
      </section>
    </main>
  )
}

export default AuthPage
