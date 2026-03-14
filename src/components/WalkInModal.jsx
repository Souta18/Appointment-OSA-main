import { useState } from 'react'
import './WalkInModal.css'
import Button from './Button'

const REASONS = [
  'Academic Advising',
  'Signing of Forms',
  'Document Request',
  'Counseling',
  'Other'
]

const ROLES = ['Student', 'Teaching Personnel', 'Alumni', 'Visitor']

export default function WalkInModal({ onClose, onSubmit }) {
  const [fullName, setFullName] = useState('')
  const [studentNumber, setStudentNumber] = useState('')
  const [role, setRole] = useState('Student')
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('')
  const [otherReason, setOtherReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const today = new Date()
  const defaultDate = today.toISOString().slice(0,10)
  const pad = (n) => String(n).padStart(2,'0')
  const defaultTime = `${pad(today.getHours())}:${pad(today.getMinutes())}`
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState(defaultTime)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const submittedReason = reason === 'Other' && otherReason.trim() ? otherReason.trim() : reason
    if (!onSubmit) return
    try {
      setIsSubmitting(true)
      // allow parent to return a promise
      await onSubmit({ fullName, role, studentNumber: role === 'Student' ? studentNumber : '', email, reason: submittedReason, date, time })
      // small delay so user sees loader
      await new Promise(r => setTimeout(r, 800))
      onClose && onClose()
    } catch (e) {
      // still close after error to keep UX simple; parent should show error toast
      onClose && onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="walkin-overlay" onClick={onClose}>
      <div className="walkin-modal" onClick={e => e.stopPropagation()}>
        <header className="walkin-header">
          <h2>Walk-In Appointment</h2>
          <p>Fill out the form below</p>
        </header>

        <form className="walkin-form" onSubmit={handleSubmit}>
          <label className="form-group full">
            <span className="label">Full Name <span className="req">*</span></span>
            <input
              type="text"
              placeholder="e.g Juan Dela Cruz"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </label>

          <label className="form-group full">
            <span className="label">Email Address <span className="req">*</span></span>
            <input
              type="email"
              placeholder="e.g name@domain.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="form-group half">
            <span className="label">Role <span className="req">*</span></span>
            <select value={role} onChange={(e) => setRole(e.target.value)} required>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>

          {role === 'Student' && (
            <label className="form-group half">
              <span className="label">Student Number <span className="req">*</span></span>
              <input
                type="text"
                placeholder="e.g 2024-0000"
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
                required
              />
            </label>
          )}

          <label className="form-group full">
            <span className="label">Reason for Appointment <span className="req">*</span></span>
            <select value={reason} onChange={(e) => setReason(e.target.value)} required>
              <option value="">Select a reason</option>
              {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>

          {reason === 'Other' && (
            <label className="form-group full">
              <span className="label">Please specify <span className="req">*</span></span>
              <input
                type="text"
                placeholder="Specify other reason"
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                required
              />
            </label>
          )}

          <label className="form-group half">
            <span className="label">Date <span className="req">*</span></span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </label>
          <label className="form-group half">
            <span className="label">Time <span className="req">*</span></span>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} required />
          </label>

          <div className="walkin-actions full">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <Button type="submit" className="w-auto" loading={isSubmitting}>Book appointment</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
