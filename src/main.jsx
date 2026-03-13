import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

try {
  const k = 'backend_migration_done'
  const done = localStorage.getItem(k)
  if (!done) {
    const preserve = { adminAuth: localStorage.getItem('adminAuth'), adminUser: localStorage.getItem('adminUser') }
    localStorage.removeItem('appointments')
    localStorage.removeItem('studentAppointments')
    localStorage.removeItem('guestAppointments')
    localStorage.removeItem('notifications')
    localStorage.removeItem('availability')
    localStorage.removeItem('users')
    localStorage.removeItem('outbox')
    localStorage.removeItem('bans')
    localStorage.removeItem('openAppointmentId')
    if (preserve.adminAuth != null) localStorage.setItem('adminAuth', preserve.adminAuth)
    if (preserve.adminUser != null) localStorage.setItem('adminUser', preserve.adminUser)
    localStorage.setItem(k, '1')
  }
} catch (e) {}
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
