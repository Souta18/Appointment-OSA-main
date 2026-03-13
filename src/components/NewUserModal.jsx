import { useState } from 'react'
import './NewUserModal.css'

export default function NewUserModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const validateEmail = (e) => {
    return /\S+@\S+\.\S+/.test(e)
  }

  const handleSubmit = (ev) => {
    ev.preventDefault()
    setError('')
    if (!name.trim()) return setError('Full name is required')
    if (!email.trim()) return setError('Email is required')
    if (!validateEmail(email)) return setError('Please enter a valid email')

    const user = { id: Date.now(), name: name.trim(), email: email.trim(), createdAt: Date.now(), role: 'user' }
    try {
      if (typeof onCreate === 'function') onCreate(user)
    } catch (e) { console.error(e) }
  }

  return (
    <div className="newuser-overlay" onClick={onClose}>
      <div className="newuser-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="newuser-title">Create new user</h2>
        <p className="newuser-sub">Enter basic details to add a new user to the system.</p>
        <form className="newuser-form" onSubmit={handleSubmit}>
          <label>Full name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Juan Dela Cruz" />
          <label>Email address</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.edu" />
          {error && <div className="newuser-error">{error}</div>}
          <div className="newuser-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-create">Create</button>
          </div>
        </form>
      </div>
    </div>
  )
}
