import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import Input from '../components/Input'
import Button from '../components/Button'
import { studentSignup } from '../api'
import './AuthPages.css'
import './StudentLogin.css'
import './StudentSignup.css'

export default function StudentSignup() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    studentNumber: '',
    email: '',
    contact: '',
    course: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const loadingTimer = useRef(null)

  useEffect(() => {
    return () => {
      if (loadingTimer.current) clearTimeout(loadingTimer.current)
    }
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Check if any required field is empty
    const requiredFields = [
      form.firstName,
      form.lastName,
      form.studentNumber,
      form.email,
      form.contact,
      form.course,
      form.password
    ]
    
    const hasEmptyFields = requiredFields.some(field => !field.trim())
    if (hasEmptyFields) {
      setError('Please fill out all required fields')
      return
    }
    
    // Form validation for specific requirements
    if (!form.firstName.trim()) {
      setError('First name is required')
      return
    }
    if (!form.lastName.trim()) {
      setError('Last name is required')
      return
    }
    if (!form.studentNumber.trim()) {
      setError('Student number is required')
      return
    }
    if (!form.email.trim()) {
      setError('Email address is required')
      return
    }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(form.email.trim())) {
      setError('Invalid email format')
      return
    }
    if (!form.contact.trim()) {
      setError('Contact number is required')
      return
    }
    if (!form.course.trim()) {
      setError('Course is required')
      return
    }
    if (!form.password.trim()) {
      setError('Password is required')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (!/[A-Z]/.test(form.password)) {
      setError('Password must contain at least one uppercase letter')
      return
    }
    if (!/[0-9]/.test(form.password)) {
      setError('Password must contain at least one digit')
      return
    }

    const start = Date.now()
    setIsLoading(true)
    try {
      // Send signup data to backend
      const response = await studentSignup({
        firstName: form.firstName,
        middleName: form.middleName,
        lastName: form.lastName,
        studentNumber: form.studentNumber,
        email: form.email,
        contact: form.contact,
        course: form.course,
        password: form.password
      })

      if (response.ok && response.student) {
        // Save student info to localStorage for use in the app
        localStorage.setItem('student', JSON.stringify(response.student))
        // Navigate to dashboard
        navigate('/student/dashboard')
      } else if (response.error) {
        // Show exact backend error and include details when available
        const detailsText = response.details ? ` - ${JSON.stringify(response.details)}` : ''
        setError(`${response.error}${detailsText}`)
      } else {
        setError('Sign up failed. Please try again.')
      }
    } catch (err) {
      if (err.message.includes('network') || err.message.includes('fetch')) {
        setError('Network error. Please check your internet connection and try again.')
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
      console.error(err)
    } finally {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 2000 - elapsed)
      if (loadingTimer.current) clearTimeout(loadingTimer.current)
      loadingTimer.current = setTimeout(() => {
        setIsLoading(false)
        loadingTimer.current = null
      }, remaining)
    }
  }

  return (
    <div className="student-login-page student-signup-page">
      <AuthLayout side="right" subtitle="Create your account">
        <div className="auth-form">
          <h2 className="auth-title">Sign up</h2>
          <p className="auth-subtitle-text">
            Create your Norzagaray College student account to book and manage your OSA appointments.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <Input
                label="First Name"
                name="firstName"
                placeholder="e.g. Juan *"
                value={form.firstName}
                onChange={handleChange}
              />
              <Input
                label="Last Name"
                name="lastName"
                placeholder="e.g. Dela Cruz *"
                value={form.lastName}
                onChange={handleChange}
              />
            </div>
            <div className="form-row">
              <Input
                label="Middle Name (optional)"
                name="middleName"
                placeholder="e.g. Santos"
                value={form.middleName}
                onChange={handleChange}
              />
              <Input
                label="Student Number"
                name="studentNumber"
                placeholder="e.g. 2023-0000 *"
                value={form.studentNumber}
                onChange={handleChange}
              />
            </div>
            <Input
              label="Email Address"
              name="email"
              type="email"
              placeholder="e.g. student@gmail.com *"
              value={form.email}
              onChange={handleChange}
            />
            <Input
              label="Contact Number"
              name="contact"
              placeholder="e.g. 09XX XXX XXXX *"
              value={form.contact}
              onChange={handleChange}
            />
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="course">Course *</label>
                <select
                  id="course"
                  name="course"
                  value={form.course}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="">Select your course</option>
                  <option value="BSCS">BSCS</option>
                  <option value="BSED">BSED</option>
                  <option value="BEED">BEED</option>
                  <option value="BSHM">BSHM</option>
                </select>
              </div>
              <Input
                label="Password"
                name="password"
                type="password"
                placeholder="e.g. ••••••••"
                value={form.password}
                onChange={handleChange}
              />
            </div>
            {error && <div className="auth-error">{error}</div>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Sign up'}
            </Button>
          </form>
          <p className="auth-footer">
            Already have an account? <Link to="/student/login">Sign in</Link>
          </p>

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
