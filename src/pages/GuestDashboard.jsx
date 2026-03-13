import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import Chatbot from '../components/Chatbot'
import './GuestDashboard.css'

export default function GuestDashboard() {
  const navigate = useNavigate()
  const [guestName, setGuestName] = useState('Guest')
  const [appointments, setAppointments] = useState([])

  useEffect(() => {
    const name = localStorage.getItem('guestName') || 'Guest'
    setGuestName(name)
    try {
      const raw = localStorage.getItem('guestAppointments')
      setAppointments(raw ? JSON.parse(raw) : [])
    } catch (e) { setAppointments([]) }
  }, [])

  return (
    <div className="guest-dashboard">
      <Chatbot />
      <NavBar userType="guest" />
      <main className="guest-main">
        <header className="guest-hero">
          <h1>Welcome, {guestName}!</h1>
          <p>View your appointments, statuses, and book new consultations.</p>
        </header>

        <section className="guest-cards">
          <div className="card">
            <div className="card-header">
              <h2>My Appointments</h2>
              <button type="button" className="btn-book" onClick={() => navigate('/guest/booking')}>+ Book Appointment</button>
            </div>
            <div className="card-body">
              {appointments.length === 0 ? (
                <div className="empty">No appointments yet</div>
              ) : (
                appointments.map(a => (
                  <div key={a.id} className="apt">{a.date} — {a.time} — {a.reason}</div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h2>Appointment History</h2></div>
            <div className="card-body">
              <div className="empty">No appointments yet</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
