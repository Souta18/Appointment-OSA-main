import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import Input from '../components/Input'
import Button from '../components/Button'
import './AuthPages.css'

export default function StudentForgotPassword() {
  const navigate = useNavigate()
  const [studentNumber, setStudentNumber] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    navigate('/student/otp', { state: { studentNumber } })
  }

  return (
    <AuthLayout side="right" subtitle="Reset your password">
      <div className="auth-form">
        <h2 className="auth-title">Forgot Password</h2>
        <p className="auth-subtitle-text">
          Enter your registered student number to receive a one-time password (OTP).
        </p>
        <form onSubmit={handleSubmit}>
          <Input
            label="Student Number"
            placeholder="e.g. 2023-0000 *"
            value={studentNumber}
            onChange={(e) => setStudentNumber(e.target.value)}
          />
          <Button type="submit" className="w-full">Send OTP</Button>
        </form>
        <p className="auth-footer">
          Remembered your password? <Link to="/student/login">Sign in</Link>
        </p>
      </div>
    </AuthLayout>
  )
}

