const base = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

// ============================================================================
// ADMIN TOKEN MANAGEMENT
// ============================================================================

const ADMIN_TOKEN_KEY = 'admin_token'
const STUDENT_ID_KEY = 'student_id'
const STUDENT_TOKEN_KEY = 'student_token'

/**
 * Store admin authentication token
 */
export function storeAdminToken(token) {
  if (token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token)
  }
}

/**
 * Get stored admin token
 */
export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || ''
}

/**
 * Clear admin token and logout
 */
export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY)
}

/**
 * Check if admin is logged in
 */
export function isAdminLoggedIn() {
  return !!getAdminToken()
}

/**
 * Store student information
 */
export function storeStudentInfo(studentId, token) {
  if (studentId) {
    localStorage.setItem(STUDENT_ID_KEY, studentId)
  }
  if (token) {
    localStorage.setItem(STUDENT_TOKEN_KEY, token)
  }
}

/**
 * Get stored student ID
 */
export function getStudentId() {
  return localStorage.getItem(STUDENT_ID_KEY) || ''
}

/**
 * Clear student info and logout
 */
export function clearStudentInfo() {
  localStorage.removeItem(STUDENT_ID_KEY)
  localStorage.removeItem(STUDENT_TOKEN_KEY)
}

/**
 * Build headers with admin token if available
 */
function getHeaders(includeAuth = false) {
  const headers = { 'Content-Type': 'application/json' }
  if (includeAuth && isAdminLoggedIn()) {
    headers['X-Admin-Token'] = getAdminToken()
  }
  return headers
}

/**
 * Safe JSON parse helper
 */
function parseJSON(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

// ============================================================================
// APPOINTMENTS API
// ============================================================================

export async function createAppointment(payload) {
  try {
    if (!payload || typeof payload !== 'object') {
      return { ok: false, error: 'Please provide all required appointment details' }
    }
    
    const r = await fetch(`${base}/api/appointments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    })
    
    const data = await r.json()
    
    if (!r.ok) {
      return {
        ok: false,
        error: data.error || 'Unable to create appointment. Please try again.',
        details: data.details
      }
    }
    
    return data
  } catch (e) {
    return { ok: false, error: 'Unable to connect. Please check your internet connection and try again.' }
  }
}

export async function listAppointments() {
  try {
    const r = await fetch(`${base}/api/appointments`, {
      headers: getHeaders()
    })
    
    if (!r.ok) {
      return { ok: false, error: 'Unable to load appointments. Please try again later.', data: [] }
    }
    
    const data = await r.json()
    // Handle both old format (array) and new format (with appointments key)
    const appointments = data.appointments || (Array.isArray(data) ? data : [])
    return { ok: true, data: appointments }
  } catch (e) {
    return { ok: false, error: 'Unable to connect. Please check your internet connection and try again.', data: [] }
  }
}

export async function updateAppointmentStatus(id, status, extra = {}, includeAuth = false) {
  try {
    if (!id || !status) {
      return { ok: false, error: 'Missing appointment ID or status' }
    }
    
    const r = await fetch(`${base}/api/appointments/${id}`, {
      method: 'PATCH',
      headers: getHeaders(includeAuth),
      body: JSON.stringify({ status, ...extra })
    })
    
    const data = await r.json()
    
    if (!r.ok) {
      return { ok: false, error: data.error || 'Unable to update appointment. Please try again.' }
    }
    
    return data
  } catch (e) {
    return { ok: false, error: 'Unable to connect. Please check your internet connection and try again.' }
  }
}

export async function requestReschedule(id, date, start, end, reason, email) {
  try {
    if (!id || !date) return { ok: false, error: 'Missing appointment ID or date' }
    const payload = {
      rescheduleDate: date,
      rescheduleStart: start,
      rescheduleEnd: end,
      rescheduleReason: reason
    }
    if (email) payload.requesterEmail = email
    return await updateAppointmentStatus(id, 'pending', payload)
  } catch (e) {
    return { ok: false, error: 'Unable to connect. Please check your internet connection and try again.' }
  }
}

export async function approveReschedule(id) {
  try {
    if (!id) return { ok: false, error: 'Missing appointment ID' }
    // Approving also promotes the reschedule; backend will apply proposed values
    return await updateAppointmentStatus(id, 'confirmed', { approveReschedule: true })
  } catch (e) {
    return { ok: false, error: 'Unable to connect. Please check your internet connection and try again.' }
  }
}

// ============================================================================
// AUTHENTICATION API
// ============================================================================

export async function adminLogin(ident, password) {
  try {
    if (!ident || !password) {
      return { ok: false, error: 'Please enter your username/email and password' }
    }
    
    const r = await fetch(`${base}/api/admin/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ username: ident, password })
    })
    
    const data = await r.json()
    
    if (!r.ok || !data.ok) {
      return { ok: false, error: data.error || 'Invalid username/email or password' }
    }
    
    // Store token for subsequent requests
    storeAdminToken('admin_token_' + Date.now()) // Simple token; use JWT in production
    
    return data
  } catch (e) {
    return { ok: false, error: 'Unable to connect. Please check your internet connection and try again.' }
  }
}

