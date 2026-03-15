import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { createAppointment as apiCreateAppointment } from '../api'
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
  const [time, setTime] = useState('')
  const [reason, setReason] = useState('')
  const [availableSlots, setAvailableSlots] = useState([])
  const [slotsMessage, setSlotsMessage] = useState('')
  const [loadingSlots, setLoadingSlots] = useState(false)

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
  }, [date])

  const handleSubmit = (e) => {
    e.preventDefault()
    ;(async () => {
      try {
        const guestName = (effectiveGuestInfo && ((effectiveGuestInfo.firstName || '') + ' ' + (effectiveGuestInfo.lastName || '')) ) || storedGuestName || ''
        const guestEmail = (effectiveGuestInfo && (effectiveGuestInfo.email || '')) || storedGuestEmail || ''
        const iso = date.toISOString().slice(0,10)
        const start = time || ''
        const payload = {
          name: guestName,
          email: guestEmail,
          reason: reason,
          iso: iso,
          start: start,
          status: 'pending',
          guest: true
        }

        const res = await apiCreateAppointment(payload)
        if (res && res.ok) {
          // navigate to guest dashboard or show confirmation
          navigate('/guest/dashboard', { state: { message: 'Appointment requested successfully' } })
        } else {
          // show error message inline
          const msg = (res && res.error) || 'Unable to create appointment. Please try again.'
          setSlotsMessage(msg)
        }
      } catch (e) {
        setSlotsMessage('Unable to create appointment. Please check your connection.')
      }
    })()
  }

  return (
    <div className="guest-booking-page">
      <AuthLayout side="left" subtitle="Schedule your appointments with ease.">
        <div className="guest-booking-form">
          <h2 className="guest-booking-title">Book Appointment</h2>
          <p className="guest-booking-subtitle">Select your preferred date, time, and reason for visit</p>
          <form onSubmit={handleSubmit}>
            <div className="booking-section">
              <h3>Select Date</h3>
              <div className="booking-calendar">
                <div className="calendar-header">
                  <button type="button" onClick={prevMonth}>‹</button>
                  <span>{monthNames[date.getMonth()]} {date.getFullYear()}</span>
                  <button type="button" onClick={nextMonth}>›</button>
                </div>
                <div className="calendar-weekdays">
                  {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                    <span key={d} className="weekday">{d}</span>
                  ))}
                </div>
                <div className="calendar-days">
                  {blanks.map((_, i) => <div key={`b${i}`} className="day blank" />)}
                  {days.map(d => (
                    <button
                      key={d}
                      type="button"
                      className={`day ${date.getDate() === d ? 'selected' : ''}`}
                      onClick={() => setDate(new Date(date.getFullYear(), date.getMonth(), d))}
                    >
                      {d}
                    </button>
                  ))}
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
              >
                <option value="">{loadingSlots ? 'Loading slots...' : (slotsMessage || 'Select time slot')}</option>
                {availableSlots && availableSlots.length > 0 ? (
                  availableSlots.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))
                ) : (
                  // fallback to default TIME_SLOTS when API not available and no message
                  (!slotsMessage && !loadingSlots) && TIME_SLOTS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))
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
              >
                <option value="">Select reason</option>
                {APPOINTMENT_REASONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="booking-actions">
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/guest/login')}>
                Back
              </button>
              <button type="submit" className="btn btn-blue">
                Book Appointment
              </button>
            </div>
          </form>
        </div>
      </AuthLayout>
    </div>
  )
}
