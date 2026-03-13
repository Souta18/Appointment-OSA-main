import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import Input from '../components/Input'
import Button from '../components/Button'
import './AdminForgot.css'

export default function AdminForgot() {
  const [username, setUsername] = useState('')
  const [status, setStatus] = useState('')
  const timer = useRef(null)
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    setStatus('Please check your email for reset instructions.')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setStatus('')
      navigate('/admin/login')
    }, 3000)
  }

  useEffect(() => {
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [])

  return (
    <AuthLayout formSide="right">
      <h2 className="auth-title">Forgot Password</h2>
      <p className="auth-subtitle-text">Enter your admin username or email and we'll send reset instructions.</p>
      <form className="auth-form" onSubmit={handleSubmit}>
        {status && <div className="auth-success" role="status">{status}</div>}
        <Input label="Username or Email" placeholder="admin@domain.edu" value={username} onChange={e => setUsername(e.target.value)} />
        <div className="form-actions">
          <Button type="submit" className="w-full">Send reset link</Button>
        </div>
      </form>
    </AuthLayout>
  )
}
