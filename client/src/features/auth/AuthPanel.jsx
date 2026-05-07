import { useState } from 'react'
import { api, getApiError } from '../../lib/api'

const emptyLogin = {
  email: '',
  password: '',
}

const emptyRegister = {
  username: '',
  name: '',
  middleName: '',
  lastName: '',
  email: '',
  password: '',
}

export const AuthPanel = ({ onAuth }) => {
  const [mode, setMode] = useState('login')
  const [login, setLogin] = useState(emptyLogin)
  const [register, setRegister] = useState(emptyRegister)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isLogin = mode === 'login'
  const values = isLogin ? login : register

  const updateField = (field, value) => {
    if (isLogin) {
      setLogin((current) => ({ ...current, [field]: value }))
      return
    }
    setRegister((current) => ({ ...current, [field]: value }))
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register'
      const payload = isLogin
        ? login
        : Object.fromEntries(Object.entries(register).filter(([, value]) => value !== ''))
      const { data } = await api.post(endpoint, payload)
      const token = data.token || data.accessToken || data?.[0]
      const user = data.user || null
      if (!token) throw new Error('Auth response did not include a token')
      onAuth({ token, user })
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>

      <section className="auth-shell">

        {/* ── Left: hero ── */}
        <div className="auth-hero">
          <span className="auth-hero-icon">🌿</span>
          <h1 className="auth-hero-title">
            Your cozy corner<br />of the internet.
          </h1>
          <p className="auth-hero-desc">
            Protected rooms, live messages, and warm conversations —<br />
            all in one snug little place. Pull up a chair! ☕
          </p>
          <div className="auth-feature-pills">
            {[
              { icon: '🔒', label: 'Private rooms' },
              { icon: '💬', label: 'Live messaging' },
              { icon: '👀', label: 'Read receipts' },
              { icon: '🌸', label: 'Cozy vibes only' },
            ].map(({ icon, label }) => (
              <div className="auth-feature-pill" key={label}>
                <span>{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: auth card ── */}
        <div className="auth-card">

          <div className="auth-card-header">
            <p className="auth-card-title">
              {isLogin ? '👋 Welcome back!' : '🌱 Join the nest'}
            </p>
            <p className="section-sub" style={{ marginBottom: 0 }}>
              {isLogin ? 'Sign in to your cozy space.' : 'Create your account and settle in.'}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="auth-mode-toggle">
            {['login', 'register'].map((item) => (
              <button
                key={item}
                className={`auth-mode-btn${mode === item ? ' active' : ''}`}
                onClick={() => { setMode(item); setError('') }}
                type="button"
              >
                {item === 'login' ? '🚪 Login' : '✨ Register'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={submit}>
            <div className="auth-fields">
              {!isLogin && (
                <>
                  <input className="cozy-input" placeholder="Username" value={values.username} onChange={(e) => updateField('username', e.target.value)} />
                  <input className="cozy-input" placeholder="First name" value={values.name} onChange={(e) => updateField('name', e.target.value)} />
                  <input className="cozy-input" placeholder="Middle name (optional)" value={values.middleName} onChange={(e) => updateField('middleName', e.target.value)} />
                  <input className="cozy-input" placeholder="Last name" value={values.lastName} onChange={(e) => updateField('lastName', e.target.value)} />
                  <hr className="cozy-divider" />
                </>
              )}
              <input className="cozy-input" placeholder="Email" type="email" value={values.email} onChange={(e) => updateField('email', e.target.value)} />
              <input className="cozy-input" placeholder="Password" type="password" value={values.password} onChange={(e) => updateField('password', e.target.value)} />
            </div>

            {error && <div className="error-banner">⚠️ {error}</div>}

            <button
              className="btn-primary"
              disabled={loading}
              type="submit"
              style={{ marginTop: '1rem' }}
            >
              {loading ? '🌀 Please wait…' : isLogin ? '🏡 Enter chat' : '🌸 Create account'}
            </button>
          </form>

          <div className="auth-switch">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => { setMode(isLogin ? 'register' : 'login'); setError('') }}
            >
              {isLogin ? 'Register here 🌱' : 'Login here 🚪'}
            </button>
          </div>

        </div>
      </section>
    </>
  )
}