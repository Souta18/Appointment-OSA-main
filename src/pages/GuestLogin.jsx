import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import Input from '../components/Input'
import Button from '../components/Button'
import './AuthPages.css'
import './GuestLogin.css'
import { guestLogin, guestSignup } from '../api'
import { validateEmailMessage, validatePhoneMessage, validateNameMessage, validatePassword } from '../validationHelpers'

export default function GuestLogin() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const loadingTimer = useRef(null)
  const [view, setView] = useState('signin') // 'signin' or 'signup'
  const [signInForm, setSignInForm] = useState({ username: '', password: '' })
  const [signUpForm, setSignUpForm] = useState({ firstName: '', middleName: '', lastName: '', email: '', contact: '', password: '' })
  const [errors, setErrors] = useState({})
  const [showValidation, setShowValidation] = useState(false)

  const handleSignInChange = (e) => {
    const { name, value } = e.target
    setSignInForm({ ...signInForm, [name]: value })
    setError('')
    setErrors(prev => {
      const copy = { ...prev }
      delete copy[name]
      return copy
    })
    if (showValidation) setShowValidation(false)
  }

  const handleSignUpChange = (e) => {
    const { name, value } = e.target
    setSignUpForm({ ...signUpForm, [name]: value })
    setError('')
    setErrors(prev => {
      const copy = { ...prev }
      delete copy[name]
      return copy
    })
    if (showValidation) setShowValidation(false)
  }

  const [error, setError] = useState('')
  useEffect(() => {
    if (!error) return
    const id = setTimeout(() => setError(''), 2000)
    return () => clearTimeout(id)
  }, [error])

  useEffect(() => {
    if (Object.keys(errors).length === 0 && !showValidation) return
    const id = setTimeout(() => {
      setErrors({})
      setShowValidation(false)
    }, 2000)
    return () => clearTimeout(id)
  }, [errors, showValidation])

  useEffect(() => {
    return () => {
      if (loadingTimer.current) clearTimeout(loadingTimer.current)
    }
  }, [])
  
    // Map API error strings to friendlier guest-specific messages
    const mapGuestError = (err, context = 'general') => {
      if (!err) {
        return context === 'signup' ? 'Sign up failed. Please try again.' : 'An error occurred. Please try again.'
      }
      const e = String(err).toLowerCase()
      // Handle duplicate account messages from backend (email/contact)
      if (e.includes('exists') || e.includes('already') || e.includes('registered')) {
        return 'An account with this email or contact already exists. Please sign in instead or use a different email/contact.'
      }
      if (e.includes('fill') || e.includes('required') || e.includes('missing')) {
        return context === 'signup' ? 'Please fill in all required fields to sign up.' : 'Please fill in all required fields.'
      }
      if (e.includes('invalid') && context === 'signup') return 'Please enter a valid email address.'
      if (e.includes('invalid') || e.includes('password') || e.includes('email')) {
        return context === 'login' ? 'Invalid email or password. Please try again.' : 'Please check your details and try again.'
      }
      if (e.includes('connect') || e.includes('unable to connect')) return 'Unable to connect. Please check your internet connection and try again.'
      return err
    }
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const start = Date.now()
    setIsSubmitting(true)
    if (view === 'signup') {
      // Client-side validation before sending to API
      const vErrors = {}
      const fnMsg = validateNameMessage(signUpForm.firstName, 'First Name')
      if (fnMsg) vErrors.firstName = fnMsg
      const lnMsg = validateNameMessage(signUpForm.lastName, 'Last Name')
      if (lnMsg) vErrors.lastName = lnMsg
      const emailMsg = validateEmailMessage(signUpForm.email)
      if (emailMsg) vErrors.email = emailMsg
      const contactMsg = validatePhoneMessage(signUpForm.contact)
      if (contactMsg) vErrors.contact = contactMsg
      const pwd = validatePassword(signUpForm.password)
      if (!pwd.valid) vErrors.password = pwd.errors[0]
      if (Object.keys(vErrors).length > 0) {
        setErrors(vErrors)
        setShowValidation(true)
        setError('Please fill in all required fields correctly.')
        setIsSubmitting(false)
        return
      }
      const fullName = `${signUpForm.firstName || ''}${signUpForm.middleName ? ' ' + signUpForm.middleName : ''}${signUpForm.lastName ? ' ' + signUpForm.lastName : ''}`.trim()
      const payload = {
        name: fullName,
        email: signUpForm.email,
        contact: signUpForm.contact,
        password: signUpForm.password
      }
      const res = await guestSignup(payload)
      if (res?.ok) {
        try {
            localStorage.setItem('guestName', res.guest.name)
            localStorage.setItem('guestEmail', res.guest.email)
            if (res.guest.id) localStorage.setItem('guestId', String(res.guest.id))
            if (res.guest.contact) localStorage.setItem('guestContact', res.guest.contact)
        } catch (e) {}
          // After signup, go directly to guest dashboard
          navigate('/guest/dashboard', { state: { name: res.guest.name, guestId: res.guest.id } })
        // ensure loading shows at least 2s
        const elapsed = Date.now() - start
        const remaining = Math.max(0, 2000 - elapsed)
        if (loadingTimer.current) clearTimeout(loadingTimer.current)
        loadingTimer.current = setTimeout(() => setIsSubmitting(false), remaining)
        return
      } else {
        setError(mapGuestError(res?.error, 'signup'))
        const elapsed = Date.now() - start
        const remaining = Math.max(0, 2000 - elapsed)
        if (loadingTimer.current) clearTimeout(loadingTimer.current)
        loadingTimer.current = setTimeout(() => setIsSubmitting(false), remaining)
        return
      }
    }
    const res = await guestLogin(signInForm.username, signInForm.password)
    if (res?.ok) {
      try {
        localStorage.setItem('guestName', res.guest.name)
        localStorage.setItem('guestEmail', res.guest.email)
        localStorage.setItem('guestId', String(res.guest.id))
        if (res.guest.contact) localStorage.setItem('guestContact', res.guest.contact)
      } catch (e) {}
      navigate('/guest/dashboard', { state: { name: res.guest.name } })
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 2000 - elapsed)
      if (loadingTimer.current) clearTimeout(loadingTimer.current)
      loadingTimer.current = setTimeout(() => setIsSubmitting(false), remaining)
    } else {
      setError(mapGuestError(res?.error, 'login'))
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 2000 - elapsed)
      if (loadingTimer.current) clearTimeout(loadingTimer.current)
      loadingTimer.current = setTimeout(() => setIsSubmitting(false), remaining)
    }
  }

  return (
    <div className="guest-login-page">
    <AuthLayout side="left" subtitle="Schedule your appointments with ease.">
      <div className="auth-form guest-form">
        <div className="auth-back auth-top" style={{ marginBottom: '1rem' }}>
          <Button type="button" variant="secondary" onClick={() => navigate('/')}>
            Back
          </Button>
        </div>
        <div className="auth-tabs">
          <button type="button" className={view==='signin'? 'active' : ''} onClick={() => { setView('signin'); setError(''); setSignInForm((s) => ({ ...s, password: '' })); setSignUpForm((s) => ({ ...s, password: '' })); }}>Sign In</button>
          <button type="button" className={view==='signup'? 'active' : ''} onClick={() => { setView('signup'); setError(''); setSignInForm((s) => ({ ...s, password: '' })); setSignUpForm((s) => ({ ...s, password: '' })); }}>Sign Up</button>
        </div>
        {view === 'signin' ? (
          <>
            <h2 className="auth-title">Sign in</h2>
            <p className="auth-subtitle-text">Sign in with your guest account to view bookings.</p>
            <form onSubmit={handleSubmit}>
              <Input label="Email or Username" name="username" placeholder="Email or username" value={signInForm.username} onChange={handleSignInChange} error={''} />
              <Input label="Password" name="password" type="password" placeholder="Password" value={signInForm.password} onChange={handleSignInChange} error={''} />
              {error && <div className="auth-error">{error}</div>}
              <div className="guest-buttons">
                <Button type="submit" variant="primary" className="w-full" loading={isSubmitting}>Sign In</Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <h2 className="auth-title">Sign up</h2>
            <p className="auth-subtitle-text">Please enter your details to create an account.</p>
            <form onSubmit={handleSubmit}>
              <div className="signup-grid">
                  <div>
                    <Input label="First Name" name="firstName" placeholder="e.g. Juan *" value={signUpForm.firstName} onChange={handleSignUpChange} error={errors.firstName || (showValidation && !signUpForm.firstName ? 'First Name is required' : '')} />
                  </div>
                  <div>
                    <Input label="Last Name" name="lastName" placeholder="e.g. Dela Cruz *" value={signUpForm.lastName} onChange={handleSignUpChange} error={errors.lastName || (showValidation && !signUpForm.lastName ? 'Last Name is required' : '')} />
                  </div>

                <div>
                  <Input label="Middle Name (optional)" name="middleName" placeholder="e.g. Santos" value={signUpForm.middleName} onChange={handleSignUpChange} />
                </div>
                <div>
                  <Input label="Contact Number" name="contact" placeholder="e.g. 09XX XXX XXXX *" value={signUpForm.contact} onChange={handleSignUpChange} error={errors.contact || (showValidation && !signUpForm.contact ? 'Contact is required' : '')} />
                </div>

                <div>
                  <Input label="Email Address" name="email" type="email" placeholder="e.g. student@gmail.com *" value={signUpForm.email} onChange={handleSignUpChange} error={errors.email || (showValidation && !signUpForm.email ? 'Email is required' : '')} />
                </div>
                <div>
                  <Input label="Password" name="password" type="password" placeholder="e.g. •••••••• *" value={signUpForm.password} onChange={handleSignUpChange} error={errors.password || (showValidation && !signUpForm.password ? 'Password is required' : '')} />
                </div>
              </div>
              {/* Show top-level error panel only for Sign Up view */}
              {error && (
                <div className="auth-error">{error}</div>
              )}
              <div className="guest-buttons">
                <Button type="button" variant="secondary" onClick={() => { setView('signin'); setError('') }}>Have an account?</Button>
                <Button type="submit" variant="primary" loading={isSubmitting}>Sign up</Button>
              </div>
            </form>
          </>
        )}
      </div>
    </AuthLayout>
    </div>
  )
}
