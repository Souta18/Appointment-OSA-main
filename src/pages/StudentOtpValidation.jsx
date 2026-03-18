import { useState, useEffect } from 'react'
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
  const [error, setError] = useState('')

  useEffect(() => {
    if (!error) return
    const id = setTimeout(() => setError(''), 2000)
    return () => clearTimeout(id)
  }, [error])

  if (!studentNumber) {
    navigate('/student/forgot-password', { replace: true })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!otp) {
      setError('OTP is required')
      return
    }
    if (otp.length < 6) {
      setError('Invalid OTP code')
      return
    }
    navigate('/student/change-password', { state: { studentNumber } })
  }

  return (
    <AuthLayout side="right" subtitle="Verify your account">
      <div className="auth-form">
        <div className="auth-back auth-top">
          <Button type="button" variant="secondary" onClick={() => navigate('/')}>
            Back
          </Button>
        </div>
        <h2 className="auth-title">OTP Verification</h2>
        <p className="auth-subtitle-text">
          We have sent a one-time password to your registered email or contact number.
        </p>
        <form onSubmit={handleSubmit}>
          <Input
            label="Enter OTP"
            placeholder="6-digit code *"
            value={otp}
            onChange={(e) => { setOtp(e.target.value); setError('') }}
            error={error}
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

