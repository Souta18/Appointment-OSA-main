import './AuthLayout.css'

/**
 * Split layout: branding panel (dark blue) + form panel (light).
 * formSide: 'left' | 'right' — which side the form is on (Sign in = right, Sign up/Forgot = left).
 * side (legacy): 'left' = branding left → form right, 'right' = form left.
 */
export default function AuthLayout({ children, formSide, side = 'left' }) {
  const formSideResolved = formSide ?? (side === 'left' ? 'right' : 'left')
  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className={`auth-branding-panel ${formSideResolved === 'left' ? 'auth-branding-order-2' : 'auth-branding-order-1'}`}>
          <div className="auth-branding-content">
            <div className="auth-logo" />
            <h1 className="auth-school-name">Norzagaray College</h1>
            <p className="auth-osa">Office of the Student Affairs</p>
            <p className="auth-tagline">Schedule your appointments with ease.</p>
            <ul className="auth-features">
              <li>
                <span className="auth-feature-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                </span>
                <div>
                  <strong>Easy Scheduling</strong>
                  <span>Book appointments in just a few clicks.</span>
                </div>
              </li>
              <li>
                <span className="auth-feature-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                </span>
                <div>
                  <strong>Real-time Updates</strong>
                  <span>Get notified about appointment status.</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
        <div className={`auth-form-panel-wrapper ${formSideResolved === 'left' ? 'auth-form-order-1' : 'auth-form-order-2'}`}>
          <div className="auth-form-panel">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
