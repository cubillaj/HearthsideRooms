import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, getApiError } from '../../lib/api'
import { createSocket } from '../../lib/socket'

export const ChatShell = ({ token, user, onOpenProfile }) => {
  const socket = useMemo(() => createSocket(token), [token])
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomPassword, setNewRoomPassword] = useState('')
  const [roomId, setRoomId] = useState('')
  const [roomPassword, setRoomPassword] = useState('')
  const [activeRoom, setActiveRoom] = useState(null)
  const [activeRoomName, setActiveRoomName] = useState('')
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [rooms, setRooms] = useState([])
  const [myRooms, setMyRooms] = useState([])
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [messagePage, setMessagePage] = useState(1)
  const [hasOlderMessages, setHasOlderMessages] = useState(false)
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false)
  const [typingUsers, setTypingUsers] = useState({})
  const [onlineUserIds, setOnlineUserIds] = useState([])
  const [status, setStatus] = useState('Socket connecting...')
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const activeRoomRef = useRef(null)
  const scrollRef = useRef(null)
  const messagesAreaRef = useRef(null)
  const shouldScrollToBottomRef = useRef(true)
  const loadingOlderRef = useRef(false)
  const typingTimeoutRef = useRef(null)

  const addReadReceipt = useCallback((receipt) => {
    setMessages((current) => current.map((item) => {
      if (item.id !== receipt.messageId) return item
      const existingReads = item.messageReads || []
      const alreadyExists = existingReads.some((read) => read.user?.id === receipt.user?.id)
      if (alreadyExists) return item
      return { ...item, messageReads: [...existingReads, receipt] }
    }))
  }, [])

  useEffect(() => { activeRoomRef.current = activeRoom }, [activeRoom])

  useEffect(() => {
    socket.on('connect', () => setStatus('Connected ✦'))
    socket.on('connect_error', (err) => setStatus(err.message || 'Socket failed'))
    socket.on('joined_room', (data) => {
      setActiveRoom(data.roomId)
      setStatus(`Joined room ${data.roomId}`)
    })
    socket.on('join_room_error', (data) => setError(data.message || 'Failed to join room'))
    socket.on('message_error', (data) => setError(data.message || 'Failed to send message'))
    socket.on('typing_error', (data) => setError(data.message || 'Typing indicator failed'))
    socket.on('message_read_receipt', addReadReceipt)
    socket.on('online_users', (userIds) => {
      setOnlineUserIds((Array.isArray(userIds) ? userIds : []).map(Number).filter(Number.isFinite))
    })
    socket.on('room_created', (room) => {
      if (!room?.id) return

      setRooms((current) => {
        if (current.some((item) => item.id === room.id)) return current

        return [room, ...current]
      })
    })
    socket.on('user_typing', (data) => {
      if (data.roomId !== activeRoomRef.current || Number(data.userId) === Number(user?.id)) return

      setTypingUsers((current) => ({
        ...current,
        [data.userId]: data.username || `User ${data.userId}`,
      }))
    })
    socket.on('user_stopped_typing', (data) => {
      setTypingUsers((current) => {
        const next = { ...current }
        delete next[data.userId]
        return next
      })
    })
    socket.on('receive_message', (nextMessage) => {
      if (nextMessage.roomId !== activeRoomRef.current) return
      shouldScrollToBottomRef.current = true
      setMessages((current) => [...current, nextMessage])
      setTypingUsers((current) => {
        const next = { ...current }
        delete nextMessage.userId
        return next
      })
      if (Number(nextMessage.userId) !== Number(user?.id)) {
        socket.emit('mark_message_read', { roomId: nextMessage.roomId, messageId: nextMessage.id })
      }
    })
    socket.connect()
    return () => {
      socket.off('connect'); socket.off('connect_error'); socket.off('joined_room')
      socket.off('join_room_error'); socket.off('message_error')
      socket.off('typing_error'); socket.off('message_read_receipt')
      socket.off('online_users')
      socket.off('room_created')
      socket.off('user_typing'); socket.off('user_stopped_typing')
      socket.off('receive_message')
      clearTimeout(typingTimeoutRef.current)
      socket.disconnect()
    }
  }, [addReadReceipt, socket, user?.id])

  useEffect(() => {
    if (!shouldScrollToBottomRef.current) return

    requestAnimationFrame(() => {
      const el = messagesAreaRef.current

      if (el) {
        el.scrollTop = el.scrollHeight
        return
      }

      scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
    })
  }, [messages])

  const loadRooms = useCallback(async () => {
    try {
      const [allRoomsResponse, myRoomsResponse] = await Promise.all([
        api.get('/rooms'), api.get('/rooms/my'),
      ])
      setRooms(allRoomsResponse.data.rooms || [])
      setMyRooms(myRoomsResponse.data.rooms || [])
    } catch (err) { setError(getApiError(err)) }
  }, [])

  const loadMessageHistory = useCallback(async (nextRoomId) => {
    try {
      const { data } = await api.get(`/messages/${nextRoomId}/messages`)
      const nextMessages = data.messages || []
      shouldScrollToBottomRef.current = true
      setMessages(nextMessages)
      setMessagePage(1)
      setHasOlderMessages(Boolean(data.pagination?.hasNextPage))
      socket.emit('mark_room_read', {
        roomId: nextRoomId,
        messageIds: nextMessages.map((item) => item.id).filter(Boolean),
      })
    } catch (err) {
      setError(getApiError(err))
      setMessages([])
      setMessagePage(1)
      setHasOlderMessages(false)
    }
  }, [socket])

  const loadOlderMessages = useCallback(async () => {
    if (!activeRoom || !hasOlderMessages || loadingOlderRef.current) return

    const el = messagesAreaRef.current
    const previousScrollHeight = el?.scrollHeight || 0
    const nextPage = messagePage + 1

    loadingOlderRef.current = true
    setLoadingOlderMessages(true)

    try {
      const { data } = await api.get(`/messages/${activeRoom}/messages?page=${nextPage}&limit=50`)
      const olderMessages = data.messages || []

      shouldScrollToBottomRef.current = false
      setMessages((current) => {
        const existingIds = new Set(current.map((item) => item.id))
        const uniqueOlderMessages = olderMessages.filter((item) => !existingIds.has(item.id))

        return [...uniqueOlderMessages, ...current]
      })
      setMessagePage(nextPage)
      setHasOlderMessages(Boolean(data.pagination?.hasNextPage))

      requestAnimationFrame(() => {
        if (!el) return

        el.scrollTop = el.scrollHeight - previousScrollHeight
      })
    } catch (err) {
      setError(getApiError(err))
    } finally {
      loadingOlderRef.current = false
      setLoadingOlderMessages(false)
    }
  }, [activeRoom, hasOlderMessages, messagePage])

  const handleMessagesScroll = useCallback(() => {
    const el = messagesAreaRef.current

    if (!el || el.scrollTop > 80) return

    loadOlderMessages()
  }, [loadOlderMessages])

  useEffect(() => { queueMicrotask(() => { loadRooms() }) }, [loadRooms])

  const joinRoom = async (event) => {
    event.preventDefault()
    setError('')
    const nextRoomId = Number(roomId)
    if (!nextRoomId) { setError('Room id is required'); return }
    try {
      await api.post(`/rooms/${nextRoomId}/join`, roomPassword ? { roomPassword } : {})
      const selectedRoom = rooms.find((room) => room.id === nextRoomId)
      socket.emit('join_room', nextRoomId)
      setActiveRoomName(selectedRoom?.roomName || `Room ${nextRoomId}`)
      setSelectedRoom(null)
      setTypingUsers({})
      loadMessageHistory(nextRoomId)
      setRoomPassword('')
      loadRooms()
      setSidebarOpen(false)
      setStatus(selectedRoom ? `You are in ${selectedRoom.roomName}` : `You are in room ${nextRoomId}`)
    } catch (err) { setError(getApiError(err)) }
  }

  const createRoom = async (event) => {
    event.preventDefault()
    setError('')
    if (!newRoomName.trim()) { setError('Room name is required'); return }
    try {
      const payload = { roomName: newRoomName.trim(), ...(newRoomPassword ? { roomPassword: newRoomPassword } : {}) }
      const { data } = await api.post('/rooms', payload)
      const createdRoomId = data.room?.id
      if (createdRoomId) {
        setRoomId(String(createdRoomId))
        setRoomPassword('')
        setMessages([])
        setMessagePage(1)
        setHasOlderMessages(false)
        socket.emit('join_room', createdRoomId)
        setActiveRoomName(payload.roomName)
        setSelectedRoom(null)
        setTypingUsers({})
        setSidebarOpen(false)
      }
      setNewRoomName('')
      setNewRoomPassword('')
      setStatus(`Created ${payload.roomName}`)
      loadRooms()
    } catch (err) { setError(getApiError(err)) }
  }

  const selectRoom = (room) => {
    setRoomId(String(room.id))
    setError('')
    setSelectedRoom(room)
    const alreadyJoined = myRooms.some((item) => item.id === room.id)
    if (alreadyJoined) {
      socket.emit('join_room', room.id)
      setActiveRoomName(room.roomName)
      setSelectedRoom(null)
      setStatus(`You are already in ${room.roomName}`)
      setTypingUsers({})
      loadMessageHistory(room.id)
      setSidebarOpen(false)
      return
    }
    setStatus(room.hasPassword ? `${room.roomName} needs a password` : `Ready to join ${room.roomName}`)
    setActiveRoom(null)
    setActiveRoomName(room.roomName)
    setMessages([])
    setMessagePage(1)
    setHasOlderMessages(false)
    setTypingUsers({})
  }

  const handleMessageChange = (event) => {
    const nextMessage = event.target.value
    setMessage(nextMessage)

    if (!activeRoom) return

    socket.emit('typing_start', activeRoom)
    clearTimeout(typingTimeoutRef.current)

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', activeRoom)
    }, 900)
  }

  const sendMessage = (event) => {
    event.preventDefault()
    if (!activeRoom || !message.trim()) return
    socket.emit('new_message', { roomId: activeRoom, message: message.trim() })
    socket.emit('typing_stop', activeRoom)
    clearTimeout(typingTimeoutRef.current)
    setMessage('')
  }

  const typingNames = Object.values(typingUsers)

  return (
    <>
      {/* Mobile sidebar overlay */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Mobile toggle */}
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(true)} type="button">
        🏡 Rooms
      </button>

      <section className="chat-shell">
        {/* ── Sidebar ── */}
        <aside className={`chat-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="sidebar-header">
            <div>
              <div className="sidebar-title">🌿 Cozy Chat</div>
              <div className="status-badge">
                <span className="status-dot" />
                {status}
              </div>
              <div className="status-badge">
                <span className="status-dot" />
                {onlineUserIds.length} online
              </div>
            </div>
            <button className="close-sidebar-btn block md:hidden" onClick={() => setSidebarOpen(false)} type="button" aria-label="Close sidebar">✕</button>
          </div>

          <button
            className="profile-open-btn"
            onClick={() => {
              setSidebarOpen(false)
              onOpenProfile?.()
            }}
            type="button"
          >
            Profile settings
          </button>

          {/* Create room */}
          <form onSubmit={createRoom}>
            <div className="section-label">✨ Create Room</div>
            <div className="section-sub">Start a new cozy corner!</div>
            <input
              className="cozy-input"
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Room name…"
              value={newRoomName}
            />
            <input
              className="cozy-input"
              onChange={(e) => setNewRoomPassword(e.target.value)}
              placeholder="Optional password 🔒"
              type="password"
              value={newRoomPassword}
            />
            <button className="btn-primary" type="submit">Create Room 🌸</button>
          </form>

          <hr className="cozy-divider" />

          {/* Join room */}
          <form onSubmit={joinRoom}>
            <div className="section-label">🚪 Join Room</div>
            <div className="section-sub">Enter a room id to join.</div>
            <input
              className="cozy-input hidden"
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Room ID"
              type="number"
              value={roomId}
            />
            <input
              className="cozy-input"
              onChange={(e) => setRoomPassword(e.target.value)}
              placeholder="Password (if needed) 🔑"
              type="password"
              value={roomPassword}
            />
            <button className="btn-secondary" type="submit">Join Room 🫶</button>
          </form>

          <hr className="cozy-divider" />

          {/* Room list */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div className="section-label" style={{ marginBottom: 0 }}>🏠 All Rooms</div>
            <button className="btn-ghost" onClick={loadRooms} type="button">Refresh ↻</button>
          </div>

          <div className="rooms-list">
            {rooms.length === 0 ? (
              <div className="no-rooms">No rooms yet. Be the first! 🌱</div>
            ) : (
              rooms.map((room) => {
                const joined = myRooms.some((item) => item.id === room.id)
                return (
                  <button
                    className={`room-pill${Number(roomId) === room.id ? ' active' : ''}`}
                    key={room.id}
                    onClick={() => selectRoom(room)}
                    type="button"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <span className="room-pill-name">{room.roomName}</span>
                      <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                        {joined && <span className="tag tag-joined">Joined</span>}
                        <span className={`tag ${room.hasPassword ? 'tag-locked' : 'tag-open'}`}>
                          {room.hasPassword ? '🔒' : '✦'}
                        </span>
                      </div>
                    </div>
                    <div className="room-pill-meta">Room #{room.id}</div>
                  </button>
                )
              })
            )}
          </div>

          {error && <div className="error-banner">{error}</div>}
        </aside>

        {/* ── Chat panel ── */}
        <div className="chat-panel">
          <div className="chat-header">
            <div>
              <div className="chat-header-title">
                {activeRoom || selectedRoom
                  ? `💬 ${activeRoomName || selectedRoom?.roomName || `Room ${activeRoom}`}`
                  : '☁️ Choose a room'}
              </div>
              <div className="chat-header-sub">
                {activeRoom
                  ? 'Live conversation — say something nice!'
                  : selectedRoom
                  ? 'Join this room to view and send messages'
                  : 'Pick a room from the sidebar to start chatting'}
              </div>
            </div>
          </div>

          <div className="messages-area" onScroll={handleMessagesScroll} ref={messagesAreaRef}>
            {selectedRoom && !activeRoom ? (
              <div className="empty-state">
                <div className="empty-card">
                  <div className="empty-icon">{selectedRoom.hasPassword ? '🔒' : '🏡'}</div>
                  <h3>{selectedRoom.roomName}</h3>
                  <p>
                    {selectedRoom.hasPassword
                      ? 'This room is locked. Enter the password in the sidebar to join!'
                      : 'Join this room to see the conversation and start chatting.'}
                  </p>
                  <button className="btn-join-now" onClick={joinRoom} type="button">
                    {selectedRoom.hasPassword ? 'Join with Password 🔑' : 'Join Room 🌿'}
                  </button>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-card">
                  <div className="empty-icon">🌼</div>
                  <h3>So quiet here…</h3>
                  <p>No messages yet. Be the first to say hello!</p>
                </div>
              </div>
            ) : (
              <>
              {loadingOlderMessages && (
                <div className="typing-indicator">Loading older messages...</div>
              )}
              {messages.map((item, index) => {
                const currentUserId = Number(user?.id)
                const messageUserId = Number(item.userId ?? item.user?.id)
                const isMine = Number.isFinite(currentUserId) && messageUserId === currentUserId
                const readBy = (item.messageReads || [])
                  .filter((read) => Number(read.user?.id) !== currentUserId)
                  .map((read) => read.user?.username || `User ${read.user?.id}`)
                  .filter(Boolean)

                return (
                  <div className={`msg-row ${isMine ? 'mine' : 'theirs'}`} key={item.id || index}>
                    <div className="bubble-wrap">
                      <div className={`bubble ${isMine ? 'mine' : 'theirs'}`}>
                        <div className="bubble-sender">
                          {isMine ? 'You ✦' : item.user?.username || item.user?.name || `User ${item.userId || 'unknown'}`}
                        </div>
                        <span style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{item.message}</span>
                      </div>
                    </div>
                    {isMine && readBy.length > 0 && (
                      <div className="read-receipt">
                        👀 Seen by {readBy.slice(0, 2).join(', ')}{readBy.length > 2 ? ` +${readBy.length - 2}` : ''}
                      </div>
                    )}
                  </div>
                )
              })}
              </>
            )}
            <div ref={scrollRef} />
          </div>

          {typingNames.length > 0 && (
            <div className="typing-indicator">
              {typingNames.slice(0, 2).join(', ')}
              {typingNames.length > 2 ? ` +${typingNames.length - 2}` : ''} typing...
            </div>
          )}

          <form className="chat-input-bar" onSubmit={sendMessage}>
            <input
              className="chat-input"
              disabled={!activeRoom}
              onChange={handleMessageChange}
              placeholder={activeRoom ? 'Write something cozy… 🍵' : 'Join a room first!'}
              value={message}
            />
            <button className="btn-send" disabled={!activeRoom} type="submit">
              Send 🌸
            </button>
          </form>
        </div>
      </section>
    </>
  )
}
