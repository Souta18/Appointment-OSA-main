import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import Input from '../components/Input'
import Button from '../components/Button'
import './AuthPages.css'
import './StudentLogin.css'
import Chatbot from '../components/Chatbot'

export default function StudentLogin() {
  const navigate = useNavigate()
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    navigate('/student/dashboard')
  }

  return (
    <div className="student-login-page">
    <AuthLayout side="left">
      <div className="auth-form">
        <h2 className="auth-title">Sign in</h2>
        <form onSubmit={handleSubmit}>
          <Input
            label="Student Number"
            placeholder="2023-0000 *"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            placeholder="Password *"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="form-actions">
            <Link to="/student/forgot-password" className="auth-link">
              Forgot Password?
            </Link>
            <Button type="submit" className="w-full">Sign in</Button>
          </div>
        </form>
        <p className="auth-footer">
          No account yet? <Link to="/student/signup">Sign up</Link>
          <span className="title-line" aria-hidden />
        </p>
        <Link to="/guest/login" className="continue-guest">Continue as Guest</Link>

        <div className="auth-back auth-bottom">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
      </div>
    </AuthLayout>
    </div>
  )
}
