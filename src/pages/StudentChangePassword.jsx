import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import Input from '../components/Input'
import Button from '../components/Button'
import './AuthPages.css'

export default function StudentChangePassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const studentNumber = location.state?.studentNumber
  const [form, setForm] = useState({
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (!error) return
    const id = setTimeout(() => setError(''), 2000)
    return () => clearTimeout(id)
  }, [error])

  if (!studentNumber) {
    navigate('/student/forgot-password', { replace: true })
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.password || !form.confirmPassword) {
      setError('Please fill in all required fields.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setError('')
    navigate('/student/login')
  }

  return (
    <AuthLayout side="right" subtitle="Create a new password">
      <div className="auth-form">
        <div className="auth-back auth-top">
          <Button type="button" variant="secondary" onClick={() => navigate('/')}>
            Back
          </Button>
        </div>
        <h2 className="auth-title">Change Password</h2>
        <p className="auth-subtitle-text">
          Set a strong password to secure your account.
        </p>
        <form onSubmit={handleSubmit}>
          <Input
            label="New Password"
            name="password"
            type="password"
            placeholder="•••••••• *"
            value={form.password}
            onChange={handleChange}
          />
          <Input
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            placeholder="•••••••• *"
            value={form.confirmPassword}
            onChange={handleChange}
          />
          {error && <p className="auth-error">{error}</p>}
          <Button type="submit" className="w-full">Save Password</Button>
        </form>
        <p className="auth-footer">
          Remembered your password? <Link to="/student/login">Sign in</Link>
        </p>

      </div>
    </AuthLayout>
  )
}

