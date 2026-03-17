import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import Input from '../components/Input'
import Button from '../components/Button'
import { studentSignup } from '../api'
import { validateStudentSignup, validateStudentNumberMessage, validatePhoneMessage, validateNameMessage, validateEmailMessage, validatePasswordMessage } from '../validationHelpers'
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
    const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const loadingTimer = useRef(null)
  const errorTimer = useRef(null)

  const showError = (msg) => {
    setError(msg)
    if (errorTimer.current) clearTimeout(errorTimer.current)
    errorTimer.current = setTimeout(() => {
      setError('')
      errorTimer.current = null
    }, 3000)
  }

  useEffect(() => {
    return () => {
      if (loadingTimer.current) clearTimeout(loadingTimer.current)
      if (errorTimer.current) clearTimeout(errorTimer.current)
    }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
    setError('')
    if (errorTimer.current) {
      clearTimeout(errorTimer.current)
      errorTimer.current = null
    }
    setErrors(prev => {
      const copy = { ...prev }
      delete copy[name]
      return copy
    })
  }

  const capitalizeWords = (s) => {
    if (!s) return ''
    return String(s).split(/\s+/).map(w => w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '').join(' ')
  }

  const handleNameBlur = (e) => {
    const name = e.target.name
    if (!['firstName','middleName','lastName'].includes(name)) return
    const val = form[name]
    const cap = capitalizeWords(val)
    if (cap !== val) setForm(f => ({ ...f, [name]: cap }))
  }

  const handleBlurValidate = (e) => {
    const name = e.target.name
    const val = (form[name] || '').trim()
    let msg = ''
    if (name === 'firstName' || name === 'lastName' || name === 'middleName') {
      msg = validateNameMessage(val, name === 'middleName' ? 'Middle Name' : (name === 'firstName' ? 'First Name' : 'Last Name'))
    } else if (name === 'studentNumber') {
      msg = validateStudentNumberMessage(val)
    } else if (name === 'contact') {
      if (!val) {
        msg = 'Contact number is required'
      } else {
        msg = validatePhoneMessage(val)
      }
    } else if (name === 'email') {
      msg = validateEmailMessage(val)
    } else if (name === 'password') {
      msg = validatePasswordMessage(val)
    }
    setErrors(prev => ({ ...prev, ...(msg ? { [name]: msg } : {}) }))
  }

  const validateStudentNumberFormat = (s) => {
    if (!s) return false
    const v = String(s).trim()
    // enforce format starting with 2023- followed by four digits (e.g. 2023-0000)
    return /^2023-\d{4}$/.test(v)
  }

  const validateContactFormat = (s) => {
    if (!s) return false
    const raw = String(s).trim()
    // remove spaces, parentheses, dashes
    const cleaned = raw.replace(/[\s()-]/g, '')
    // allow +63XXXXXXXXXX (plus then 10 digits) or 09XXXXXXXXX (11 digits)
    if (/^\+63\d{10}$/.test(cleaned)) return true
    if (/^09\d{9}$/.test(cleaned)) return true
    return false
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Check if any required field is empty
    // run combined validation helper
    const combined = validateStudentSignup({ ...form, confirmPassword: form.password })
    if (!combined.valid) {
      setErrors(combined.errors)
      // show ordered messages as an array so they render on separate lines
      // show a single generic message to the user for required fields
      showError('Please fill up the requirement')
      // focus the first invalid field in visual order
      const firstKey = Object.keys(combined.errors)[0]
      if (firstKey) {
        const el = document.querySelector(`[name="${firstKey}"]`)
        if (el && typeof el.focus === 'function') {
          try { el.focus() } catch {}
          try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }) } catch {}
        }
      }
      return
    }
    // previous manual checks replaced by combined helper above

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
        // Show structured backend validation errors (if any) as separate messages
        if (response.details && typeof response.details === 'object') {
          // Set field-level errors and a top-level ordered list for display
          setErrors(response.details)
          // display a single generic message to the user
          showError('Please fill up the requirement')
          // focus first invalid field returned by server
          const firstKey = Object.keys(response.details)[0]
          if (firstKey) {
            const el = document.querySelector(`[name="${firstKey}"]`)
            if (el && typeof el.focus === 'function') {
              try { el.focus() } catch {}
              try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }) } catch {}
            }
          }
        } else {
          showError(response.error)
        }
      } else {
        showError('Sign up failed. Please try again.')
      }
    } catch (err) {
      if (err.message.includes('network') || err.message.includes('fetch')) {
        showError('Network error. Please check your internet connection and try again.')
      } else {
        showError('An unexpected error occurred. Please try again.')
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
                onBlur={(e) => { handleNameBlur(e); handleBlurValidate(e) }}
                error={errors.firstName}
              />
              <Input
                label="Last Name"
                name="lastName"
                placeholder="e.g. Dela Cruz *"
                value={form.lastName}
                onChange={handleChange}
                onBlur={(e) => { handleNameBlur(e); handleBlurValidate(e) }}
                error={errors.lastName}
              />
            </div>
            <div className="form-row">
              <Input
                label="Middle Name (optional)"
                name="middleName"
                placeholder="e.g. Santos"
                value={form.middleName}
                onChange={handleChange}
                onBlur={(e) => { handleNameBlur(e); handleBlurValidate(e) }}
                error={errors.middleName}
              />
              <Input
                label="Student Number"
                name="studentNumber"
                placeholder="e.g. 2023-0000 *"
                value={form.studentNumber}
                onChange={handleChange}
                onBlur={handleBlurValidate}
                error={errors.studentNumber}
              />
            </div>
            <Input
              label="Email Address"
              name="email"
              type="email"
              placeholder="e.g. student@gmail.com *"
              value={form.email}
              onChange={handleChange}
              onBlur={handleBlurValidate}
              error={errors.email}
            />
            <Input
              label="Contact Number"
              name="contact"
              placeholder="e.g. 09XX XXX XXXX or +639XXXXXXXXX *"
              value={form.contact}
              onChange={handleChange}
              onBlur={handleBlurValidate}
              error={errors.contact}
            />
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="course">Course *</label>
                <select
                  id="course"
                  name="course"
                  value={form.course}
                  onChange={handleChange}
                  className={`form-select ${errors.course ? 'form-select-error' : ''}`}
                  onBlur={handleBlurValidate}
                >
                  <option value="">Select your course</option>
                  <option value="BSCS">BSCS</option>
                  <option value="BSED">BSED</option>
                  <option value="BEED">BEED</option>
                  <option value="BSHM">BSHM</option>
                </select>
                {errors.course && <p className="form-input-error-message">{errors.course}</p>}
              </div>
              <Input
                label="Password"
                name="password"
                type="password"
                placeholder="e.g. ••••••••"
                value={form.password}
                onChange={handleChange}
                onBlur={handleBlurValidate}
                error={errors.password}
              />
            </div>
            {error && (
              <div className="form-error-panel">
                <p className="form-input-error-message">{error}</p>
              </div>
            )}
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
