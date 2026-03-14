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

const TIME_SLOTS = [
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM'
]

export default function AppointmentModal({ onClose, onSubmit }) {
  const [date, setDate] = useState(new Date())
  const [time, setTime] = useState('')
  const [reason, setReason] = useState('')
  const [otherReason, setOtherReason] = useState('')
  const [availability, setAvailability] = useState({ Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    listAvailability().then(resp => {
      // `listAvailability()` returns { ok: true, data: { Monday: [...], ... } }
      const payload = (resp && resp.data) ? resp.data : resp || { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] }
      setAvailability(payload)
    }).catch(() => {
      setAvailability({ Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] })
    })
  }, [])

  // Helper: format a Date as local YYYY-MM-DD (avoid toISOString timezone shift)
  const isoLocal = (dt) => {
    if (!dt) return ''
    const y = dt.getFullYear()
    const m = String(dt.getMonth() + 1).padStart(2, '0')
    const d = String(dt.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December']
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const blanks = Array(firstDay).fill(null)

  const today = new Date()
  today.setHours(0,0,0,0)

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
                {days.map(d => {
                  const dateObj = new Date(date.getFullYear(), date.getMonth(), d)
                  // disable past dates and weekends (Sat=6, Sun=0)
                  const dayIndex = dateObj.getDay()
                  const isWeekend = (dayIndex === 0 || dayIndex === 6)
                  const disabled = dateObj.setHours(0,0,0,0) < today.getTime() || isWeekend
                  return (
                    <button
                      key={d}
                      type="button"
                      className={`day ${date.getDate() === d ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                      onClick={() => !disabled && setDate(new Date(date.getFullYear(), date.getMonth(), d))}
                      disabled={disabled}
                    >
                      {d}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="modal-section">
            <h3>Preferred Time</h3>
            {/** compute availability for the selected weekday and filter time slots accordingly */}
            <select
              className="modal-select"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            >
              <option value="">Select time slot</option>
              {(() => {
                  // Show availability ranges from the availability table only.
                  const weekdayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
                  const wd = weekdayNames[date.getDay()]
                  const ranges = availability[wd] || []

                  // Show all availability ranges (ignore per-date values)
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
