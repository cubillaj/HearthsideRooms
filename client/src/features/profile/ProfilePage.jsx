import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, getApiError } from '../../lib/api'

const emptyProfile = {
  username: '',
  name: '',
  middleName: '',
  lastName: '',
  email: '',
  profileUrl: '',
  bio: '',
}

const normalizeProfile = (profile, fallbackUser) => {
  const profileUser = profile?.user || fallbackUser || {}

  return {
    username: profileUser.username || '',
    name: profileUser.name || '',
    middleName: profileUser.middleName || '',
    lastName: profileUser.lastName || '',
    email: profileUser.email || fallbackUser?.email || '',
    profileUrl: profile?.profileUrl || '',
    bio: profile?.bio || '',
  }
}

const compactInfoPayload = (values) => {
  return Object.fromEntries(
    ['username', 'name', 'middleName', 'lastName']
      .map((field) => [field, values[field].trim()])
      .filter(([, value]) => value !== '')
  )
}

export const ProfilePage = ({ user, onBack, onUserUpdate }) => {
  const [profile, setProfile] = useState(emptyProfile)
  const [form, setForm] = useState(emptyProfile)
  const [profileImage, setProfileImage] = useState(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const initials = useMemo(() => {
    const source = profile.name || profile.username || profile.email || 'U'
    return source.trim().slice(0, 1).toUpperCase()
  }, [profile.email, profile.name, profile.username])

  const previewUrl = useMemo(() => {
    if (!profileImage) return ''
    return URL.createObjectURL(profileImage)
  }, [profileImage])

  const imageSrc = editing ? previewUrl || form.profileUrl : profile.profileUrl

  const loadProfile = useCallback(async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data } = await api.get('/users/profile-user')
      const nextProfile = normalizeProfile(data.user, user)
      setProfile(nextProfile)
      setForm(nextProfile)
      setProfileImage(null)
    } catch (err) {
      setError(getApiError(err))
      const fallback = normalizeProfile(null, user)
      setProfile(fallback)
      setForm(fallback)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    let mounted = true

    queueMicrotask(() => {
      if (mounted) loadProfile()
    })

    return () => {
      mounted = false
    }
  }, [loadProfile])

  useEffect(() => {
    if (!previewUrl) return undefined
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
    setSuccess('')
  }

  const cancelEdit = () => {
    setForm(profile)
    setProfileImage(null)
    setEditing(false)
    setError('')
    setSuccess('')
  }

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const infoChanged = ['username', 'name', 'middleName', 'lastName']
        .some((field) => form[field] !== profile[field])
      const profileChanged = form.bio !== profile.bio || profileImage
      let updatedUser = null

      if (infoChanged) {
        const { data } = await api.put('/users/update-info', compactInfoPayload(form))
        updatedUser = data.user
      }

      if (profileChanged) {
        const profilePayload = new FormData()
        profilePayload.append('bio', form.bio.trim())
        if (profileImage) profilePayload.append('profileImage', profileImage)
        await api.put('/users/update-profile', profilePayload)
      }

      if (!infoChanged && !profileChanged) {
        setSuccess('No changes to save.')
        setSaving(false)
        return
      }

      const { data } = await api.get('/users/profile-user')
      const nextProfile = normalizeProfile(data.user, updatedUser || user)
      setProfile(nextProfile)
      setForm(nextProfile)
      setProfileImage(null)
      setEditing(false)
      onUserUpdate?.(updatedUser || data.user?.user || null)
      setSuccess('Profile updated.')
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="profile-page">
      <div className="profile-page-topbar">
        <button className="btn-ghost profile-back-btn" onClick={onBack} type="button">
          Back to chat
        </button>
        {!editing && (
          <button className="btn-secondary profile-edit-btn" disabled={loading} onClick={() => setEditing(true)} type="button">
            Edit profile
          </button>
        )}
      </div>

      <div className="profile-hero">
        <div className="profile-photo">
          {imageSrc ? <img alt="" src={imageSrc} /> : <span>{initials}</span>}
        </div>
        <div className="profile-heading">
          <p className="profile-kicker">My profile</p>
          <h2>{profile.username || profile.email || 'Your account'}</h2>
          <p>{profile.bio || 'No bio yet.'}</p>
        </div>
      </div>

      {loading ? (
        <div className="profile-message">Loading profile...</div>
      ) : editing ? (
        <form className="profile-details profile-edit-form" onSubmit={submit}>
          <label className="profile-upload">
            <span>Profile image</span>
            <input accept="image/jpeg,image/png,image/webp" onChange={(e) => setProfileImage(e.target.files?.[0] || null)} type="file" />
          </label>

          <div className="profile-grid">
            <label>
              <span>Username</span>
              <input className="cozy-input" value={form.username} onChange={(e) => updateField('username', e.target.value)} />
            </label>
            <label>
              <span>First name</span>
              <input className="cozy-input" required value={form.name} onChange={(e) => updateField('name', e.target.value)} />
            </label>
            <label>
              <span>Middle name</span>
              <input className="cozy-input" value={form.middleName} onChange={(e) => updateField('middleName', e.target.value)} />
            </label>
            <label>
              <span>Last name</span>
              <input className="cozy-input" required value={form.lastName} onChange={(e) => updateField('lastName', e.target.value)} />
            </label>
          </div>

          <label>
            <span>Bio</span>
            <textarea className="cozy-input profile-textarea" maxLength={150} value={form.bio} onChange={(e) => updateField('bio', e.target.value)} />
          </label>

          <div className="profile-actions">
            <button className="btn-ghost" onClick={cancelEdit} type="button">Cancel</button>
            <button className="btn-primary profile-save-btn" disabled={saving} type="submit">
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      ) : (
        <div className="profile-details">
          <div className="profile-detail-item">
            <span>Username</span>
            <strong>{profile.username || 'Not set'}</strong>
          </div>
          <div className="profile-detail-item">
            <span>Email</span>
            <strong>{profile.email || 'Not available'}</strong>
          </div>
          <div className="profile-detail-item">
            <span>Full name</span>
            <strong>{[profile.name, profile.middleName, profile.lastName].filter(Boolean).join(' ') || 'Not set'}</strong>
          </div>
          <div className="profile-detail-item">
            <span>Bio</span>
            <strong>{profile.bio || 'Not set'}</strong>
          </div>
        </div>
      )}

      {success && <div className="profile-message success">{success}</div>}
      {error && <div className="profile-message error">{error}</div>}
    </section>
  )
}
