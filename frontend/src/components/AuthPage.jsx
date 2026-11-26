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
      <section className="auth-intro">
        <a className="brand" href="/" aria-label="Gather home">
          <span className="brand-mark" aria-hidden="true">g</span>
          <span>gather<span className="brand-period">.</span></span>
        </a>
        <div className="auth-story">
          <p className="eyebrow">YOUR COMMUNITY, TOGETHER</p>
          <h1>Good things happen when we gather.</h1>
          <p>Bring your community closer, one event at a time.</p>
          <div className="auth-decoration" aria-hidden="true">
            <span>✳</span><span>✦</span><span>✳</span>
          </div>
        </div>
        <p className="auth-footer">Made for bringing people together.</p>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <p className="eyebrow">{isRegistering ? 'JOIN THE COMMUNITY' : 'WELCOME BACK'}</p>
          <h2>{isRegistering ? 'Create your account' : 'Sign in to Gather'}</h2>
          <p className="auth-subtitle">
            {isRegistering
              ? 'A few details and you’re ready to bring people together.'
              : 'Your next gathering is just around the corner.'}
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

            <button className="button button-primary auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Please wait...'
                : isRegistering
                  ? 'Create account'
                  : 'Sign in'}
              {!isSubmitting && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <p className="auth-privacy">
            Your account details are kept secure and only used to support your events.
          </p>
        </div>
      </section>
    </main>
  )
}

export default AuthPage
