import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Toast from '../components/Toast'
import Button from '../components/Button'
import { createAppointment as apiCreateAppointment, listAppointments as apiListAppointments } from '../api'
import './GuestBooking.css'

const APPOINTMENT_REASONS = [
  'Academic Advising',
  'Scholarship Inquiry',
  'Document Request',
  'Counseling',
  'Other'
]

const TIME_SLOTS = [
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM'
]

export default function GuestBooking() {
  const navigate = useNavigate()
  const location = useLocation()
  const guestInfo = location.state || {}

  // Accept guest info either via navigation state or from localStorage (so refresh doesn't drop access)
  const storedGuestName = (typeof window !== 'undefined') ? (localStorage.getItem('guestName') || '') : ''
  const storedGuestEmail = (typeof window !== 'undefined') ? (localStorage.getItem('guestEmail') || '') : ''

  // Build effective guest info
  const effectiveGuestInfo = location.state || ((storedGuestName || storedGuestEmail) ? {
    firstName: storedGuestName ? storedGuestName.split(' ')[0] : '',
    lastName: storedGuestName ? storedGuestName.split(' ').slice(1).join(' ') : '',
    email: storedGuestEmail || ''
  } : null)

  // Require guest info first; redirect if accessed directly without any stored state
  if (!effectiveGuestInfo) {
    navigate('/guest/login', { replace: true })
    return null
  }
  
  const [date, setDate] = useState(new Date())
  const today = new Date()
  today.setHours(0,0,0,0)
  const [time, setTime] = useState('')
  const [reason, setReason] = useState('')
  const [otherReason, setOtherReason] = useState('')
  const [availableSlots, setAvailableSlots] = useState([])
  const [bookedTimes, setBookedTimes] = useState([])
  const [slotsMessage, setSlotsMessage] = useState('')
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState('')
  const [confirmType, setConfirmType] = useState('success')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const blanks = Array(firstDay).fill(null)

  const prevMonth = () => setDate(new Date(date.getFullYear(), date.getMonth() - 1))
  const nextMonth = () => setDate(new Date(date.getFullYear(), date.getMonth() + 1))

  useEffect(() => {
    // Fetch available slots for the currently selected date
    async function loadSlots() {
      setLoadingSlots(true)
      setAvailableSlots([])
      setSlotsMessage('')
      try {
        const iso = date.toISOString().split('T')[0]
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000'
        const res = await fetch(`${apiBase}/api/slots?date=${iso}`)
        const data = await res.json()
        if (!res.ok || !data.ok) {
          setAvailableSlots([])
          setSlotsMessage(data.error || 'Unable to load slots')
        } else {
          const slots = data.slots || []
          if (slots.length === 0) {
              // Try fallback to availability table to show admin-defined ranges
              try {
              const avRes = await fetch(`${apiBase}/api/availability`)
              const avData = await avRes.json()
              const weekday = date.toLocaleDateString(undefined, { weekday: 'long' })
              const iso = date.toISOString().slice(0,10)
              if (avRes.ok && avData && avData[weekday] && avData[weekday].length > 0) {
                const entries = avData[weekday]
                // Prefer date-specific entries
                const dateSpecific = entries.filter(a => a.date && a.date === iso)
                const defaultEntries = entries.filter(a => !a.date || a.date === '')
                const useEntries = (dateSpecific && dateSpecific.length > 0) ? dateSpecific : defaultEntries

                // Build human-readable ranges from chosen availability entries
                const ranges = useEntries.map(a => {
                  if (a.start && a.end) return `${a.start} - ${a.end}`
                  if (a.start) return `${a.start}`
                  return ''
                }).filter(Boolean)
                if (ranges.length > 0) {
                  setSlotsMessage(`Available: ${ranges.join(', ')}`)
                } else {
                  setSlotsMessage(`No available slots for ${weekday}`)
                }
              } else {
                setSlotsMessage(`No available slots for ${weekday}`)
              }
            } catch (e) {
              const weekday = date.toLocaleDateString(undefined, { weekday: 'long' })
              setSlotsMessage(`No available slots for ${weekday}`)
            }
              setAvailableSlots([])
            } else {
            setAvailableSlots(slots)
            setSlotsMessage('')
          }
        }
      } catch (e) {
        setAvailableSlots([])
        setSlotsMessage('Unable to load slots')
      } finally {
        setLoadingSlots(false)
      }
    }

    loadSlots()
    // Also fetch existing appointments for this date so we can mark booked times
    ;(async () => {
      try {
        const iso = date.toISOString().split('T')[0]
        const res = await apiListAppointments()
        if (res && res.ok) {
          const existing = res.data || []
          const booked = existing.filter(a => {
            if (!a) return false
            const apIso = a.iso || (a.date ? (typeof a.date === 'string' && a.date.length === 10 ? a.date : '') : '')
            if (!apIso) return false
            if (apIso !== iso) return false
            if ((a.status || '').toLowerCase() === 'cancelled') return false
            return true
          }).map(a => (a.start || a.start_time || a.time || '').trim()).filter(Boolean)
          setBookedTimes(booked)
        } else {
          setBookedTimes([])
        }
      } catch (e) {
        setBookedTimes([])
      }
    })()
  }, [date])

  const handleSubmit = (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    ;(async () => {
      try {
        const guestName = (effectiveGuestInfo && ((effectiveGuestInfo.firstName || '') + ' ' + (effectiveGuestInfo.lastName || '')) ) || storedGuestName || ''
        const guestEmail = (effectiveGuestInfo && (effectiveGuestInfo.email || '')) || storedGuestEmail || ''
        
        // Build formatted appointment object
        const newAppointment = {
          id: Date.now(),
          date: date.toLocaleDateString(),
          iso: `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`,
          time: time,
          start: time,
          end: '',
          reason: reason === 'Other' && otherReason ? otherReason : reason,
          status: 'pending',
          email: guestEmail,
          name: guestName,
          guest: true,
          submittedAt: new Date().toISOString()
        }

        // Helper: convert time to minutes for conflict checking
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

        // Check for existing/conflicting appointments
        try {
          const existingRes = await apiListAppointments()
          if (existingRes && existingRes.ok) {
            const existing = existingRes.data || []
            const newStartMin = toMinutes(time)
            const newEndMin = (newStartMin !== null ? newStartMin + 30 : null)

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
                return es && time && es.trim() === time.trim()
              }
              return !(newEndMin <= esMin || eeMin <= newStartMin)
            })

            if (conflict) {
              setConfirmType('error')
              setShowConfirm(true)
              setConfirmMessage('An appointment already exists for that date and time. Please choose a different time.')
              setTimeout(() => setShowConfirm(false), 5000)
              setIsSubmitting(false)
              return
            }
          }
        } catch (e) {
          // ignore and proceed optimistically
        }

        // Save to localStorage
        try {
          const rawApts = localStorage.getItem('appointments')
          const apts = rawApts ? JSON.parse(rawApts) : []
          apts.unshift(newAppointment)
          localStorage.setItem('appointments', JSON.stringify(apts))

          // Create notification for admin
          const rawNot = localStorage.getItem('notifications')
          const notifications = rawNot ? JSON.parse(rawNot) : []
          notifications.unshift({
            id: Date.now(),
            appointmentId: newAppointment.id,
            title: 'New appointment request',
            message: `${guestName} requested an appointment on ${newAppointment.date} at ${time}`,
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
            start: time,
            end: '',
            status: 'pending',
            guest: true
          })

          if (res && res.ok) {
            setConfirmType('success')
            setShowConfirm(true)
            setConfirmMessage('Appointment requested successfully!')
            setTimeout(() => {
              setShowConfirm(false)
              navigate('/guest/dashboard', { state: { message: 'Appointment requested successfully' } })
            }, 2000)
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
      } finally {
        setIsSubmitting(false)
      }
    })()
  }

  return (
    <div className="guest-booking-page">
      <div className="guest-booking-form">
        <div style={{marginBottom: '1.5rem'}}>
          <h2 className="guest-booking-title">Book Appointment</h2>
          <p className="guest-booking-subtitle">Select your preferred date, time, and reason for visit</p>
        </div>
        <Toast show={showConfirm} type={confirmType} message={confirmMessage} onClose={() => setShowConfirm(false)} />
        <form onSubmit={handleSubmit}>
          <div className="booking-section">
            <h3>Select Date</h3>
            <div className="booking-calendar">
              <div className="calendar-header">
                <button type="button" onClick={prevMonth} disabled={isSubmitting}>‹</button>
                <span>{monthNames[date.getMonth()]} {date.getFullYear()}</span>
                <button type="button" onClick={nextMonth} disabled={isSubmitting}>›</button>
              </div>
              <div className="calendar-weekdays">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                  <span key={d} className="weekday">{d}</span>
                ))}
              </div>
              <div className="calendar-days">
                {blanks.map((_, i) => <div key={`b${i}`} className="day blank" />)}
                {days.map(d => {
                  const dayDate = new Date(date.getFullYear(), date.getMonth(), d)
                  dayDate.setHours(0,0,0,0)
                  const dayIndex = dayDate.getDay()
                  const isWeekend = (dayIndex === 0 || dayIndex === 6)
                  const isPast = dayDate < today
                  const disabled = isPast || isWeekend
                  return (
                    <button
                      key={d}
                      type="button"
                      className={`day ${date.getDate() === d ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                      onClick={() => !disabled && setDate(new Date(date.getFullYear(), date.getMonth(), d))}
                      disabled={isSubmitting || disabled}
                    >
                      {d}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="booking-section">
            <h3>Preferred Time</h3>
            <select
              className="booking-select"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              disabled={isSubmitting}
            >
              <option value="">{loadingSlots ? 'Loading slots...' : (slotsMessage || 'Select time slot')}</option>
              {availableSlots && availableSlots.length > 0 ? (
                availableSlots.map(t => {
                  const label = String(t || '').trim()
                  const isBooked = bookedTimes.includes(label)
                  return <option key={label} value={label} disabled={isBooked}>{isBooked ? `${label} - Already Booked` : label}</option>
                })
              ) : (
                (!slotsMessage && !loadingSlots) && TIME_SLOTS.map(t => {
                  const label = String(t).trim()
                  const isBooked = bookedTimes.includes(label)
                  return <option key={label} value={label} disabled={isBooked}>{isBooked ? `${label} - Already Booked` : label}</option>
                })
              )}
            </select>
          </div>

          <div className="booking-section">
            <h3>Appointment Reasons</h3>
            <select
              className="booking-select"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              disabled={isSubmitting}
            >
              <option value="">Select reason</option>
              {APPOINTMENT_REASONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            {reason === 'Other' && (
              <input
                type="text"
                className="booking-select"
                placeholder="Please specify"
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                required
                disabled={isSubmitting}
              />
            )}
          </div>

          <div className="booking-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/guest/login')} disabled={isSubmitting}>
              Cancel
            </button>
            <Button type="submit" loading={isSubmitting} className="btn-blue">Book Appointment</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