export async function adminLogout() {
  clearAdminToken()
  return { ok: true }
}

export async function studentSignup(payload) {
  try {
    if (!payload || typeof payload !== 'object') {
      return { ok: false, error: 'Please fill in all required fields' }
    }

    const r = await fetch(`${base}/api/student/signup`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    })

    // Try to parse JSON response safely
    let data = null
    try {
      data = await r.json()
    } catch (parseErr) {
      // non-json response
      const text = await r.text().catch(() => '')
      return { ok: false, error: `Sign up failed (${r.status} ${r.statusText})`, details: text }
    }

    // If server indicated error, prefer its message
    if (!r.ok) {
      return { ok: false, error: data.error || data.message || `Sign up failed (${r.status})`, details: data.details || null }
    }

    // Normal successful response
    if (data && data.ok) {
      return data
    }

    // Fallback to any message provided or generic
    return { ok: false, error: data?.error || data?.message || 'Sign up failed. Please try again.', details: data?.details || null }
  } catch (e) {
    return { ok: false, error: 'Unable to connect. Please check your internet connection and try again.' }
  }
}

export async function studentLogin(ident, password) {
  try {
    if (!ident || !password) {
      return { ok: false, error: 'Please enter your student number and password' }
    }
    
    const r = await fetch(`${base}/api/student/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ studentNumber: ident, password })
    })
    
    const data = await r.json()
    
    if (!r.ok || !data.ok) {
      return { ok: false, error: data.error || 'Invalid student number or password' }
    }
    
    // Store student token if returned
    if (data.student?.id) {
      storeStudentInfo(data.student.id, 'student_token_' + Date.now())
    }
    
    return data
  } catch (e) {
    return { ok: false, error: 'Unable to connect. Please check your internet connection and try again.' }
  }
}

export async function studentLogout() {
  clearStudentInfo()
  return { ok: true }
}

export async function guestSignup(payload) {
  try {
    if (!payload || typeof payload !== 'object') {
      return { ok: false, error: 'Please fill in all required fields' }
    }
    
    const r = await fetch(`${base}/api/guest/signup`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    })
    
    const data = await r.json()
    
    if (!r.ok || !data.ok) {
      return { ok: false, error: data.error || 'Sign up failed. Please check your details and try again.', details: data.details }
    }
    
    return data
  } catch (e) {
    return { ok: false, error: 'Unable to connect. Please check your internet connection and try again.' }
  }
}

export async function guestLogin(ident, password) {
  try {
    if (!ident || !password) {
      return { ok: false, error: 'Please enter your email and password' }
    }
    
    const r = await fetch(`${base}/api/guest/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email: ident, password })
    })
    
    const data = await r.json()
    
    if (!r.ok || !data.ok) {
      return { ok: false, error: data.error || 'Invalid email or password' }
    }
    
    return data
  } catch (e) {
    return { ok: false, error: 'Unable to connect. Please check your internet connection and try again.' }
  }
}

// ============================================================================
// STUDENT PROFILE API
// ============================================================================

export async function updateStudentAvatar(studentNumber, avatarDataUrl) {
  try {
    if (!studentNumber || !avatarDataUrl) {
      return { ok: false, error: 'Please select an image to upload' }
    }
    
    if (!avatarDataUrl.startsWith('data:image')) {
      return { ok: false, error: 'Please select a valid image file' }
    }
    
    const r = await fetch(`${base}/api/student/avatar`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ studentNumber, avatar: avatarDataUrl })
    })
    
    const data = await r.json()
    
    if (!r.ok || !data.ok) {
      return { ok: false, error: data.error || 'Failed to upload avatar. Please try again.' }
    }
    
    return data
  } catch (e) {
    return { ok: false, error: 'Unable to upload avatar. Please check your internet connection and try again.' }
  }
}

export async function getStudentProfile(studentNumber) {
  try {
    if (!studentNumber) {
      return { ok: false, error: 'Student number required' }
    }
    
    const r = await fetch(`${base}/api/student/${encodeURIComponent(studentNumber)}`, {
      headers: getHeaders()
    })
    
    const data = await r.json()
    
    if (!r.ok || !data.ok) {
      return { ok: false, error: data.error || 'Unable to load profile. Please try again.' }
    }
    
    return data
  } catch (e) {
    return { ok: false, error: 'Unable to connect. Please check your internet connection and try again.' }
  }
}

// ============================================================================
// AVAILABILITY API
// ============================================================================

export async function listAvailability() {
  try {
    const r = await fetch(`${base}/api/availability`, {
      headers: getHeaders()
    })
    
    if (!r.ok) {
      return {
        ok: false,
        error: 'Unable to load availability. Please try again later.',
        data: { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] }
      }
    }
    
    const data = await r.json()
    return { ok: true, data: data || {} }
  } catch (e) {
    return { ok: false, error: 'Unable to connect. Please check your internet connection and try again.', data: {} }
  }
}

