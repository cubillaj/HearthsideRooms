// import { useEffect, useState } from 'react'
// import { AuthPanel } from './features/auth/AuthPanel'
// import { ChatShell } from './features/chat/ChatShell'
// import { api, clearAccessToken, setAccessToken } from './lib/api'

// const App = () => {
//   const [token, setToken] = useState(null)
//   const [user, setUser] = useState(null)
//   const [checkingSession, setCheckingSession] = useState(true)

//   const handleAuth = ({ token: nextToken, user: nextUser }) => {
//     setAccessToken(nextToken)
//     setToken(nextToken)
//     setUser(nextUser)
//   }

//   const handleLogout = async () => {
//     try {
//       await api.post('/auth/logout')
//     } catch {
//       // The local session should still clear even if the server cookie is already gone.
//     }

//     clearAccessToken()
//     setToken(null)
//     setUser(null)
//   }

//   useEffect(() => {
//     let mounted = true

//     api.post('/auth/refresh')
//       .then(({ data }) => {
//         if (!mounted || !data.token) {
//           return
//         }

//         handleAuth({
//           token: data.token,
//           user: data.user || null,
//         })
//       })
//       .catch(() => {
//         clearAccessToken()
//         setToken(null)
//         setUser(null)
//       })
//       .finally(() => {
//         if (mounted) {
//           setCheckingSession(false)
//         }
//       })

//     return () => {
//       mounted = false
//     }
//   }, [])

//   return (
//     <main className="min-h-screen bg-[#f5efe7] text-stone-900">
//       <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
//         <header className="flex flex-col justify-between gap-4 border-b border-stone-300/70 pb-5 sm:flex-row sm:items-end">
//           <div>
//             <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
//               Socket Group Chat
//             </p>
//             <h1 className="mt-2 text-3xl font-semibold text-stone-950 sm:text-4xl">
//               Hearthside Rooms
//             </h1>
//           </div>

//           <div className="flex items-center gap-3 rounded-md border border-stone-300 bg-white/70 px-3 py-2 shadow-sm">
//             <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
//             <span className="text-sm text-stone-700">
//               {token ? user?.username || user?.email || 'Signed in' : 'Guest session'}
//             </span>
//             {token && (
//               <button
//                 className="rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-stone-700"
//                 onClick={handleLogout}
//                 type="button"
//               >
//                 Logout
//               </button>
//             )}
//           </div>
//         </header>

//         {checkingSession ? (
//           <section className="grid flex-1 place-items-center">
//             <p className="rounded-md border border-stone-300 bg-white/70 px-4 py-3 text-sm text-stone-700 shadow-sm">
//               Checking your session...
//             </p>
//           </section>
//         ) : token ? (
//           <ChatShell key={`${user?.id || 'user'}-${token}`} token={token} user={user} />
//         ) : (
//           <AuthPanel onAuth={handleAuth} />
//         )}
//       </div>
//     </main>
//   )
// }

// export default App

import { useEffect, useState } from 'react'
import { AuthPanel } from './features/auth/AuthPanel'
import { ChatShell } from './features/chat/ChatShell'
import { api, clearAccessToken, setAccessToken } from './lib/api'

const App = () => {
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
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
          <ChatShell key={`${user?.id || 'user'}-${token}`} token={token} user={user} />
        ) : (
          <AuthPanel onAuth={handleAuth} />
        )}

      </div>
    </main>
  )
}

export default App