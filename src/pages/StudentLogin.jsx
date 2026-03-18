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
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (Object.keys(errors).length === 0) return
    const id = setTimeout(() => setErrors({}), 2000)
    return () => clearTimeout(id)
  }, [errors])

  const handleSubmit = (e) => {
    e.preventDefault()
    const newErrors = {}
    if (!studentId) newErrors.studentId = 'Student number is required'
    if (!password) newErrors.password = 'Password is required'
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    navigate('/student/dashboard')
  }

  return (
    <div className="student-login-page">
    <AuthLayout side="left">
      <div className="auth-form">
        <div className="auth-back auth-top">
          <Button type="button" variant="secondary" onClick={() => navigate('/')}>
            Back
          </Button>
        </div>
        <h2 className="auth-title">Sign in</h2>
        <form onSubmit={handleSubmit}>
          <Input
            label="Student Number"
            placeholder="2023-0000 *"
            value={studentId}
            onChange={(e) => { setStudentId(e.target.value); setErrors(prev => ({ ...prev, studentId: '' })) }}
            error={errors.studentId}
          />
          <Input
            label="Password"
            type="password"
            placeholder="Password *"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: '' })) }}
            error={errors.password}
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
      </div>
    </AuthLayout>
    </div>
  )
}
