import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Input from '../components/Input'
import Button from '../components/Button'
import './AuthPages.css'
import './AdminLogin.css'
import { adminLogin } from '../api'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const errorTimer = useRef(null)

  useEffect(() => {
    if (Object.keys(errors).length === 0) return
    const id = setTimeout(() => setErrors({}), 2000)
    return () => clearTimeout(id)
  }, [errors])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setErrors({})

    const newErrors = {}
    if (!username) newErrors.username = 'Username is required'
    if (!password) newErrors.password = 'Password is required'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const start = Date.now()
    setIsSubmitting(true)
    let res
    try {
      res = await adminLogin(username, password)
    } finally {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 2000 - elapsed)
      setTimeout(() => setIsSubmitting(false), remaining)
    }
    if (res?.ok) {
      try {
        localStorage.setItem('adminAuth', 'true')
        localStorage.setItem('adminUser', JSON.stringify(res.admin || {}))
      } catch (e) {}
      navigate('/admin/dashboard')
    } else {
      if (errorTimer.current) clearTimeout(errorTimer.current)
      setError('Invalid credentials')
      errorTimer.current = setTimeout(() => setError(''), 2000)
    }
  }

  useEffect(() => {
    return () => {
      if (errorTimer.current) clearTimeout(errorTimer.current)
    }
  }, [])

  return (
    <div className="admin-login-page">
      <div className="admin-header">
        <div className="admin-logos">
          <div className="admin-logo" />
          <div className="admin-logo-alt" />
        </div>
        <h1 className="admin-school-name">Norzagaray College</h1>
        <p className="admin-osa">Office of Student Affairs</p>
      </div>

      <div className="admin-login-container">
        <div className="auth-back auth-top" style={{ marginBottom: '1rem' }}>
          <Button type="button" variant="secondary" onClick={() => navigate('/')}>
            Back
          </Button>
        </div>
        <p className="admin-osa admin-subtitle">Sign in to your account</p>
        <div className="admin-divider" aria-hidden="true" />

        <form onSubmit={handleSubmit} className="admin-form">
          <Input
            label="Username"
            placeholder="e.g. admin@domain.edu"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setErrors(prev => ({ ...prev, username: '' })) }}
            error={errors.username}
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: '' })) }}
            error={errors.password}
          />

          {error && <div className="admin-error" role="alert">{error}</div>}

          <Button type="submit" variant="primary" className="w-full" loading={isSubmitting}>Sign in</Button>

          <Link to="/admin/forgot" className="admin-forgot">Forgot Password?</Link>
        </form>
      </div>

      <div className="admin-note">Only authorized personnel may sign in. Request access from your administrator.</div>
      </div>
  )
}
