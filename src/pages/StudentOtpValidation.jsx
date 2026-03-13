import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import Input from '../components/Input'
import Button from '../components/Button'
import './AuthPages.css'

export default function StudentOtpValidation() {
  const navigate = useNavigate()
  const location = useLocation()
  const studentNumber = location.state?.studentNumber
  const [otp, setOtp] = useState('')

  if (!studentNumber) {
    navigate('/student/forgot-password', { replace: true })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    navigate('/student/change-password', { state: { studentNumber } })
  }

  return (
    <AuthLayout side="right" subtitle="Verify your account">
      <div className="auth-form">
        <h2 className="auth-title">OTP Verification</h2>
        <p className="auth-subtitle-text">
          We have sent a one-time password to your registered email or contact number.
        </p>
        <form onSubmit={handleSubmit}>
          <Input
            label="Enter OTP"
            placeholder="6-digit code *"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <Button type="submit" className="w-full">Verify</Button>
        </form>
        <p className="auth-footer">
          Didn&apos;t receive the code? <button type="button" className="link-button">Resend OTP</button>
        </p>
        <p className="auth-footer">
          <Link to="/student/forgot-password">Back to Forgot Password</Link>
        </p>
      </div>
    </AuthLayout>
  )
}

