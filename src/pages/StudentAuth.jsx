import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import Input from '../components/Input'
import Button from '../components/Button'
import './AuthPages.css'
import './StudentLogin.css'
import { studentLogin, studentSignup } from '../api'

const VIEWS = { login: 'login', signup: 'signup', forgot: 'forgot' }

export default function StudentAuth() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const view = searchParams.get('view') || VIEWS.login
  const validView = VIEWS[view] ? view : VIEWS.login

  const [loginForm, setLoginForm] = useState({ studentId: '', password: '' })
  const [signupForm, setSignupForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    studentNumber: '',
    email: '',
    contact: '',
    course: '',
    password: ''
  })
  const [forgotStudentNumber, setForgotStudentNumber] = useState('')

  const setView = (newView) => {
    setSearchParams({ view: newView })
  }

  const [loginError, setLoginError] = useState('')
  const [signupError, setSignupError] = useState('')
  const loginTimer = useRef(null)
  const signupTimer = useRef(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSkeleton, setShowSkeleton] = useState(false)
  const [showSpinner, setShowSpinner] = useState(false)

  useEffect(() => {
    return () => {
      if (loginTimer.current) clearTimeout(loginTimer.current)
      if (signupTimer.current) clearTimeout(signupTimer.current)
    }
  }, [])

  function setLoginErrorTimed(msg) {
    if (loginTimer.current) clearTimeout(loginTimer.current)
    setLoginError(msg)
    if (msg) {
      loginTimer.current = setTimeout(() => setLoginError(''), 4000)
    }
  }

  function setSignupErrorTimed(msg) {
    if (signupTimer.current) clearTimeout(signupTimer.current)
    setSignupError(msg)
    if (msg) {
      signupTimer.current = setTimeout(() => setSignupError(''), 4000)
    }
  }

  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)
  function showToast(msg, ms = 3000) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(''), ms)
  }

  function handleSignupChange(field, value) {
    // clear visible signup error while user types
    if (signupTimer.current) {
      clearTimeout(signupTimer.current)
      signupTimer.current = null
    }
    if (signupError) setSignupError('')
    setSignupForm((p) => ({ ...p, [field]: value }))
  }

  function handleLoginChange(field, value) {
    if (loginTimer.current) {
      clearTimeout(loginTimer.current)
      loginTimer.current = null
    }
    if (loginError) setLoginError('')
    setLoginForm((p) => ({ ...p, [field]: value }))
  }
  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setLoginError('')
    setSignupError('')
    setIsSubmitting(true)
    try {
      const res = await studentLogin(loginForm.studentId, loginForm.password)
      console.log('studentLogin response:', res)
      if (res?.ok) {
      const combinedName =
        (res.student.name || '').trim() ||
        `${res.student.firstName || ''} ${res.student.middleName ? `${res.student.middleName} ` : ''}${res.student.lastName || ''}`.replace(/\s+/g, ' ').trim()
      try {
        localStorage.setItem('studentId', res.student.studentId || '')
        localStorage.setItem('studentName', combinedName)
        localStorage.setItem('studentEmail', res.student.email || '')
        localStorage.setItem('studentCourse', res.student.course || '')
        localStorage.setItem('studentContact', res.student.contact || '')
        localStorage.setItem('studentAvatar', res.student.avatar || '')
      } catch (e) {}
        // show success toast then spinner for 2s, set session flag for dashboard skeleton, then navigate
        showToast('Logged in successfully')
        setShowSpinner(true)
        setIsSubmitting(false)
        try { sessionStorage.setItem('postLoginSkeleton', '1') } catch (e) {}
        setTimeout(() => {
          setShowSpinner(false)
          navigate('/student/dashboard')
        }, 2000)
    } else {
      // expose backend message when present for easier debugging
      setLoginErrorTimed(res?.error || 'Invalid student number or password')
    }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignupSubmit = async (e) => {
    e.preventDefault()
    setSignupError('')
    setLoginError('')
    // Basic client-side validation
    const first = (signupForm.firstName || '').trim()
    const middle = (signupForm.middleName || '').trim()
    const last = (signupForm.lastName || '').trim()
    const studentNumber = (signupForm.studentNumber || '').trim()
    const email = (signupForm.email || '').trim()
    const contact = (signupForm.contact || '').trim()
    const course = (signupForm.course || '').trim()
    const password = signupForm.password || ''

    if (!first && !middle && !last) {
      setSignupErrorTimed('Please provide at least a first name or last name')
      return
    }
    if (!email) {
      setSignupErrorTimed('Email address is required')
      return
    }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      setSignupErrorTimed('Invalid email format')
      return
    }
    if (!contact) {
      setSignupErrorTimed('Contact number is required')
      return
    }
    if (!course) {
      setSignupErrorTimed('Please select your course')
      return
    }
    if (!password) {
      setSignupErrorTimed('Password is required')
      return
    }
    if (password.length < 8) {
      setSignupErrorTimed('Password must be at least 8 characters')
      return
    }
    if (!/[A-Z]/.test(password)) {
      setSignupErrorTimed('Password must contain at least one uppercase letter')
      return
    }
    if (!/[0-9]/.test(password)) {
      setSignupErrorTimed('Password must contain at least one digit')
      return
    }

    const fullName = `${first || ''} ${middle ? `${middle} ` : ''}${last || ''}`.replace(/\s+/g, ' ').trim()
    const payload = {
      ...signupForm,
      name: fullName
    }
    const res = await studentSignup(payload)
    if (res?.ok) {
      const combinedName =
        (res.student.name || '').trim() ||
        `${res.student.firstName || ''} ${res.student.middleName ? `${res.student.middleName} ` : ''}${res.student.lastName || ''}`.replace(/\s+/g, ' ').trim()
      try {
        localStorage.setItem('studentId', res.student.studentId || '')
        localStorage.setItem('studentName', combinedName)
        localStorage.setItem('studentEmail', res.student.email || '')
        localStorage.setItem('studentCourse', res.student.course || '')
        localStorage.setItem('studentContact', res.student.contact || '')
        localStorage.setItem('studentAvatar', res.student.avatar || '')
      } catch (e) {}
      navigate('/student/dashboard')
    } else {
        // Show backend-provided error message and details when present
        const detailsText = res?.details ? ` - ${JSON.stringify(res.details)}` : ''
        setSignupError(res?.error ? `${res.error}${detailsText}` : 'Sign up failed')
    }
  }

  const handleForgotSubmit = (e) => {
    e.preventDefault()
    navigate('/student/otp', { state: { studentNumber: forgotStudentNumber } })
  }

  const formSide = validView === VIEWS.login ? 'right' : 'left'

  return (
    <div className="student-login-page">
      <AuthLayout formSide={formSide}>
        {toast && <div className="toast">{toast}</div>}
        <div key={validView} className="auth-form-transition auth-form">
          {showSkeleton && (
            <div className="skeleton-overlay">
              <div className="skeleton-card">
                <div className="skeleton-row">
                  <div className="skeleton-circle" />
                  <div style={{flex:1}}>
                    <div className="skeleton-line" style={{width:'40%'}} />
                    <div className="skeleton-line" style={{width:'70%', marginTop:8}} />
                  </div>
                </div>
                <div style={{marginTop:20}}>
                  <div className="skeleton-line" style={{width:'100%', height:18}} />
                  <div className="skeleton-line" style={{width:'100%', height:18, marginTop:8}} />
                  <div className="skeleton-line" style={{width:'60%', height:18, marginTop:8}} />
                </div>
              </div>
            </div>
          )}
          {validView === VIEWS.login && (
            <>
              <h2 className="auth-title">Sign in</h2>
              <form onSubmit={handleLoginSubmit}>
                <Input
                  label="Student Number"
                  placeholder="2023-0000 *"
                  value={loginForm.studentId}
                  onChange={(e) => handleLoginChange('studentId', e.target.value)}
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="Password *"
                  value={loginForm.password}
                  onChange={(e) => handleLoginChange('password', e.target.value)}
                />
                {loginError && <div className="auth-error-submit">{loginError}</div>}
                <div className="form-actions">
                  <button type="button" className="auth-link link-button" onClick={() => setView(VIEWS.forgot)}>
                    Forgot Password?
                  </button>
                  <Button type="submit" className="w-full">Sign In</Button>
                </div>
              </form>
              <p className="auth-footer">
                No account yet? <button type="button" className="link-button" onClick={() => setView(VIEWS.signup)}>Sign up</button>
              </p>
              <Link to="/guest/login" className="continue-guest">Continue as Guest</Link>
            </>
          )}

          {validView === VIEWS.signup && (
            <>
              <h2 className="auth-title">Sign up</h2>
              <p className="auth-instruction">Please enter your details to create an account.</p>
              <form onSubmit={handleSignupSubmit}>
                <div className="signup-grid">
                  <div className="signup-grid-item">
                    <Input
                      label="First Name"
                      placeholder="e.g. Juan *"
                      value={signupForm.firstName}
                      onChange={(e) => handleSignupChange('firstName', e.target.value)}
                    />
                  </div>
                  <div className="signup-grid-item">
                    <Input
                      label="Last Name"
                      placeholder="e.g. Dela Cruz *"
                      value={signupForm.lastName}
                      onChange={(e) => handleSignupChange('lastName', e.target.value)}
                    />
                  </div>
                  <div className="signup-grid-item">
                    <Input
                      label="Middle Name (optional)"
                      placeholder="e.g. Santos"
                      value={signupForm.middleName}
                      onChange={(e) => handleSignupChange('middleName', e.target.value)}
                    />
                  </div>
                  <div className="signup-grid-item">
                    <Input
                      label="Student Number"
                      placeholder="e.g. 2023-0000 *"
                      value={signupForm.studentNumber}
                      onChange={(e) => handleSignupChange('studentNumber', e.target.value)}
                    />
                  </div>
                  <div className="signup-grid-item">
                    <Input
                      label="Email Address"
                      type="email"
                      placeholder="e.g. student@gmail.com *"
                      value={signupForm.email}
                      onChange={(e) => handleSignupChange('email', e.target.value)}
                    />
                  </div>
                  <div className="signup-grid-item">
                    <Input
                      label="Contact Number"
                      placeholder="e.g. 09XX XXX XXXX *"
                      value={signupForm.contact}
                      onChange={(e) => handleSignupChange('contact', e.target.value)}
                    />
                  </div>
                  <div className="signup-grid-item">
                    <div className="form-field">
                      <label className="form-label" htmlFor="course">Course *</label>
                      <select
                        id="course"
                        name="course"
                        value={signupForm.course}
                        onChange={(e) => handleSignupChange('course', e.target.value)}
                        className="form-select"
                      >
                        <option value="">Select your course</option>
                        <option value="BSCS">BSCS</option>
                        <option value="BSED">BSED</option>
                        <option value="BEED">BEED</option>
                        <option value="BSHM">BSHM</option>
                      </select>
                    </div>
                  </div>
                  <div className="signup-grid-item">
                    <Input
                      label="Password"
                      type="password"
                      placeholder="e.g. •••••••• *"
                      value={signupForm.password}
                      onChange={(e) => handleSignupChange('password', e.target.value)}
                    />
                  </div>
                </div>
                {signupError && <div className="auth-error-submit">{signupError}</div>}
                <Button type="submit" className="w-full">Sign up</Button>
              </form>
              <p className="auth-footer">
                Already have an account? <button type="button" className="link-button" onClick={() => setView(VIEWS.login)}>Sign in</button>
              </p>
            </>
          )}

          {validView === VIEWS.forgot && (
            <>
              <h2 className="auth-title">Forgot Password</h2>
              <p className="auth-subtitle-text">Enter your student number.</p>
              <form onSubmit={handleForgotSubmit}>
                <Input
                  label="Student Number"
                  placeholder="2023-0000 *"
                  value={forgotStudentNumber}
                  onChange={(e) => setForgotStudentNumber(e.target.value)}
                />
                <Button type="submit" className="w-full">Forgot Password</Button>
              </form>
              <p className="auth-footer">
                Already have an account? <button type="button" className="link-button" onClick={() => setView(VIEWS.login)}>Sign in</button>
              </p>
            </>
          )}
        </div>
      </AuthLayout>
    </div>
  )
}
