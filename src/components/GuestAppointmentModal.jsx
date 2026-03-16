import { useState, useEffect } from 'react'
import './AppointmentModal.css'
import { listAvailability } from '../api'
import Button from './Button'

const APPOINTMENT_REASONS = [
  'Academic Advising',
  'Scholarship Inquiry',
  'Document Request',
  'Counseling',
  'Other'
]

export default function GuestAppointmentModal({ onClose, onSubmit, guestName = '', guestEmail = '' }) {
  const [date, setDate] = useState(new Date())
  const [time, setTime] = useState('')
  const [reason, setReason] = useState('')
  const [otherReason, setOtherReason] = useState('')
  const [availability, setAvailability] = useState({ Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    listAvailability().then(resp => {
      const payload = (resp && resp.data) ? resp.data : resp || { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] }
      setAvailability(payload)
    }).catch(() => {
      setAvailability({ Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] })
    })
  }, [])

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December']
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const blanks = Array(firstDay).fill(null)

  const prevMonth = () => {
    setDate(new Date(date.getFullYear(), date.getMonth() - 1))
  }

  const nextMonth = () => {
    setDate(new Date(date.getFullYear(), date.getMonth() + 1))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const submittedReason = reason === 'Other' && otherReason.trim() ? otherReason.trim() : reason
    if (!onSubmit) return
    try {
      setIsSubmitting(true)
      await onSubmit({ date, time, reason: submittedReason })
      await new Promise(r => setTimeout(r, 800))
      onClose()
    } catch (err) {
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content appointment-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Book Appointment</h2>
          <p>Select your preferred date, time, and reason for visit</p>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-section">
            <h3>Select Date</h3>
            <div className="modal-calendar">
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
                    disabled={isSubmitting}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-section">
            <h3>Preferred Time</h3>
            <select
              className="modal-select"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              disabled={isSubmitting}
            >
              <option value="">Select time slot</option>
              {(() => {
                  const weekdayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
                  const wd = weekdayNames[date.getDay()]
                  const ranges = availability[wd] || []

                  const allRanges = ranges || []
                  if (allRanges.length > 0) {
                    return allRanges.map((r, idx) => {
                      const label = `${r.start} to ${r.end}`
                      const value = `${r.start}|${r.end}`
                      return <option key={r.id ?? idx} value={value}>{label}</option>
                    })
                  }

                  return [<option key="none" value="" disabled>No available time slots for {wd}</option>]
                })()}
            </select>
          </div>

          <div className="modal-section">
            <h3>Appointment Reasons</h3>
            <select
              className="modal-select"
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
                className="modal-input"
                placeholder="Please specify"
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                required
                disabled={isSubmitting}
              />
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <Button type="submit" className="btn-blue" loading={isSubmitting}>Book Appointment</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
