import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import Input from '../components/Input'
import Button from '../components/Button'
import './AuthPages.css'
import './StudentLogin.css'
import { studentLogin, studentSignup } from '../api'
import { validateStudentSignup } from '../validationHelpers'

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
  const [errors, setErrors] = useState({})
  const [showValidation, setShowValidation] = useState(false)
  const loginTimer = useRef(null)
  const signupTimer = useRef(null)
  const loginLoadTimer = useRef(null)
  const signupLoadTimer = useRef(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSkeleton, setShowSkeleton] = useState(false)
  const [showSpinner, setShowSpinner] = useState(false)

  useEffect(() => {
    return () => {
      if (loginTimer.current) clearTimeout(loginTimer.current)
      if (signupTimer.current) clearTimeout(signupTimer.current)
      if (loginLoadTimer.current) clearTimeout(loginLoadTimer.current)
      if (signupLoadTimer.current) clearTimeout(signupLoadTimer.current)
    }
  }, [])

  function setLoginErrorTimed(msg) {
    if (loginTimer.current) clearTimeout(loginTimer.current)
    setLoginError(msg)
    if (msg) {
      loginTimer.current = setTimeout(() => setLoginError(''), 3000)
    }
  }

  function setSignupErrorTimed(msg) {
    if (signupTimer.current) clearTimeout(signupTimer.current)
    setSignupError(msg)
    if (msg) {
      signupTimer.current = setTimeout(() => setSignupError(''), 3000)
    }
  }

  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)
  function showToast(msg, ms = 3000) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(''), ms)
  }

  // Ensure form fields are cleared when component mounts or when view changes
  useEffect(() => {
    setLoginForm({ studentId: '', password: '' })
    setSignupForm({
      firstName: '',
      middleName: '',
      lastName: '',
      studentNumber: '',
      email: '',
      contact: '',
      course: '',
      password: ''
    })
    setForgotStudentNumber('')
    // clear any transient session flags that might prefill UI
    try { sessionStorage.removeItem('postLoginSkeleton') } catch (e) {}
  }, [validView])

  function handleSignupChange(field, value) {
    // clear visible signup error while user types
    if (signupTimer.current) {
      clearTimeout(signupTimer.current)
      signupTimer.current = null
    }
    if (signupError) setSignupError('')
    setSignupForm((p) => ({ ...p, [field]: value }))
    setErrors(prev => {
      const copy = { ...prev }
      delete copy[field]
      return copy
    })
    if (showValidation) setShowValidation(false)
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
    const start = Date.now()
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
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 2000 - elapsed)
      if (loginLoadTimer.current) clearTimeout(loginLoadTimer.current)
      loginLoadTimer.current = setTimeout(() => {
        setIsSubmitting(false)
        loginLoadTimer.current = null
      }, remaining)
    }
  }

  const handleSignupSubmit = async (e) => {
    e.preventDefault()
    setSignupError('')
    setLoginError('')
    // Use centralized validation helper which returns ordered, field-level errors
    const combined = validateStudentSignup({ ...signupForm, confirmPassword: signupForm.password })
    if (!combined.valid) {
      setErrors(combined.errors)
      setShowValidation(true)
      // show a single generic message to the user and auto-hide
      setSignupErrorTimed('Fill up the requirement')
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

    const fullName = `${(signupForm.firstName||'').trim()} ${(signupForm.middleName?`${signupForm.middleName.trim()} `:'')}${(signupForm.lastName||'').trim()}`.replace(/\s+/g,' ').trim()
    const payload = { ...signupForm, name: fullName }
    let res
    const start = Date.now()
    try {
      setIsSubmitting(true)
      res = await studentSignup(payload)
    } finally {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 2000 - elapsed)
      if (signupLoadTimer.current) clearTimeout(signupLoadTimer.current)
      signupLoadTimer.current = setTimeout(() => {
        setIsSubmitting(false)
        signupLoadTimer.current = null
      }, remaining)
    }
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
        // Show backend-provided error (or generic) and auto-hide
        if (res?.error) {
          setSignupErrorTimed(res.error)
        } else {
          setSignupErrorTimed('Sign up failed')
        }
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
                  <Button type="submit" className="w-full" loading={isSubmitting}>Sign In</Button>
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
                        error={errors.firstName || (showValidation && !signupForm.firstName)}
                      />
                  </div>
                  <div className="signup-grid-item">
                    <Input
                      label="Last Name"
                      placeholder="e.g. Dela Cruz *"
                      value={signupForm.lastName}
                      onChange={(e) => handleSignupChange('lastName', e.target.value)}
                      error={errors.lastName || (showValidation && !signupForm.lastName)}
                    />
                  </div>
                  <div className="signup-grid-item">
                    <Input
                      label="Middle Name (optional)"
                      placeholder="e.g. Santos"
                      value={signupForm.middleName}
                      onChange={(e) => handleSignupChange('middleName', e.target.value)}
                      error={errors.middleName}
                    />
                  </div>
                  <div className="signup-grid-item">
                    <Input
                      label="Student Number"
                      placeholder="e.g. 2023-0000 *"
                      value={signupForm.studentNumber}
                      onChange={(e) => handleSignupChange('studentNumber', e.target.value)}
                      error={errors.studentNumber || (showValidation && !signupForm.studentNumber)}
                    />
                  </div>
                  <div className="signup-grid-item">
                    <Input
                      label="Email Address"
                      type="email"
                      placeholder="e.g. student@gmail.com *"
                      value={signupForm.email}
                      onChange={(e) => handleSignupChange('email', e.target.value)}
                      error={errors.email || (showValidation && !signupForm.email)}
                    />
                  </div>
                  <div className="signup-grid-item">
                    <Input
                      label="Contact Number"
                      placeholder="e.g. 09XX XXX XXXX *"
                      value={signupForm.contact}
                      onChange={(e) => handleSignupChange('contact', e.target.value)}
                      error={errors.contact || (showValidation && !signupForm.contact)}
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
                        className={`form-select ${errors.course || (showValidation && !signupForm.course) ? 'form-select-error' : ''}`}
                      >
                        <option value="">Select your course</option>
                        <option value="BSCS">BSCS</option>
                        <option value="BSED">BSED</option>
                        <option value="BEED">BEED</option>
                        <option value="BSHM">BSHM</option>
                      </select>
                      {(errors.course || (showValidation && !signupForm.course)) && <p className="form-input-error-message">{errors.course || 'Course is required'}</p>}
                    </div>
                  </div>
                  <div className="signup-grid-item">
                    <Input
                      label="Password"
                      type="password"
                      placeholder="e.g. •••••••• *"
                      value={signupForm.password}
                      onChange={(e) => handleSignupChange('password', e.target.value)}
                      error={errors.password || (showValidation && !signupForm.password)}
                    />
                  </div>
                </div>
                {/* Top signup error panel: show single timed message only */}
                {signupError && (
                  <div className="auth-error-submit">
                    <div style={{fontWeight:700, marginBottom: 6}}>{signupError}</div>
                  </div>
                )}
                 <Button type="submit" className="w-full" loading={isSubmitting}>Sign up</Button>
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
