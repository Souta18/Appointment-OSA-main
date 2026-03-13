import { useState } from 'react'
import AuthLayout from '../components/AuthLayout'
import Input from '../components/Input'
import Button from '../components/Button'
import './AdminWalkIn.css'

export default function AdminWalkIn() {
  const [studentId, setStudentId] = useState('')
  const [studentName, setStudentName] = useState('')
  const [studentReason, setStudentReason] = useState('')
  const [studentOther, setStudentOther] = useState('')
  const [guestFirst, setGuestFirst] = useState('')
  const [guestLast, setGuestLast] = useState('')
  const [guestContact, setGuestContact] = useState('')
  const [guestVisitorType, setGuestVisitorType] = useState('')
  const [guestReason, setGuestReason] = useState('')
  const [guestOther, setGuestOther] = useState('')
  const [studentMessage, setStudentMessage] = useState('')
  const [guestMessage, setGuestMessage] = useState('')

  const submitStudentWalkIn = (e) => {
    e.preventDefault()
    try {
      const raw = localStorage.getItem('appointments')
      const arr = raw ? JSON.parse(raw) : []
      const now = new Date()
      const obj = {
        id: Date.now(),
        name: studentName || `Student ${studentId||''}`,
        studentId: studentId || '',
        guest: false,
        contact: '',
        reason: studentReason === 'Other' && studentOther ? studentOther : (studentReason || 'Walk-in'),
        date: now.toLocaleDateString(),
        iso: now.toISOString().slice(0,10),
        time: now.toLocaleTimeString(),
        status: 'confirmed'
      }
      arr.unshift(obj)
      localStorage.setItem('appointments', JSON.stringify(arr))
      setStudentMessage('Walk-in added successfully')
      setTimeout(() => setStudentMessage(''), 3000)
      setStudentId(''); setStudentName('')
      setStudentReason(''); setStudentOther('')
    } catch (e) { console.error(e); setStudentMessage('Failed to add walk-in') }
  }

  const submitGuestWalkIn = (e) => {
    e.preventDefault()
    try {
      const raw = localStorage.getItem('appointments')
      const arr = raw ? JSON.parse(raw) : []
      const now = new Date()
      const obj = {
        id: Date.now(),
        name: `${guestFirst || ''} ${guestLast || ''}`.trim() || 'Guest',
        studentId: '',
        guest: true,
        contact: guestContact || '',
        visitorType: guestVisitorType || '',
        reason: guestReason === 'Other' && guestOther ? guestOther : (guestReason || 'Walk-in'),
        date: now.toLocaleDateString(),
        iso: now.toISOString().slice(0,10),
        time: now.toLocaleTimeString(),
        status: 'confirmed'
      }
      arr.unshift(obj)
      localStorage.setItem('appointments', JSON.stringify(arr))
      setGuestMessage('Walk-in added successfully')
      setTimeout(() => setGuestMessage(''), 3000)
      setGuestFirst(''); setGuestLast(''); setGuestContact('')
      setGuestVisitorType('')
    } catch (e) { console.error(e); setGuestMessage('Failed to add walk-in') }
  }

  const [mode, setMode] = useState('student')

  return (
    <div className="admin-walkin-page">
      <AuthLayout side="left">
        <div className="auth-form">
          <h2 className="auth-title">Walk-In Registration</h2>

          <div className="walkin-tabs centered-tabs">
            <button type="button" className={mode==='student' ? 'active' : ''} onClick={() => setMode('student')}>Student</button>
            <button type="button" className={mode==='guest' ? 'active' : ''} onClick={() => setMode('guest')}>Guest</button>
          </div>

          <div className="form-stack centered">
            <div className={`forms-container ${mode === 'student' ? 'show-student' : 'show-guest'}`}>
              <form className="form-card student-card" onSubmit={submitStudentWalkIn}>
                <h3 className="card-title">Walk-In Registration</h3>
                <Input label="Student Number" placeholder="2023-0000" value={studentId} onChange={e => setStudentId(e.target.value)} />
                <label className="form-label">Reason for Appointment</label>
                <select className="form-input" value={studentReason} onChange={e => setStudentReason(e.target.value)}>
                  <option value="">Select a reason</option>
                  <option>Academic Advising</option>
                  <option>Signing of Forms</option>
                  <option>Document Request</option>
                  <option>Counseling</option>
                  <option>Other</option>
                </select>
                {studentReason === 'Other' && (
                  <Input label="Please specify" placeholder="Please specify reason" value={studentOther} onChange={e => setStudentOther(e.target.value)} />
                )}
                <div className="form-actions">
                  <Button type="submit" className="w-full">Submit</Button>
                </div>
                {studentMessage && <div className="walkin-message">{studentMessage}</div>}
              </form>

              <form className="form-card guest-card" onSubmit={submitGuestWalkIn}>
                <h3 className="card-title">Walk-In Registration</h3>
                <label className="form-label">Visitor Type</label>
                <select className="form-input" value={guestVisitorType} onChange={e => setGuestVisitorType(e.target.value)}>
                  <option value="">Select Visitor Type</option>
                  <option>Teaching Personnel</option>
                  <option>Alumni</option>
                  <option>Visitor</option>
                </select>
                <Input label="First Name" placeholder="e.g. Juan" value={guestFirst} onChange={e => setGuestFirst(e.target.value)} required />
                <Input label="Last Name" placeholder="e.g. Dela Cruz" value={guestLast} onChange={e => setGuestLast(e.target.value)} required />
                <label className="form-label">Reason for Appointment</label>
                <select className="form-input" value={guestReason} onChange={e => setGuestReason(e.target.value)}>
                  <option value="">Select a reason</option>
                  <option>Academic Advising</option>
                  <option>Document Request</option>
                  <option>Counseling</option>
                  <option>Other</option>
                </select>
                {guestReason === 'Other' && (
                  <Input label="Please specify" placeholder="Please specify reason" value={guestOther} onChange={e => setGuestOther(e.target.value)} />
                )}
                <div className="form-actions">
                  <Button type="submit" className="w-full">Submit</Button>
                </div>
                {guestMessage && <div className="walkin-message">{guestMessage}</div>}
              </form>
            </div>
          </div>
        </div>
      </AuthLayout>
    </div>
  )
}
