import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import Chatbot from '../components/Chatbot'
import Toast from '../components/Toast'
import GuestAppointmentModal from '../components/GuestAppointmentModal'
import './GuestDashboard.css'
import { listAppointments as apiListAppointments, updateAppointmentStatus as apiUpdateAppointmentStatus, createAppointment as apiCreateAppointment } from '../api'

export default function GuestDashboard() {
  const navigate = useNavigate()
  const [guestName, setGuestName] = useState('Guest')
  const [guestEmail, setGuestEmail] = useState('')
  const [appointments, setAppointments] = useState([])
  const [showSkeleton, setShowSkeleton] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState('')
  const [confirmType, setConfirmType] = useState('success')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [pendingCancelId, setPendingCancelId] = useState(null)
  const [cancelReasonInput, setCancelReasonInput] = useState('')
  const [cancelReasonType, setCancelReasonType] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [showBookingModal, setShowBookingModal] = useState(false)

  // helper: display who cancelled the appointment (try localStorage for actual names)
  const getCancelledByDisplay = (apt) => {
    try {
      if (!apt) return 'Unknown'
      // check local overrides
      try {
        const rawOverrides = typeof window !== 'undefined' && localStorage.getItem('cancelledByOverrides')
        const overrides = rawOverrides ? JSON.parse(rawOverrides) : {}
        if (overrides && apt.id && overrides[String(apt.id)]) {
          const o = overrides[String(apt.id)]
          return o.name || (o.by ? (o.by === 'admin' ? 'Admin' : (o.by === 'student' ? 'Student' : (o.by === 'guest' ? 'Guest' : 'Unknown'))) : 'Unknown')
        }
      } catch (e) {}
      const explicitName = apt.cancelledByName || apt.cancelled_by_name || apt.cancelled_by_display || apt.cancelledBy || apt.adminName || apt.admin_name
      if (explicitName) return String(explicitName)
      const key = String(apt.cancelled_by || apt.cancelledBy || '').toLowerCase()
      const note = String(apt.adminNote || apt.admin_note || '')
      if (apt.admin && typeof apt.admin === 'object') {
        const a = apt.admin
        return a.name || a.fullName || a.full_name || a.username || 'Admin'
      }
      if (key === 'student') return apt.name || (typeof window !== 'undefined' && localStorage.getItem('studentName')) || 'Student'
      if (key === 'guest') return apt.name || (typeof window !== 'undefined' && localStorage.getItem('guestName')) || 'Guest'
      const re1 = /cancelled by[:\s]*([A-Za-z0-9 .,\-'_()]+)/i
      const m1 = note.match(re1)
      if (m1 && m1[1]) {
        const extracted = m1[1].split(/[.\n]/)[0].trim()
        if (/system/i.test(extracted)) return 'Admin'
        return extracted
      }
      const re2 = /was cancelled by[:\s]*([A-Za-z0-9 .,\-'_()]+)/i
      const m2 = note.match(re2)
      if (m2 && m2[1]) {
        const extracted = m2[1].split(/[.\n]/)[0].trim()
        if (/system/i.test(extracted)) return 'Admin'
        return extracted
      }
      if (key === 'admin') {
        try { const raw = typeof window !== 'undefined' && localStorage.getItem('adminUser'); if (raw) { const u = JSON.parse(raw||'{}'); return u.name || u.fullName || u.full_name || u.username || 'Admin' } } catch(e){}
        return 'Admin'
      }
      if (key === 'system') return 'Admin'
      if (/student/i.test(note)) return apt.name || 'Student'
      if (/guest/i.test(note)) return apt.name || 'Guest'
      if (/admin/i.test(note)) return (typeof window !== 'undefined' && (() => { try { const raw = localStorage.getItem('adminUser'); if (raw) { const u = JSON.parse(raw||'{}'); return u.name || u.fullName || u.full_name || u.username } } catch(e){} })()) || 'Admin'

      if (apt.status === 'cancelled') {
        if (apt.studentId || apt.studentId === 0) return 'Student'
        if (apt.guest) return 'Guest'
        try { const raw = typeof window !== 'undefined' && localStorage.getItem('adminUser'); if (raw) return 'Admin' } catch (e) {}
      }

      return 'Unknown'
    } catch (e) { return 'Unknown' }
  }

  // Helper: convert time like "9:30 AM" to minutes since midnight, or null
  const toMinutes = (t) => {
    if (!t) return null
    const m = String(t).match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
    if (!m) return null
    let hh = Number(m[1])
    const mm = Number(m[2])
    const ampm = m[3].toUpperCase()
    if (ampm === 'PM' && hh !== 12) hh += 12
    if (ampm === 'AM' && hh === 12) hh = 0
    return hh * 60 + mm
  }

  // Helper: return true when appointment is currently ongoing
  const isAppointmentOngoing = (apt) => {
    try {
      if (!apt) return false
      const iso = apt.iso || (apt.date ? (apt.date) : '')
      if (!iso) return false
      const now = new Date()
      const todayIso = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
      if (iso !== todayIso) return false
      const startMin = toMinutes(apt.start || apt.time || '')
      const endMin = toMinutes(apt.end || '') || (startMin !== null ? startMin + 30 : null)
      if (startMin === null || endMin === null) return false
      const nowMin = now.getHours() * 60 + now.getMinutes()
      return nowMin >= startMin && nowMin < endMin
    } catch (e) { return false }
  }

  // Handle booking appointment
  const handleBookAppointment = async (data) => {
    try {
      // data.time may be either a single time like '9:00 AM' or a combined '9:00 AM|10:00 AM'
      const timeValue = data.time || ''
      let displayTime = timeValue
      let start = ''
      let end = ''
      if (timeValue.includes('|')) {
        const parts = timeValue.split('|')
        start = parts[0]
        end = parts[1]
        displayTime = `${start} to ${end}`
      } else {
        start = timeValue
        end = ''
      }

      const newAppointment = {
        id: Date.now(),
        date: data.date.toLocaleDateString(),
        iso: `${data.date.getFullYear()}-${String(data.date.getMonth()+1).padStart(2,'0')}-${String(data.date.getDate()).padStart(2,'0')}`,
        time: displayTime,
        start: start,
        end: end,
        reason: data.reason,
        status: 'pending',
        email: guestEmail,
        name: guestName,
        guest: true,
        submittedAt: new Date().toISOString()
      }

      // Check for conflicts
      try {
        const existingRes = await apiListAppointments()
        if (existingRes && existingRes.ok) {
          const existing = existingRes.data || []
          const newStartMin = toMinutes(start)
          const newEndMin = toMinutes(end) || (newStartMin !== null ? newStartMin + 30 : null)

          const conflict = existing.some(a => {
            if (!a || !(a.iso || a.date)) return false
            const iso = a.iso || (a.date ? (a.date) : '')
            if (iso !== newAppointment.iso) return false
            if ((a.status || '').toLowerCase() === 'cancelled') return false
            const es = a.start || a.start_time || ''
            const ee = a.end || a.end_time || ''
            const esMin = toMinutes(es)
            const eeMin = toMinutes(ee) || (esMin !== null ? esMin + 30 : null)
            if (esMin === null || newStartMin === null) {
              return es && start && es.trim() === start.trim()
            }
            return !(newEndMin <= esMin || eeMin <= newStartMin)
          })

          if (conflict) {
            setConfirmType('error')
            setShowConfirm(true)
            setConfirmMessage('An appointment already exists for that date and time. Please choose a different time.')
            setTimeout(() => setShowConfirm(false), 2000)
            return
          }
        }
      } catch (e) {
        // ignore and proceed
      }

      // Save to localStorage
      try {
        const rawApts = localStorage.getItem('appointments')
        const apts = rawApts ? JSON.parse(rawApts) : []
        apts.unshift(newAppointment)
        localStorage.setItem('appointments', JSON.stringify(apts))

        const rawNot = localStorage.getItem('notifications')
        const notifications = rawNot ? JSON.parse(rawNot) : []
        notifications.unshift({
          id: Date.now(),
          appointmentId: newAppointment.id,
          title: 'New appointment request',
          message: `${guestName} requested an appointment on ${newAppointment.date} at ${displayTime}`,
          createdAt: Date.now(),
          read: false,
          email: guestEmail,
          target: 'admin'
        })
        localStorage.setItem('notifications', JSON.stringify(notifications))
      } catch (e) {}

      // Send to API
      try {
        const res = await apiCreateAppointment({
          id: newAppointment.id,
          name: guestName,
          email: guestEmail,
          reason: newAppointment.reason,
          iso: newAppointment.iso,
          start: start,
          end: end,
          status: 'pending',
          guest: true
        })

        if (res && res.ok) {
          await loadAppointments()
          setConfirmType('success')
          setShowConfirm(true)
          setConfirmMessage('Appointment requested successfully!')
          setTimeout(() => setShowConfirm(false), 2000)
        } else {
          setConfirmType('error')
          setShowConfirm(true)
          setConfirmMessage(res?.error || 'Unable to create appointment. It will remain visible locally until resolved.')
          setTimeout(() => setShowConfirm(false), 2000)
        }
      } catch (e) {
        setConfirmType('error')
        setShowConfirm(true)
        setConfirmMessage('Unable to create appointment. Please check your connection.')
        setTimeout(() => setShowConfirm(false), 2000)
      }
    } catch (e) {
      setConfirmType('error')
      setShowConfirm(true)
      setConfirmMessage('Unable to process appointment. Please try again.')
      setTimeout(() => setShowConfirm(false), 2000)
    }
  }

  // Load appointments from API
  const loadAppointments = async () => {
    setShowSkeleton(true)
    try {
      const email = guestEmail || localStorage.getItem('guestEmail') || ''
      const rawApts = localStorage.getItem('appointments')
      const localApts = rawApts ? JSON.parse(rawApts) : []

      // Try loading from backend API first; fall back to localStorage when API unavailable
      let serverApts = []
      try {
        const res = await apiListAppointments()
        if (res && res.ok && Array.isArray(res.data)) serverApts = res.data
      } catch (e) {
        serverApts = []
      }

      // If the API call succeeded (even if it returned an empty array), treat
      // server data as authoritative and do NOT include local-only entries.
      // If the API was unreachable, fall back to localStorage data.
      const serverLoaded = Array.isArray(serverApts) || (serverApts && serverApts.length === 0)
      let allApts = []
      if (serverLoaded) {
        allApts = serverApts || []
        try {
          // overwrite local cache with server state to remove stale local-only entries
          localStorage.setItem('appointments', JSON.stringify(allApts))
        } catch (e) {}
      } else {
        allApts = localApts || []
      }

      // Filter appointments for this guest
      const guestApts = allApts.filter(a => {
        const aEmail = a.email || a.studentEmail || ''
        return a.guest && email && aEmail && aEmail.toLowerCase() === email.toLowerCase()
      })

      // Map appointments to include frontend-friendly fields
      const mapped = guestApts
        .sort((a, b) => {
          const aDate = new Date(a.iso || a.date || 0)
          const bDate = new Date(b.iso || b.date || 0)
          return bDate - aDate
        })
        .map(a => ({
          id: a.id,
          date: (a.iso && isoToLocalDateString(a.iso)) || a.date || '',
          iso: a.iso || '',
          time: a.start && a.end ? `${a.start} to ${a.end}` : (a.start || a.time || ''),
          start: a.start || '',
          end: a.end || '',
          reason: a.reason || '',
          status: (a.status || 'pending').toLowerCase(),
          email: a.email || a.studentEmail || '',
          name: a.name || guestName || 'Guest',
          submittedAt: a.submittedAt || '',
          cancelledAt: a.cancelledAt || '',
          cancelReason: a.cancelReason || a.cancel_reason || '',
          adminNote: a.adminNote || a.admin_note || '',
          guest: !!a.guest
        }))

      setAppointments(mapped)
    } catch (e) {
      console.error(e)
    } finally {
      setShowSkeleton(false)
    }
  }

  // Helper: convert ISO date to local date string
  const isoToLocalDateString = (iso) => {
    if (!iso) return ''
    try {
      const [y, m, d] = iso.split('-')
      const dt = new Date(y, Number(m) - 1, d)
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch (e) { return iso }
  }

  // Cancel appointment
  const handleCancel = (id) => {
    setPendingCancelId(id)
    setCancelReasonInput('')
    setCancelReasonType('')
    setShowCancelModal(true)
  }

  const confirmCancel = () => {
    const id = pendingCancelId
    const type = (cancelReasonType || '').trim()
    const otherText = (cancelReasonInput || '').trim()

    // validation: require a reason type; if 'others' require details
    if (!type) {
      setConfirmType('error')
      setShowConfirm(true)
      setConfirmMessage('Please select a cancellation reason.')
      setTimeout(() => setShowConfirm(false), 2000)
      return
    }
    if (type === 'others' && !otherText) {
      setConfirmType('error')
      setShowConfirm(true)
      setConfirmMessage('Please provide details for "Others".')
      setTimeout(() => setShowConfirm(false), 2000)
      return
    }

    const reasonMap = {
      appointment_cancelled: 'Appointment cancelled',
      class_conflict: 'Class conflict',
      emergency: 'Emergency',
      change_appointment: 'Change appointment',
      others: otherText
    }
    const reason = reasonMap[type] !== undefined ? reasonMap[type] : otherText

    // Optimistically update local state
    const updated = appointments.map(a =>
      a.id === id ? { ...a, status: 'cancelled', cancelReason: reason, cancelled_by: 'guest', cancelledAt: new Date().toISOString() } : a
    )
    setAppointments(updated)
    
    try {
      const raw = localStorage.getItem('appointments')
      const arr = raw ? JSON.parse(raw) : []
      const cancelledA = (appointments.find(a => a.id === id) || {})
      
      // Update local storage
      const updatedArr = arr.map(a =>
        a.id === id ? { ...a, status: 'cancelled', cancelReason: reason, cancelledAt: new Date().toISOString(), cancelled_by: 'guest' } : a
      )
      localStorage.setItem('appointments', JSON.stringify(updatedArr))

      // Send to backend if available
      try {
        apiUpdateAppointmentStatus(id, 'cancelled', { cancelReason: reason })
      } catch (e) {}

      setShowCancelModal(false)
      setCancelReasonType('')
      setCancelReasonInput('')
      setPendingCancelId(null)
      setConfirmType('cancelled')
      setShowConfirm(true)
      setConfirmMessage('Appointment cancelled')
      setTimeout(() => setShowConfirm(false), 2000)
    } catch (e) {
      setConfirmType('error')
      setShowConfirm(true)
      setConfirmMessage('Failed to cancel appointment')
      setTimeout(() => setShowConfirm(false), 2000)
    }
  }

  const cancelCancel = () => {
    setShowCancelModal(false)
    setPendingCancelId(null)
    setCancelReasonType('')
  }

  const handleViewDetails = (apt) => {
    setSelectedAppointment(apt)
    setDetailsOpen(true)
  }

  useEffect(() => {
    const name = localStorage.getItem('guestName') || 'Guest'
    const email = localStorage.getItem('guestEmail') || ''
    setGuestName(name)
    setGuestEmail(email)
  }, [])

  useEffect(() => {
    loadAppointments()
    const id = setInterval(loadAppointments, 30 * 1000)
    return () => clearInterval(id)
  }, [guestEmail])

  // Only show truly pending requests in "My Appointments"
  const pendingAppointments = appointments.filter(a => (a.status || '').toLowerCase() === 'pending')

  // Treat approved/confirmed/rescheduled/declined/done/completed/cancelled as history
  const completedAppointments = appointments.filter(a => {
    const s = (a.status || '').toLowerCase()
    return ['done', 'completed', 'cancelled', 'approved', 'confirmed', 'rescheduled', 'declined'].includes(s)
  })

  return (
    <div className="guest-dashboard">
      <Chatbot />
      <NavBar userType="guest" />
      <main className="guest-main">
        <Toast show={showConfirm} type={confirmType} message={confirmMessage} onClose={() => setShowConfirm(false)} />
        
        <header className="guest-hero">
          <h1>Welcome, {guestName}!</h1>
          <p>View your appointments, statuses, and book new consultations.</p>
        </header>

        <div className="guest-grid">
          <section className="appointments-section">
            <div className="section-header">
              <div>
                <h2>My Appointments</h2>
                <p className="section-subtitle">Manage your OSA appointments</p>
              </div>
              <button
                className="btn-appointment"
                onClick={() => setShowBookingModal(true)}
              >
                <span className="add-icon">+</span>
                Book Appointment
              </button>
            </div>
            <div className="section-divider" />
            <div className="appointments-content">
              {showSkeleton ? (
                <div style={{padding:'2rem'}}>
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
              ) : pendingAppointments.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg width="98" height="98" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <p>No upcoming appointments yet — click below to request your first.</p>
                  <button className="btn-appointment btn-appointment--ghost" onClick={() => setShowBookingModal(true)}>
                    Book your first appointment
                  </button>
                </div>
              ) : (
                <div className="appointment-cards">
                  {pendingAppointments.map(apt => {
                    const s = (apt.status || '').toLowerCase()
                    const cardStatus = s === 'confirmed' ? 'rescheduled' : s
                    return (
                      <div
                        key={apt.id}
                        className={`appointment-card card-${cardStatus}`}
                        onClick={() => handleViewDetails(apt)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="apt-header">
                          <div className="apt-title-section">
                            <div className="apt-title">{apt.reason}</div>
                            <div className="apt-datetime">{apt.date} at {apt.time}</div>
                          </div>
                          <div className="apt-header-actions">
                            <span className={"status-badge status-badge--" + cardStatus + (isAppointmentOngoing(apt) && !['done','completed','cancelled'].includes(((apt.status||'')+'').toLowerCase()) ? ' status-badge--ongoing' : '')}>
                              {(apt.status === 'pending') ? 'Pending for approval' : 
                               (apt.status === 'approved') ? 'Approved' : 
                               (apt.status === 'confirmed') ? (isAppointmentOngoing(apt) ? 'On Going' : 'Rescheduled') : 
                               (apt.status === 'rescheduled') ? 'Rescheduled' : 
                               (apt.status === 'declined') ? 'Declined' : 
                               (apt.status === 'done' || apt.status === 'completed') ? 'Completed' : 
                               (apt.status === 'cancelled') ? 'Cancelled' : apt.status}
                            </span>
                            {apt.status === 'pending' && (
                              <span
                                className="cancel-btn"
                                onClick={(e) => { e.stopPropagation(); handleCancel(apt.id) }}
                                title="Cancel appointment"
                              >
                                🗑
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="apt-reason-section">
                          <span className="apt-reason-label">Reason:</span>
                          <span className="apt-reason-text">For {apt.reason}</span>
                        </div>
                        <div className="apt-footer">
                          <span className="apt-submitted">
                            Submitted on {apt.submittedAt ? (new Date(apt.submittedAt)).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : (apt.date + ' at ' + apt.time)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </section>

        

        <section className="history-section">
          <div className="section-header">
            <div>
              <h1>Appointment History</h1>
              <p className="section-subtitle">Past and completed appointments</p>
            </div>
          </div>
          <div className="section-divider" />
          <div className="history-content">
            {completedAppointments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon history-icon">
                  <svg width="98" height="98" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <p>No Appointments</p>
              </div>
            ) : (
              <div className="appointment-cards">
                {completedAppointments.map(apt => {
                  const s = (apt.status||'').toLowerCase()
                  const cardStatus = s === 'confirmed' ? 'rescheduled' : s
                  return (
                  <div key={apt.id} className={`appointment-card card-${cardStatus}`} onClick={() => handleViewDetails(apt)} style={{ cursor: 'pointer', opacity: 0.8 }}>
                    <div className="apt-header">
                      <div className="apt-title-section">
                        <div className="apt-title">{apt.reason}</div>
                        <div className="apt-datetime">{apt.date} at {apt.time}</div>
                      </div>
                      <div className="apt-header-actions">
                        <span className={"status-badge status-badge--" + cardStatus + (isAppointmentOngoing(apt) && !['done','completed','cancelled'].includes(((apt.status||'')+'').toLowerCase()) ? ' status-badge--ongoing' : '')}>
                          {((apt.status||'').toLowerCase() === 'cancelled') ? 'Cancelled' : ((apt.status||'').toLowerCase() === 'done' || (apt.status||'').toLowerCase() === 'completed') ? 'Completed' : ((apt.status||'').toLowerCase() === 'approved') ? 'Approved' : ((apt.status||'').toLowerCase() === 'confirmed') ? (isAppointmentOngoing(apt) ? 'On Going' : 'Rescheduled') : ((apt.status||'').toLowerCase() === 'rescheduled') ? 'Rescheduled' : ((apt.status||'').toLowerCase() === 'declined') ? 'Declined' : apt.status}
                        </span>
                      </div>
                    </div>
                    <div className="apt-reason-section">
                      <span className="apt-reason-label">Specific Requirements:</span>
                      <span className="apt-reason-text">{apt.reason}</span>
                    </div>
                    {(apt.status||'').toLowerCase() === 'cancelled' && apt.cancelReason && (
                      <div className="apt-cancel-section">
                        <div className="apt-cancel-label">Cancellation reason:</div>
                        <div className="apt-cancel-text">{apt.cancelReason}</div>
                      </div>
                    )}
                    {(apt.status||'').toLowerCase() === 'cancelled' && (
                      <div className="apt-cancel-section">
                        <div className="apt-cancel-label">Cancelled by:</div>
                        <div className="apt-cancel-text">{getCancelledByDisplay(apt)}</div>
                      </div>
                    )}
                    {(apt.status||'').toLowerCase() === 'declined' && apt.adminNote && (
                      <div className="apt-cancel-section">
                        <div className="apt-cancel-label">Decline reason:</div>
                        <div className="apt-cancel-text">{apt.adminNote}</div>
                      </div>
                    )}
                    <div className="apt-footer">
                      {(apt.status||'').toLowerCase() === 'cancelled' ? (
                        <span className="apt-submitted">Cancelled at: {apt.cancelledAt ? (new Date(apt.cancelledAt)).toLocaleString([], { timeZone: 'Asia/Manila', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : (apt.date + ' at ' + apt.time)}</span>
                      ) : (
                        <span className="apt-submitted">Submitted on {apt.submittedAt ? (new Date(apt.submittedAt)).toLocaleString([], { timeZone: 'Asia/Manila', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : (apt.date + ' at ' + apt.time)}</span>
                      )}
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
        </div>

        {detailsOpen && selectedAppointment && (
          <div className="details-modal-overlay" onClick={() => setDetailsOpen(false)}>
            <div className="details-modal open" onClick={(e) => e.stopPropagation()} style={{maxWidth:520}}>
              <div className="details-top">
                <div className="details-main">
                  <h2 className="details-name">{selectedAppointment.name || 'Guest'}</h2>
                  {(selectedAppointment.course || selectedAppointment.department) && (
                    <div className="details-course text-xl font-bold text-gray-500">{selectedAppointment.course || selectedAppointment.department}</div>
                  )}
                  {(selectedAppointment.studentId || selectedAppointment.email) && (
                    <div className="details-id text-gray-400 font-bold mt-1">
                      {selectedAppointment.studentId ? `ID: ${selectedAppointment.studentId}` : selectedAppointment.email}
                    </div>
                  )}
                </div>
                <div className={`details-status status-badge ${(selectedAppointment.status === 'cancelled') ? 'status-badge--cancelled' : (isAppointmentOngoing(selectedAppointment) && !['done','completed','cancelled'].includes(((selectedAppointment.status||'')+'').toLowerCase()) ) ? 'status-badge--ongoing' : (selectedAppointment.status === 'approved') ? 'status-badge--approved' : (selectedAppointment.status === 'pending') ? 'status-badge--pending' : ''}`}>
                  {(selectedAppointment.status === 'cancelled') ? 'Cancelled' : 
                   (isAppointmentOngoing(selectedAppointment) && !['done','completed','cancelled'].includes(((selectedAppointment.status||'')+'').toLowerCase()) ? 'On Going' : 
                    (selectedAppointment.status === 'approved') ? 'Approved' : 
                    (selectedAppointment.status === 'pending') ? 'Pending' : 
                    selectedAppointment.status)}
                </div>
              </div>

              <div className="details-section">
                <h3>Reason for Appointment</h3>
                <p className="text-lg text-gray-700 font-medium leading-relaxed">{selectedAppointment.reason}</p>
              </div>

              <div className="details-section">
                <h3>Schedule Details</h3>
                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <span className="text-blue-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <div>
                    <div className="font-bold text-gray-900">{(selectedAppointment.iso || selectedAppointment.date) ? new Date(selectedAppointment.iso || selectedAppointment.date).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) : ''}</div>
                    <div className="text-gray-500 font-bold">{selectedAppointment.start || selectedAppointment.time}{selectedAppointment.end ? ` - ${selectedAppointment.end}` : ''}</div>
                  </div>
                </div>
              </div>

              {String(selectedAppointment.status || '').toLowerCase() === 'cancelled' && (
                <div className="details-section">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Cancellation Details</h3>
                  {(selectedAppointment.cancelReason || selectedAppointment.cancel_reason) ? (
                    <p className="text-lg text-gray-700 font-medium leading-relaxed">
                      <span className="font-bold">Reason: </span>
                      {selectedAppointment.cancelReason || selectedAppointment.cancel_reason}
                    </p>
                  ) : (
                    <p className="text-lg text-gray-700 font-medium leading-relaxed">No reason provided.</p>
                  )}

                  {(selectedAppointment.cancelledByName || selectedAppointment.cancelled_by_name || selectedAppointment.cancelledBy || selectedAppointment.cancelled_by) && (
                    <p className="text-sm text-gray-500 mt-2">
                      Cancelled by: {selectedAppointment.cancelledByName || selectedAppointment.cancelled_by_name || selectedAppointment.cancelledBy || selectedAppointment.cancelled_by}
                    </p>
                  )}

                  {(selectedAppointment.cancelledAt || selectedAppointment.cancelled_at) && (
                    <p className="text-sm text-gray-500 mt-1">
                      Cancelled at: {new Date(selectedAppointment.cancelledAt || selectedAppointment.cancelled_at).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {selectedAppointment.adminNote && (
                <div className="details-section">
                  <h3>Admin Note:</h3>
                  <p>{selectedAppointment.adminNote}</p>
                </div>
              )}

              {selectedAppointment.submittedAt && (
                <div className="details-section">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Submission Date</h3>
                  <p className="text-gray-600 font-bold">{new Date(selectedAppointment.submittedAt).toLocaleString()}</p>
                </div>
              )}

              <div className="details-actions">
                <button className="close-btn" onClick={() => setDetailsOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        )}

        {showCancelModal && (
          <div className="details-modal-overlay" onClick={cancelCancel}>
            <div className="details-modal open" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Cancel appointment</h2>
                <p className="modal-subtitle">Please tell us why you're cancelling</p>
              </div>
              <div className="modal-body">
                <label className="modal-label">Cancellation Reason</label>
                <select
                  className="modal-select"
                  value={cancelReasonType}
                  onChange={e => setCancelReasonType(e.target.value)}
                >
                  <option value="" disabled>Select reason</option>
                  <option value="appointment_cancelled">Appointment Cancelled</option>
                  <option value="class_conflict">Class Conflict</option>
                  <option value="emergency">Emergency</option>
                  <option value="change_appointment">Change Date Appointment</option>
                  <option value="others">Others</option>
                </select>
                {cancelReasonType === 'others' && (
                  <textarea
                    className="modal-textarea"
                    value={cancelReasonInput}
                    onChange={e => setCancelReasonInput(e.target.value)}
                    placeholder="Please provide cancellation details"
                  />
                )}
              </div>
              <div className="modal-footer">
                <button className="close-btn" onClick={cancelCancel}>Back</button>
                <button className="decline-btn" onClick={confirmCancel}>Confirm Cancel</button>
              </div>
            </div>
          </div>
        )}

        {showBookingModal && (
          <GuestAppointmentModal 
            show={showBookingModal} 
            onClose={() => setShowBookingModal(false)} 
            onSubmit={handleBookAppointment}
          />
        )}
      </main>
    </div>
  )
}
