import { useEffect, useState } from 'react'
import { AuthPanel } from './features/auth/AuthPanel'
import { ChatShell } from './features/chat/ChatShell'
import { ProfilePage } from './features/profile/ProfilePage'
import { api, clearAccessToken, setAccessToken } from './lib/api'

const App = () => {
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [view, setView] = useState('chat')
  const [checkingSession, setCheckingSession] = useState(true)

  const handleAuth = ({ token: nextToken, user: nextUser }) => {
    setAccessToken(nextToken)
    setToken(nextToken)
    setUser(nextUser)
  }

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // The local session should still clear even if the server cookie is already gone.
    }

    clearAccessToken()
    setToken(null)
    setUser(null)
    setView('chat')
  }

  useEffect(() => {
    let mounted = true

    api.post('/auth/refresh')
      .then(({ data }) => {
        if (!mounted || !data.token) return

        handleAuth({
          token: data.token,
          user: data.user || null,
        })
      })
      .catch(() => {
        clearAccessToken()
        setToken(null)
        setUser(null)
      })
      .finally(() => {
        if (mounted) setCheckingSession(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  return (
    <main className="app-shell">
      <div className="app-container">

        <header className="app-header">
          <div>
            <p className="app-header-eyebrow">🌿 Hearth</p>
            <h1 className="app-header-title">🏡 Hearthside Rooms</h1>
          </div>

          <div className="session-badge">
            <span className="status-dot" />
            <span className="session-badge-name">
              {token ? user?.username || user?.email || 'Signed in' : 'Guest session'}
            </span>
            {token && (
              <button
                className="btn-logout"
                onClick={handleLogout}
                type="button"
              >
                Logout 👋
              </button>
            )}
          </div>
        </header>

        {checkingSession ? (
          <section className="checking-session">
            <div className="empty-card">
              <div className="empty-icon">☕</div>
              <h3>Just a moment…</h3>
              <p>Checking your session, hang tight!</p>
            </div>
          </section>
        ) : token ? (
          view === 'profile' ? (
            <ProfilePage
              onBack={() => setView('chat')}
              onUserUpdate={(nextUser) => {
                if (nextUser) setUser((current) => ({ ...current, ...nextUser }))
              }}
              user={user}
            />
          ) : (
            <ChatShell
              key={`${user?.id || 'user'}-${token}`}
              onOpenProfile={() => setView('profile')}
              token={token}
              user={user}
            />
          )
        ) : (
          <AuthPanel onAuth={handleAuth} />
        )}

      </div>
    </main>
  )
}

export default App
