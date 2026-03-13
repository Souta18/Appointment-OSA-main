import { Routes, Route, Navigate } from 'react-router-dom'
import AdminLogin from './pages/AdminLogin'
import AdminForgot from './pages/AdminForgot'
import StudentLanding from './pages/StudentLanding'
import AdminDashboard from './pages/AdminDashboard'
import GuestLogin from './pages/GuestLogin'
import GuestBooking from './pages/GuestBooking'
import GuestDashboard from './pages/GuestDashboard'
import Landing from './pages/Landing'
import StudentAuth from './pages/StudentAuth'
import StudentOtpValidation from './pages/StudentOtpValidation'
import StudentChangePassword from './pages/StudentChangePassword'
import AdminWalkIn from './pages/AdminWalkIn'

function App() {
  const AdminRoute = ({ children }) => {
    let ok = false
    try { ok = localStorage.getItem('adminAuth') === 'true' } catch (e) {}
    return ok ? children : <Navigate to="/admin/login" replace />
  }
  return (
    <Routes>
      {/* Shared landing for Students & Guests */}
      <Route path="/" element={<Landing />} />
      <Route path="/student" element={<Landing />} />
      <Route path="/guest" element={<Landing />} />
      {/* Student flows */}
      <Route path="/student/auth" element={<StudentAuth />} />
      <Route path="/student/login" element={<Navigate to="/student/auth?view=login" replace />} />
      <Route path="/student/signup" element={<Navigate to="/student/auth?view=signup" replace />} />
      <Route path="/student/forgot-password" element={<Navigate to="/student/auth?view=forgot" replace />} />
      <Route path="/student/otp" element={<StudentOtpValidation />} />
      <Route path="/student/change-password" element={<StudentChangePassword />} />
      <Route path="/student/dashboard" element={<StudentLanding />} />
      {/* Guest flow */}
      <Route path="/guest/login" element={<GuestLogin />} />
      <Route path="/guest/dashboard" element={<GuestDashboard />} />
      <Route path="/guest/booking" element={<GuestBooking />} />
      {/* Admin - separate pages */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/forgot" element={<AdminForgot />} />
      <Route path="/admin/walkin" element={<AdminWalkIn />} />
      <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
