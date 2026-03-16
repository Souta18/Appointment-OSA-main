import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import AppointmentModal from '../components/AppointmentModal'
import Toast from '../components/Toast'
import './StudentLanding.css'
import Chatbot from '../components/Chatbot'
import { createAppointment as apiCreateAppointment, listAppointments as apiListAppointments, getStudentId, updateAppointmentStatus as apiUpdateAppointmentStatus } from '../api'

export default function StudentLanding() {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [appointments, setAppointments] = useState([])
  const [showSkeleton, setShowSkeleton] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState('')
  const [confirmType, setConfirmType] = useState('success')
  const [notifications, setNotifications] = useState([])
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [pendingCancelId, setPendingCancelId] = useState(null)
  const [cancelReasonInput, setCancelReasonInput] = useState('')
  // details modal state (was missing and breaks rendering)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState(null)

  const handleBookAppointment = async (data) => {
    // check ban for this student email
    try {
      const email = localStorage.getItem('studentEmail') || 'student@example.edu'
      const rawBans = localStorage.getItem('bans')
      const bans = rawBans ? JSON.parse(rawBans) : {}
      const until = bans[email]
      if (until && Number(until) > Date.now()) {
        const untilStr = new Date(Number(until)).toLocaleString()
        setConfirmType('error')
        setShowConfirm(true)
        setConfirmMessage(`Your booking privileges are suspended until ${untilStr}.`) 
        setTimeout(() => setShowConfirm(false), 5000)
        return
      }
    } catch (e) {}
    // determine student identity from localStorage if available
    const storedName = localStorage.getItem('studentName')
    const storedId = getStudentId() || localStorage.getItem('studentId') || localStorage.getItem('student_id')
    const email = localStorage.getItem('studentEmail') || 'student@example.edu'
    const makeTitle = (s) => s.split(/\.|_|-|\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    const fallbackName = makeTitle(email.split('@')[0])
    const studentName = storedName || fallbackName
    const studentId = storedId || ''

    // data.time may be either a single time like '9:00 AM' or a combined '09:00 AM|10:00 AM'
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

    // normalize time values
    const newAppointment = {
      id: Date.now(),
      date: data.date.toLocaleDateString(),
      iso: `${data.date.getFullYear()}-${String(data.date.getMonth()+1).padStart(2,'0')}-${String(data.date.getDate()).padStart(2,'0')}`,
      time: displayTime,
      start: start,
      end: end,
      reason: data.reason,
      status: 'pending',
      studentEmail: email,
      name: studentName,
      studentId: studentId,
      guest: false
    }
    
    // Check for existing/conflicting appointments on the server for the same date and time
    try {
      const existingRes = await apiListAppointments()
      if (existingRes && existingRes.ok) {
        const existing = existingRes.data || []
        const toMinutes = (t) => {
          if (!t) return null
          const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
          if (!m) return null
          let hh = Number(m[1])
          const mm = Number(m[2])
          const ampm = m[3].toUpperCase()
          if (ampm === 'PM' && hh !== 12) hh += 12
          if (ampm === 'AM' && hh === 12) hh = 0
          return hh * 60 + mm
        }

        const newStartMin = toMinutes(start)
        const newEndMin = toMinutes(end) || (newStartMin !== null ? newStartMin + 30 : null)

        const conflict = existing.some(a => {
          if (!a || !(a.iso || a.date)) return false
          const iso = a.iso || (a.date ? a.date : '')
          if (iso !== newAppointment.iso) return false
          if ((a.status || '').toLowerCase() === 'cancelled') return false
          const es = a.start || a.start_time || ''
          const ee = a.end || a.end_time || ''
          const esMin = toMinutes(es)
          const eeMin = toMinutes(ee) || (esMin !== null ? esMin + 30 : null)
          if (esMin === null || newStartMin === null) {
            // fallback to string-equality check on start time
            return es && start && es.trim() === start.trim()
          }
          // overlapping intervals
          return !(newEndMin <= esMin || eeMin <= newStartMin)
        })

        if (conflict) {
          setConfirmType('error')
          setShowConfirm(true)
          setConfirmMessage('An appointment already exists for that date and time. Please choose a different time.')
          setTimeout(() => setShowConfirm(false), 5000)
          return
        }
      }
    } catch (e) {
      // ignore network errors here and proceed optimistically
    }

    const next = [newAppointment, ...appointments]
    setAppointments(next)
    try {
      const rawNot = localStorage.getItem('notifications')
      const arr = rawNot ? JSON.parse(rawNot) : []
      arr.unshift({
        id: Date.now(),
        appointmentId: newAppointment.id,
        title: 'New appointment request',
        message: `${newAppointment.name} requested an appointment on ${newAppointment.date} at ${newAppointment.time}`,
        createdAt: Date.now(),
        read: false,
        studentId: newAppointment.studentId,
        email: newAppointment.studentEmail,
        target: 'admin'
      })
      localStorage.setItem('notifications', JSON.stringify(arr))
    } catch (e) {}
    try {
      const res = await apiCreateAppointment({
        id: newAppointment.id,
        name: newAppointment.name,
        studentId: newAppointment.studentId,
        studentEmail: newAppointment.studentEmail,
        reason: newAppointment.reason,
        iso: newAppointment.iso,
        start: newAppointment.start,
        end: newAppointment.end,
        status: newAppointment.status,
        guest: newAppointment.guest
      })
      // Only refresh from server when creation succeeded; otherwise keep optimistic item
      if (res && res.ok) {
        await loadAppointments()
        setConfirmType('success')
        setShowConfirm(true)
        setConfirmMessage('Appointment requested successfully!')
        setTimeout(() => setShowConfirm(false), 3000)
      } else {
        setConfirmType('error')
        setShowConfirm(true)
        setConfirmMessage(res?.error || 'Unable to create appointment. It will remain visible locally until resolved.')
        setTimeout(() => setShowConfirm(false), 5000)
      }
    } catch (e) {
      setConfirmType('error')
      setShowConfirm(true)
      setConfirmMessage('Unable to create appointment. Please check your connection.')
      setTimeout(() => setShowConfirm(false), 5000)
    }
  }

  const handleCancel = (id) => {
    setPendingCancelId(id)
    setCancelReasonInput('')
    setShowCancelModal(true)
  }

  const confirmCancel = () => {
    const id = pendingCancelId
    const reason = (cancelReasonInput || '').trim()
    // Optimistically update local state
    const updated = appointments.map(a =>
      a.id === id ? { ...a, status: 'cancelled', cancelReason: reason, adminNote: 'Cancelled by student' } : a
    )
    setAppointments(updated)
    try {
      const rawNot = localStorage.getItem('notifications')
      const arr = rawNot ? JSON.parse(rawNot) : []
      const cancelledA = (appointments.find(a => a.id === id) || {})
      const reasonMsg = reason ? ` Reason: ${reason}` : ''
      arr.unshift({ id: Date.now(), appointmentId: id, title: 'Appointment cancelled by student', message: `${cancelledA.name || 'A student'} cancelled their appointment on ${cancelledA.date || ''} at ${cancelledA.time || ''}.${reasonMsg}`, createdAt: Date.now(), read: false, studentId: cancelledA.studentId || cancelledA.studentId, email: cancelledA.studentEmail, target: 'admin' })
      localStorage.setItem('notifications', JSON.stringify(arr))
    } catch (e) {}

    // Call backend to cancel and refresh
    (async () => {
      try {
        if (id) await apiUpdateAppointmentStatus(id, 'cancelled', { cancelReason: reason })
      } catch (e) { /* ignore */ }
      await loadAppointments()
      setShowCancelModal(false)
      setPendingCancelId(null)
      setConfirmType('success')
      setShowConfirm(true)
      setConfirmType('error')
      setConfirmMessage('Appointment cancelled')
      setTimeout(() => setShowConfirm(false), 3000)
    })()
  }

  const cancelCancel = () => {
    setShowCancelModal(false)
    setPendingCancelId(null)
    setCancelReasonInput('')
  }

  // load notifications for this student
  useEffect(() => {
    // show skeleton if navigated from login
    try {
      if (sessionStorage.getItem('postLoginSkeleton')) {
        sessionStorage.removeItem('postLoginSkeleton')
        setShowSkeleton(true)
        const t = setTimeout(() => setShowSkeleton(false), 3000)
        return () => clearTimeout(t)
      }
    } catch (e) {}
    const load = () => {
      try {
        const email = localStorage.getItem('studentEmail') || 'student@example.edu'
        const raw = localStorage.getItem('notifications')
        const all = raw ? JSON.parse(raw) : []
        const mine = all.filter(n => n.email === email).sort((a,b) => b.createdAt - a.createdAt)
        setNotifications(mine)
      } catch (e) { setNotifications([]) }
    }
    load()
    const id = setInterval(load, 10 * 1000)
    return () => clearInterval(id)
  }, [])

  // load appointments for this student from server
  const loadAppointments = async () => {
    try {
      const storedId = localStorage.getItem('studentId') || ''
      const email = localStorage.getItem('studentEmail') || ''
      const res = await apiListAppointments()
      if (!res.ok) {
        // leave existing local appointments as-is
        return
      }
      const serverApts = res.data || []
      // Helper: parse YYYY-MM-DD into a local Date to avoid timezone shifts
      const isoToLocalDateString = (iso) => {
        try {
          if (!iso) return ''
          const parts = String(iso).split('-')
          if (parts.length < 3) return new Date(iso).toLocaleDateString()
          const y = Number(parts[0])
          const m = Number(parts[1]) - 1
          const d = Number(parts[2])
          return new Date(y, m, d).toLocaleDateString()
        } catch (e) { return '' }
      }

      // Map server shape to local appointment shape used in this component
      const mapped = serverApts
        .filter(a => {
          // match by student number or email
          if (!a) return false
          const sid = (a.studentId || '') + ''
          const ae = (a.email || '') + ''
          return (storedId && sid && sid === storedId) || (email && ae && ae === email)
        })
        .map(a => ({
          id: a.id,
          date: (a.iso && isoToLocalDateString(a.iso)) || '',
          iso: a.iso || '',
          time: a.start && a.end ? `${a.start} to ${a.end}` : (a.start || ''),
          start: a.start || '',
          end: a.end || '',
          reason: a.reason || '',
          status: (a.status || 'pending') || 'pending',
          studentEmail: a.email || '',
          name: `${a.firstName || ''} ${a.lastName || ''}`.trim() || '',
          studentId: a.studentId || '',
          submittedAt: a.submittedAt || '',
          cancelledAt: a.cancelledAt || '',
          cancelReason: a.cancelReason || a.cancel_reason || '',
          adminNote: a.adminNote || a.admin_note || '',
          guest: !!a.guest
        }))

      setAppointments(mapped)
    } catch (e) {
      // ignore
    }
  }

  // helper: convert time like "9:30 AM" to minutes since midnight, or null
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

  // helper: return true when appointment is currently ongoing (same date and now between start and end)
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

  useEffect(() => {
    // initial load of appointments
    loadAppointments()
    const id = setInterval(loadAppointments, 30 * 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="student-landing">
      <Chatbot />
      <NavBar userType="student" />
      <main className="student-main">
        <Toast show={showConfirm} type={confirmType} message={confirmMessage} onClose={() => setShowConfirm(false)} />
        {/* Notifications are now available in the navbar dropdown; removed inline notifications bar */}
        <section className="appointments-section">
          <div className="section-header">
            <div>
              <h1>Appointments</h1>
              <p className="section-subtitle">Manage your OSA appointments</p>
            </div>
            <button
              className="btn-appointment"
              onClick={() => setShowModal(true)}
            >
              <span className="add-icon">+</span>
              Add Appointment
            </button>
          </div>
          <div className="section-divider" />
          <div className="appointments-content">
                {appointments.filter(a => (a.status || '').toLowerCase() === 'pending').length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg width="98" height="98" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <p>No Appointments</p>
              </div>
            ) : (
              <div className="appointment-cards">
                {appointments.filter(a => (a.status || '').toLowerCase() === 'pending').map(apt => {
                  const s = (apt.status||'').toLowerCase()
                  const cardStatus = s === 'confirmed' ? 'rescheduled' : s
                  return (
                  <div key={apt.id} className={`appointment-card card-${cardStatus}`}>
                    <div className="apt-header">
                      <div className="apt-title-section">
                        <div className="apt-title">{apt.reason}</div>
                        <div className="apt-datetime">{apt.date} at {apt.time}</div>
                      </div>
                      <div className="apt-header-actions">
                        <span className={`status-text status-${cardStatus} ${isAppointmentOngoing(apt) ? 'status-ongoing' : ''}`}>
                          {((apt.status||'').toLowerCase() === 'pending') ? 'Pending for approval' : ((apt.status||'').toLowerCase() === 'approved') ? 'Approved' : ((apt.status||'').toLowerCase() === 'confirmed') ? (isAppointmentOngoing(apt) ? 'On Going' : 'Rescheduled') : ((apt.status||'').toLowerCase() === 'rescheduled') ? 'Rescheduled' : ((apt.status||'').toLowerCase() === 'declined') ? 'Declined' : ((apt.status||'').toLowerCase() === 'done' || (apt.status||'').toLowerCase() === 'completed') ? 'Completed' : ((apt.status||'').toLowerCase() === 'cancelled') ? 'Cancelled' : apt.status}
                        </span>
                        {(apt.status||'').toLowerCase() === 'pending' && (
                          <span
                            className="cancel-btn"
                            onClick={() => handleCancel(apt.id)}
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
                          <span className="apt-submitted">Submitted on {apt.submittedAt ? (new Date(apt.submittedAt)).toLocaleString([], { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : (apt.date + ' at ' + apt.time)}</span>
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
        {detailsOpen && selectedAppointment && (
          <div className="details-modal-overlay" onClick={() => setDetailsOpen(false)}>
                <div className={`details-modal open`} onClick={(e) => e.stopPropagation()}>
              <div className="details-top">
                <div className="details-main">
                  {selectedAppointment.name ? (
                    <img src={`/Images/${selectedAppointment.name}.png`} alt={selectedAppointment.name} style={{width:64,height:64,borderRadius:'50%',objectFit:'cover',marginRight:12}} onError={(e)=>{ e.currentTarget.style.display='none' }} />
                  ) : null}
                  <h2 className="details-name">{selectedAppointment.name || 'Guest'}</h2>
                  {selectedAppointment.studentId && <div className="details-id">Student ID: {selectedAppointment.studentId}</div>}
                </div>
                <div className={`details-status status-text ${((selectedAppointment.status||'').toLowerCase() === 'cancelled') ? 'status-cancelled' : (isAppointmentOngoing(selectedAppointment) ? 'status-ongoing' : ((selectedAppointment.status||'').toLowerCase() === 'approved') ? 'status-approved' : ((selectedAppointment.status||'').toLowerCase() === 'pending') ? 'status-pending' : '')}`}>
                  {((selectedAppointment.status||'').toLowerCase() === 'cancelled') ? 'Cancelled' : (isAppointmentOngoing(selectedAppointment) ? 'On Going' : ((selectedAppointment.status||'').toLowerCase() === 'approved') ? 'Approved' : ((selectedAppointment.status||'').toLowerCase() === 'pending') ? 'Pending' : selectedAppointment.status)}
                </div>
              </div>

              <div className="details-section">
                <h3>Reason:</h3>
                <p>{selectedAppointment.reason}</p>
              </div>

              <div className="details-section">
                <h3>Schedule Date:</h3>
                <p>{(selectedAppointment.iso || selectedAppointment.date) ? selectedAppointment.iso || selectedAppointment.date : ''}{selectedAppointment.start ? ' at ' + selectedAppointment.start : ''}{selectedAppointment.end ? ' to ' + selectedAppointment.end : ''}</p>
              </div>

              {selectedAppointment.status === 'cancelled' && selectedAppointment.cancelReason && (
                <div className="details-section">
                  <h3>Cancellation reason:</h3>
                  <p>{selectedAppointment.cancelReason}</p>
                </div>
              )}

              {selectedAppointment.status === 'declined' && selectedAppointment.adminNote && (
                <div className="details-section">
                  <h3>Decline reason:</h3>
                  <p>{selectedAppointment.adminNote}</p>
                </div>
              )}

              <div style={{display:'flex', justifyContent:'flex-end', marginTop:18}}>
                <button className="close-btn" onClick={() => setDetailsOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        )}

        <section className="history-section">
          <div className="section-header">
            <div>
              <h1>Appointment History</h1>
              <p className="section-subtitle">Past and completed appointments</p>
            </div>
          </div>
          <div className="section-divider" />
          <div className="history-content">
            {appointments.filter(a => (a.status || '').toLowerCase() !== 'pending').length === 0 ? (
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
                {appointments.filter(a => (a.status || '').toLowerCase() !== 'pending').map(apt => {
                  const s = (apt.status||'').toLowerCase()
                  const cardStatus = s === 'confirmed' ? 'rescheduled' : s
                  return (
                  <div key={apt.id} className={`appointment-card card-${cardStatus}`}>
                    <div className="apt-header">
                      <div className="apt-title-section">
                        <div className="apt-title">{apt.reason}</div>
                        <div className="apt-datetime">{apt.date} at {apt.time}</div>
                      </div>
                      <div className="apt-header-actions">
                        <span className={`status-text status-${cardStatus} ${isAppointmentOngoing(apt) ? 'status-ongoing' : ''}`}>
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
      </main>
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
      {showModal && (
        <AppointmentModal
          onClose={() => setShowModal(false)}
          onSubmit={handleBookAppointment}
        />
      )}
      {showCancelModal && (
        <div className="details-modal-overlay" onClick={cancelCancel}>
          <div className="details-modal open" onClick={(e) => e.stopPropagation()} style={{maxWidth:520}}>
            <h2>Cancel appointment</h2>
            <p>Please tell us why you're cancelling (optional)</p>
            <div style={{marginTop:12}}>
              <textarea value={cancelReasonInput} onChange={e => setCancelReasonInput(e.target.value)} placeholder="Reason for cancelling (optional)" style={{width:'100%', minHeight:100, padding:12, borderRadius:8, border:'1px solid #e6e6e6'}} />
            </div>
            <div style={{display:'flex', justifyContent:'flex-end', gap:12, marginTop:14}}>
              <button className="close-btn" onClick={cancelCancel}>Back</button>
              <button className="decline-btn" onClick={confirmCancel}>Confirm Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
