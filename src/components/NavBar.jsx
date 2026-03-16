import { Link, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import './NavBar.css'
import ProfileModal from './ProfileModal'

export default function NavBar({ userType = 'student' }) {
  const navigate = useNavigate()
  const [openNotifs, setOpenNotifs] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const notifRef = useRef(null)
  const btnRef = useRef(null)
  const userRef = useRef(null)
  const userBtnRef = useRef(null)
  const [notifVersion, setNotifVersion] = useState(0)
  const [avatar, setAvatar] = useState(null)

  const stored = typeof window !== 'undefined' && localStorage.getItem('notifications')
  let notifications = stored ? JSON.parse(stored) : []

  // normalize: ensure createdAt present
  notifications = notifications.map(n => ({ ...n, createdAt: n.createdAt || Date.now() }))

  // filter by user type: students see their own notifications, admins see admin/global
  const currentEmail = typeof window !== 'undefined' && localStorage.getItem('studentEmail')
  const currentId = typeof window !== 'undefined' && localStorage.getItem('studentId')
  let visibleNotifications = []
  if (userType === 'admin') {
    // Admin should not see notifications explicitly targeted to students only
    visibleNotifications = notifications.filter(n => (n.target || 'all') !== 'student').slice().sort((a,b) => b.createdAt - a.createdAt)
  } else {
    // For students only show notifications targeted to students or global, and matching this student
    if (currentEmail) {
      visibleNotifications = notifications.filter(n => (n.target || 'all') !== 'admin' && ( !n.email || n.email === currentEmail || n.studentId === currentId )).sort((a,b) => b.createdAt - a.createdAt)
    } else if (currentId) {
      visibleNotifications = notifications.filter(n => (n.target || 'all') !== 'admin' && ( !n.email || n.studentId === currentId )).sort((a,b) => b.createdAt - a.createdAt)
    } else {
      // fallback: show recent global notifications if we can't determine the current student
      visibleNotifications = notifications.filter(n => (n.target || 'all') !== 'admin').slice().sort((a,b) => b.createdAt - a.createdAt).slice(0, 10)
    }
  }
  const unreadCount = visibleNotifications.filter(n => !n.read).length

  const formatTime = (ts) => {
    try {
      const d = new Date(ts)
      const now = Date.now()
      const diff = Math.floor((now - ts) / 1000)
      if (diff < 60) return `${diff}s`
      if (diff < 3600) return `${Math.floor(diff/60)}m`
      if (diff < 86400) return `${Math.floor(diff/3600)}h`
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    } catch (e) { return '' }
  }
  const handleLogout = () => {
    // clear any stored student/admin/guest info including avatar and course/contact
    localStorage.removeItem('studentAppointments')
    localStorage.removeItem('studentName')
    localStorage.removeItem('studentEmail')
    localStorage.removeItem('studentId')
    localStorage.removeItem('studentCourse')
    localStorage.removeItem('studentContact')
    localStorage.removeItem('studentAvatar')
    localStorage.removeItem('adminAvatar')
    localStorage.removeItem('guestName')
    localStorage.removeItem('guestEmail')
    localStorage.removeItem('guestId')
    localStorage.removeItem('guestAppointments')
    // Navigate to appropriate login page based on user type
    if (userType === 'admin') {
      navigate('/admin/login')
    } else if (userType === 'guest') {
      navigate('/guest/login')
    } else {
      navigate('/student/login')
    }
  }

  // close dropdowns when clicking outside
  useEffect(() => {
    function onDoc(e) {
      if (notifRef.current && notifRef.current.contains(e.target)) return
      if (btnRef.current && btnRef.current.contains(e.target)) return
      if (userRef.current && userRef.current.contains(e.target)) return
      if (userBtnRef.current && userBtnRef.current.contains(e.target)) return
      setOpenNotifs(false)
      setShowUserDropdown(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  // load avatar for current user and refresh when profile modal closes or notifications change
  useEffect(() => {
    try {
      const key = userType === 'admin' ? 'adminAvatar' : (userType === 'guest' ? 'guestAvatar' : 'studentAvatar')
      const a = typeof window !== 'undefined' && localStorage.getItem(key)
      setAvatar(a || null)
    } catch (e) { setAvatar(null) }
  }, [userType, showProfile, notifVersion])

  const markAsReadAndOpen = (n) => {
    try {
      const raw = localStorage.getItem('notifications')
      const arr = raw ? JSON.parse(raw) : []
      const next = arr.map(x => x.id === n.id ? { ...x, read: true } : x)
      localStorage.setItem('notifications', JSON.stringify(next))
      setNotifVersion(v => v + 1)
    } catch (e) {}
    try {
      if (userType === 'admin') {
        // allow admin to jump to dashboard and optionally open appointment
        if (n.appointmentId) localStorage.setItem('openAppointmentId', String(n.appointmentId))
        navigate('/admin/dashboard')
      }
    } catch (e) {}
    setOpenNotifs(false)
  }

  const markAllAsRead = () => {
    try {
      const raw = localStorage.getItem('notifications')
      const arr = raw ? JSON.parse(raw) : []
      const ids = new Set(visibleNotifications.map(v => v.id))
      const next = arr.map(x => ids.has(x.id) ? { ...x, read: true } : x)
      localStorage.setItem('notifications', JSON.stringify(next))
      setNotifVersion(v => v + 1)
    } catch (e) {}
  }
  const clearAllNotifications = () => {
    try {
      const raw = localStorage.getItem('notifications')
      const arr = raw ? JSON.parse(raw) : []
      // remove only notifications that are currently visible to this user
      const visibleIds = new Set(visibleNotifications.map(v => v.id))
      const filtered = arr.filter(x => !visibleIds.has(x.id))
      if (filtered.length === 0) localStorage.removeItem('notifications')
      else localStorage.setItem('notifications', JSON.stringify(filtered))
      setNotifVersion(v => v + 1)
      setOpenNotifs(false)
    } catch (e) {}
  }
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  return (
    <nav className="app-navbar">
      <div className="navbar-panel">
        <div className="navbar-brand">
          <div className="navbar-logo-osa" />
          <div className="navbar-logo-nc" />
          <div className="navbar-labels">
            <span className="navbar-label">Norzagaray College</span>
            <div className="navbar-title-line" />
            <h1 className="navbar-title">Office of Student Affairs</h1>
            <span className="navbar-address">Norzagaray, Bulacan</span>
          </div>
        </div>
        <div className="navbar-actions">
          <div className="navbar-actions-inner" ref={notifRef}>
          <button ref={btnRef} className="navbar-notifications" aria-label="Notifications" aria-expanded={openNotifs} onClick={() => setOpenNotifs((s) => !s)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
          </button>
          {openNotifs && (
            <div className="notification-dropdown" role="menu" aria-label="Notifications list">
              <div className="notif-header">
                <div className="notif-title">Notifications</div>
                <div style={{display:'flex', gap:8, alignItems:'center'}}>
                  {unreadCount > 0 ? (
                    <button className="notif-markall" onClick={markAllAsRead}>Mark all as read</button>
                  ) : (
                    <div className="notif-empty-count">All read</div>
                  )}
                  <button className="notif-clear" onClick={clearAllNotifications} style={{marginLeft:8}}>Clear all</button>
                </div>
              </div>
              <div className="notification-list">
                {visibleNotifications.map((n) => (
                  <div key={n.id} className="notification-item" onClick={() => markAsReadAndOpen(n)}>
                    <div className="notification-row">
                      <div className="notification-title">{n.title}</div>
                      <div className="notification-time">{formatTime(n.createdAt)}</div>
                    </div>
                    <div className="notification-message">{n.message}</div>
                  </div>
                ))}
                {visibleNotifications.length === 0 && <div className="notification-empty">No notifications</div>}
              </div>
            </div>
          )}
          </div>
          <div className="navbar-user" ref={userBtnRef} onClick={() => setShowUserDropdown(s => !s)} title="Profile">
            {avatar ? (
              <img src={avatar} alt="avatar" className="navbar-avatar" />
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
              </svg>
            )}
          </div>
        </div>
      </div>
      <div className="navbar-divider" />
        <div ref={userRef}>
          {showUserDropdown && (
            <div className="user-dropdown" role="menu" aria-label="User menu">
              <button className="user-dropdown-item" onClick={() => { setShowProfile(true); setShowUserDropdown(false) }}>
                <span className="user-dropdown-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5z" fill="currentColor" />
                    <path d="M2 22c0-3.866 3.582-7 10-7s10 3.134 10 7v1H2v-1z" fill="currentColor" opacity="0.9" />
                  </svg>
                </span>
                My Account
              </button>
              {userType === 'admin' && (
                <button className="user-dropdown-item" onClick={() => { window.dispatchEvent(new CustomEvent('admin:create-user')); setShowUserDropdown(false) }}>
                  <span className="user-dropdown-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  Create User
                </button>
              )}
              <button className="user-dropdown-item" onClick={() => { setShowUserDropdown(false); setShowLogoutConfirm(true) }}>
                <span className="user-dropdown-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 13v-2H7V8l-5 4 5 4v-3h9z" fill="currentColor" />
                    <path d="M20 3h-8a1 1 0 0 0-1 1v2h2V5h7v14h-7v-1h-2v2a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1z" fill="currentColor" opacity="0.9" />
                  </svg>
                </span>
                Log out
              </button>
            </div>
          )}
        </div>

        {showProfile && <ProfileModal userType={userType} onClose={() => setShowProfile(false)} />}

        {showLogoutConfirm && (
          <div className="confirm-overlay" onClick={() => setShowLogoutConfirm(false)}>
            <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Confirm Log out</h3>
              <p>Are you sure you want to log out?</p>
              <div className="confirm-actions">
                <button className="btn btn-secondary" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={() => { setShowLogoutConfirm(false); handleLogout() }}>Log out</button>
              </div>
            </div>
          </div>
        )}
    </nav>
  )
}