export async function listSlots(isoDate) {
  try {
    if (!isoDate) return { ok: false, error: 'Date required', slots: [] }
    const r = await fetch(`${base}/api/slots?date=${encodeURIComponent(isoDate)}`, {
      headers: getHeaders()
    })

    if (!r.ok) {
      return { ok: false, error: 'Unable to load available slots. Please try again later.', slots: [] }
    }

    const data = await r.json()
    return { ok: true, slots: data.slots || [] }
  } catch (e) {
    return { ok: false, error: 'Unable to connect. Please check your internet connection and try again.', slots: [] }
  }
}

export async function addAvailability(day, start, end, date) {
  try {
    if (!day || !start || !end) {
      return { ok: false, error: 'Please provide day, start time, and end time' }
    }
    
    const r = await fetch(`${base}/api/availability`, {
      method: 'POST',
      headers: getHeaders(true), // Requires admin token
      body: JSON.stringify({ day, start, end, date })
    })
    
    const data = await r.json()
    
    if (!r.ok || !data.ok) {
      return { ok: false, error: data.error || 'Unable to add availability. Please check your details and try again.' }
    }
    
    return data
  } catch (e) {
    return { ok: false, error: 'Unable to connect. Please check your internet connection and try again.' }
  }
}

export async function deleteAvailability(id) {
  try {
    if (!id) {
      return { ok: false, error: 'Availability ID required' }
    }
    
    const r = await fetch(`${base}/api/availability/${id}`, {
      method: 'DELETE',
      headers: getHeaders(true) // Requires admin token
    })
    
    const data = await r.json()
    
    if (!r.ok || !data.ok) {
      return { ok: false, error: data.error || 'Unable to delete availability. Please try again.' }
    }
    
    return data
  } catch (e) {
    return { ok: false, error: 'Unable to connect. Please check your internet connection and try again.' }
  }
}

export async function updateAvailability(id, day, start, end, date) {
  try {
    if (!id) return { ok: false, error: 'Availability ID required' }
    const r = await fetch(`${base}/api/availability/${id}`, {
      method: 'PATCH',
      headers: getHeaders(true),
      body: JSON.stringify({ day, start, end, date })
    })
    const data = await r.json()
    if (!r.ok || !data.ok) return { ok: false, error: data.error || 'Unable to update availability' }
    return data
  } catch (e) {
    return { ok: false, error: 'Unable to connect. Please check your internet connection and try again.' }
  }
}

// ============================================================================
// ADMIN DASHBOARD API
// ============================================================================

export async function listAllStudents() {
  try {
    if (!isAdminLoggedIn()) {
      return { ok: false, error: 'Administrative access required', data: [] }
    }
    
    const r = await fetch(`${base}/api/admin/students`, {
      headers: getHeaders(true)
    })
    
    if (!r.ok) {
      return { ok: false, error: 'Unable to load student list. Please try again later.', data: [] }
    }
    
    const data = await r.json()
    // Handle both formats: direct array or wrapped in "students" key
    const students = data.students || (Array.isArray(data) ? data : [])
    return {
      ok: data.ok !== false,
      data: students,
      error: data.error
    }
  } catch (e) {
    return { ok: false, error: `Network error: ${e.message}`, data: [] }
  }
}

export async function getStudentById(studentId) {
  try {
    if (!studentId) {
      return { ok: false, error: 'Student ID required' }
    }
    
    if (!isAdminLoggedIn()) {
      return { ok: false, error: 'Admin authentication required' }
    }
    
    const r = await fetch(`${base}/api/admin/students/${studentId}`, {
      headers: getHeaders(true)
    })
    
    const data = await r.json()
    
    if (!r.ok || !data.ok) {
      return { ok: false, error: data.error || `Student not found (${r.status})` }
    }
    
    return data
  } catch (e) {
    return { ok: false, error: `Failed to fetch student: ${e.message}` }
  }
}

export async function updateStudentStatus(studentId, isActive) {
  try {
    if (!studentId) {
      return { ok: false, error: 'Student ID required' }
    }
    
    if (isActive === undefined || isActive === null) {
      return { ok: false, error: 'isActive status required' }
    }
    
    if (!isAdminLoggedIn()) {
      return { ok: false, error: 'Admin authentication required' }
    }
    
    const r = await fetch(`${base}/api/admin/students/${studentId}/status`, {
      method: 'PATCH',
      headers: getHeaders(true),
      body: JSON.stringify({ isActive })
    })
    
    const data = await r.json()
    
    if (!r.ok || !data.ok) {
      return { ok: false, error: data.error || `Update failed (${r.status})` }
    }
    
    return data
  } catch (e) {
    return { ok: false, error: `Failed to update student status: ${e.message}` }
  }
}