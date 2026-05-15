import { useCallback, useEffect, useState } from 'react'
import { api, getApiError } from '../../lib/api'

const emptyCreateForm = {
  username: '',
  name: '',
  middleName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'user',
}

const emptyEditForm = {
  username: '',
  name: '',
  middleName: '',
  lastName: '',
  email: '',
  status: 'active',
}

const normalizeEditForm = (user) => ({
  username: user?.username || '',
  name: user?.name || '',
  middleName: user?.middleName || '',
  lastName: user?.lastName || '',
  email: user?.email || '',
  status: user?.status || 'active',
})

const cleanPayload = (values) => {
  return Object.fromEntries(
    Object.entries(values)
      .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
      .filter(([, value]) => value !== '')
  )
}

export const AdminPage = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('users')
  const [users, setUsers] = useState([])
  const [rooms, setRooms] = useState([])
  const [userPagination, setUserPagination] = useState(null)
  const [roomPagination, setRoomPagination] = useState(null)
  const [query, setQuery] = useState({
    search: '',
    status: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
  })
  const [roomQuery, setRoomQuery] = useState({
    search: '',
    sortOrder: 'desc',
    page: 1,
  })
  const [createForm, setCreateForm] = useState(emptyCreateForm)
  const [editingUser, setEditingUser] = useState(null)
  const [editForm, setEditForm] = useState(emptyEditForm)
  const [loading, setLoading] = useState(true)
  const [roomsLoading, setRoomsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const params = {
        page: query.page,
        limit: 10,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      }

      if (query.search.trim()) params.search = query.search.trim()
      if (query.status) params.status = query.status

      const { data } = await api.get('/users', { params })
      setUsers(data.users || [])
      setUserPagination(data.pagination || null)
    } catch (err) {
      setError(getApiError(err))
      setUsers([])
      setUserPagination(null)
    } finally {
      setLoading(false)
    }
  }, [query])

  const loadRooms = useCallback(async () => {
    setRoomsLoading(true)
    setError('')

    try {
      const params = {
        page: roomQuery.page,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: roomQuery.sortOrder,
      }

      if (roomQuery.search.trim()) params.search = roomQuery.search.trim()

      const { data } = await api.get('/rooms/admin', { params })
      setRooms(data.rooms || [])
      setRoomPagination(data.pagination || null)
    } catch (err) {
      setError(getApiError(err))
      setRooms([])
      setRoomPagination(null)
    } finally {
      setRoomsLoading(false)
    }
  }, [roomQuery])

  useEffect(() => {
    let mounted = true

    queueMicrotask(() => {
      if (!mounted) return
      if (activeTab === 'users') loadUsers()
      if (activeTab === 'rooms') loadRooms()
    })

    return () => {
      mounted = false
    }
  }, [activeTab, loadRooms, loadUsers])

  const updateQuery = (field, value) => {
    setQuery((current) => ({
      ...current,
      [field]: value,
      page: field === 'page' ? value : 1,
    }))
  }

  const updateRoomQuery = (field, value) => {
    setRoomQuery((current) => ({
      ...current,
      [field]: value,
      page: field === 'page' ? value : 1,
    }))
  }

  const updateCreateField = (field, value) => {
    setCreateForm((current) => ({ ...current, [field]: value }))
    setError('')
    setSuccess('')
  }

  const updateEditField = (field, value) => {
    setEditForm((current) => ({ ...current, [field]: value }))
    setError('')
    setSuccess('')
  }

  const createUser = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await api.post('/users/create-account', cleanPayload(createForm))
      setCreateForm(emptyCreateForm)
      setSuccess('Account created.')
      await loadUsers()
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (user) => {
    setEditingUser(user)
    setEditForm(normalizeEditForm(user))
    setError('')
    setSuccess('')
  }

  const cancelEdit = () => {
    setEditingUser(null)
    setEditForm(emptyEditForm)
    setError('')
    setSuccess('')
  }

  const saveUser = async (event) => {
    event.preventDefault()
    if (!editingUser?.id) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const { data } = await api.put(`/users/${editingUser.id}`, cleanPayload(editForm))
      setUsers((current) => current.map((item) => (item.id === data.user?.id ? data.user : item)))
      setEditingUser(null)
      setSuccess('User updated.')
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setSaving(false)
    }
  }

  const deleteUser = async (userId) => {
    const confirmed = window.confirm('Delete this user account?')
    if (!confirmed) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await api.delete(`/users/${userId}`)
      setUsers((current) => current.filter((item) => item.id !== userId))
      setSuccess('User deleted.')
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setSaving(false)
    }
  }

  const deleteRoom = async (roomId) => {
    const confirmed = window.confirm('Delete this room and its messages?')
    if (!confirmed) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await api.delete(`/rooms/${roomId}`)
      setRooms((current) => current.filter((item) => item.id !== roomId))
      setSuccess('Room deleted.')
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-page">
      <div className="admin-topbar">
        <div>
          <p className="admin-kicker">Super admin</p>
          <h2>{activeTab === 'users' ? 'User management' : 'Room management'}</h2>
        </div>
        <button className="btn-ghost profile-back-btn" onClick={onBack} type="button">
          Back to chat
        </button>
      </div>

      <div className="admin-tabs">
        <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')} type="button">
          Users
        </button>
        <button className={activeTab === 'rooms' ? 'active' : ''} onClick={() => setActiveTab('rooms')} type="button">
          Rooms
        </button>
      </div>

      {activeTab === 'users' ? (
        <div className="admin-layout">
        <aside className="admin-create-panel">
          <div className="section-label">Create account</div>
          <form className="admin-form" onSubmit={createUser}>
            <input className="cozy-input" placeholder="Username" value={createForm.username} onChange={(e) => updateCreateField('username', e.target.value)} />
            <input className="cozy-input" placeholder="First name" required value={createForm.name} onChange={(e) => updateCreateField('name', e.target.value)} />
            <input className="cozy-input" placeholder="Middle name" value={createForm.middleName} onChange={(e) => updateCreateField('middleName', e.target.value)} />
            <input className="cozy-input" placeholder="Last name" required value={createForm.lastName} onChange={(e) => updateCreateField('lastName', e.target.value)} />
            <input className="cozy-input" placeholder="Email" required type="email" value={createForm.email} onChange={(e) => updateCreateField('email', e.target.value)} />
            <input className="cozy-input" placeholder="Password" required type="password" value={createForm.password} onChange={(e) => updateCreateField('password', e.target.value)} />
            <select className="cozy-input" value={createForm.role} onChange={(e) => updateCreateField('role', e.target.value)}>
              <option value="user">User</option>
              <option value="super_admin">Super admin</option>
            </select>
            <button className="btn-primary" disabled={saving} type="submit">
              Create user
            </button>
          </form>
        </aside>

        <div className="admin-users-panel">
          <div className="admin-filters">
            <input className="cozy-input" placeholder="Search name, email, username" value={query.search} onChange={(e) => updateQuery('search', e.target.value)} />
            <select className="cozy-input" value={query.status} onChange={(e) => updateQuery('status', e.target.value)}>
              <option value="">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select className="cozy-input" value={query.sortBy} onChange={(e) => updateQuery('sortBy', e.target.value)}>
              <option value="createdAt">Created</option>
              <option value="name">Name</option>
              <option value="email">Email</option>
            </select>
            <select className="cozy-input" value={query.sortOrder} onChange={(e) => updateQuery('sortOrder', e.target.value)}>
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>

          {error && <div className="profile-message error">{error}</div>}
          {success && <div className="profile-message success">{success}</div>}

          <div className="admin-table">
            <div className="admin-table-head">
              <span>User</span>
              <span>Email</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            {loading ? (
              <div className="admin-empty">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="admin-empty">No users found.</div>
            ) : (
              users.map((item) => (
                <div className="admin-row" key={item.id}>
                  <div>
                    <strong>{item.username || `${item.name} ${item.lastName}`}</strong>
                    <span>#{item.id} {item.name} {item.middleName} {item.lastName}</span>
                  </div>
                  <div>{item.email}</div>
                  <div><span className={`admin-status ${item.status === 'inactive' ? 'inactive' : 'active'}`}>{item.status || 'active'}</span></div>
                  <div className="admin-row-actions">
                    <button className="btn-ghost" onClick={() => startEdit(item)} type="button">Edit</button>
                    <button className="admin-delete-btn" disabled={saving} onClick={() => deleteUser(item.id)} type="button">Delete</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="admin-pagination">
            <button className="btn-ghost" disabled={!userPagination?.hasPrevPage || loading} onClick={() => updateQuery('page', query.page - 1)} type="button">
              Previous
            </button>
            <span>Page {userPagination?.page || query.page}</span>
            <button className="btn-ghost" disabled={!userPagination?.hasNextPage || loading} onClick={() => updateQuery('page', query.page + 1)} type="button">
              Next
            </button>
          </div>
        </div>
        </div>
      ) : (
        <div className="admin-users-panel">
          <div className="admin-filters admin-room-filters">
            <input className="cozy-input" placeholder="Search room name" value={roomQuery.search} onChange={(e) => updateRoomQuery('search', e.target.value)} />
            <select className="cozy-input" value={roomQuery.sortOrder} onChange={(e) => updateRoomQuery('sortOrder', e.target.value)}>
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
          </div>

          {error && <div className="profile-message error">{error}</div>}
          {success && <div className="profile-message success">{success}</div>}

          <div className="admin-table">
            <div className="admin-table-head admin-room-head">
              <span>Room</span>
              <span>Creator</span>
              <span>Members</span>
              <span>Created</span>
              <span>Actions</span>
            </div>

            {roomsLoading ? (
              <div className="admin-empty">Loading rooms...</div>
            ) : rooms.length === 0 ? (
              <div className="admin-empty">No rooms found.</div>
            ) : (
              rooms.map((room) => (
                <div className="admin-row admin-room-row" key={room.id}>
                  <div>
                    <strong>{room.roomName}</strong>
                    <span>Room #{room.id}</span>
                  </div>
                  <div>
                    <strong>{room.creator?.username || 'Unknown'}</strong>
                    <span>Creator #{room.creator?.id || 'n/a'}</span>
                  </div>
                  <div>
                    <strong>{room.roomMembers?.length || 0}</strong>
                    <span>{(room.roomMembers || []).slice(0, 2).map((member) => member.user?.username || member.user?.email).filter(Boolean).join(', ') || 'No members'}</span>
                  </div>
                  <div>{room.createdAt ? new Date(room.createdAt).toLocaleDateString() : 'n/a'}</div>
                  <div className="admin-row-actions">
                    <button className="admin-delete-btn" disabled={saving} onClick={() => deleteRoom(room.id)} type="button">Delete</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="admin-pagination">
            <button className="btn-ghost" disabled={!roomPagination?.hasPrevPage || roomsLoading} onClick={() => updateRoomQuery('page', roomQuery.page - 1)} type="button">
              Previous
            </button>
            <span>Page {roomPagination?.page || roomQuery.page}</span>
            <button className="btn-ghost" disabled={!roomPagination?.hasNextPage || roomsLoading} onClick={() => updateRoomQuery('page', roomQuery.page + 1)} type="button">
              Next
            </button>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="admin-edit-overlay" role="presentation">
          <form className="admin-edit-panel" onSubmit={saveUser}>
            <div className="admin-edit-header">
              <div>
                <p className="admin-kicker">Edit user</p>
                <h3>{editingUser.email}</h3>
              </div>
              <button className="profile-close-btn" onClick={cancelEdit} type="button" aria-label="Close edit form">x</button>
            </div>
            <div className="profile-grid">
              <label>
                <span>Username</span>
                <input className="cozy-input" value={editForm.username} onChange={(e) => updateEditField('username', e.target.value)} />
              </label>
              <label>
                <span>First name</span>
                <input className="cozy-input" required value={editForm.name} onChange={(e) => updateEditField('name', e.target.value)} />
              </label>
              <label>
                <span>Middle name</span>
                <input className="cozy-input" value={editForm.middleName} onChange={(e) => updateEditField('middleName', e.target.value)} />
              </label>
              <label>
                <span>Last name</span>
                <input className="cozy-input" required value={editForm.lastName} onChange={(e) => updateEditField('lastName', e.target.value)} />
              </label>
              <label>
                <span>Email</span>
                <input className="cozy-input" required type="email" value={editForm.email} onChange={(e) => updateEditField('email', e.target.value)} />
              </label>
              <label>
                <span>Status</span>
                <select className="cozy-input" value={editForm.status} onChange={(e) => updateEditField('status', e.target.value)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>
            <div className="profile-actions">
              <button className="btn-ghost" onClick={cancelEdit} type="button">Cancel</button>
              <button className="btn-primary profile-save-btn" disabled={saving} type="submit">
                Save user
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
