import { useState, useEffect } from 'react'
import NavBar from '../components/NavBar'
import { Bar, Pie } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)
import Sidebar from '../components/Sidebar'
import AdminWalkIn from './AdminWalkIn'
import WalkInModal from '../components/WalkInModal'
import ModalNoOverlay from '../components/ModalNoOverlay'
import { useLocation } from 'react-router-dom'
import NewUserModal from '../components/NewUserModal'
import './AdminDashboard.css'
import { listAppointments, updateAppointmentStatus, createAppointment as apiCreateAppointment, listAvailability, addAvailability, deleteAvailability, updateAvailability } from '../api'
import Toast from '../components/Toast'

export default function AdminDashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [activeItem, setActiveItem] = useState('calendar')
  const [appointments, setAppointments] = useState([])
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [isApproving, setIsApproving] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [rescheduleData, setRescheduleData] = useState({ date: '', start: '', end: '', reason: '' })
  const [rescheduleErrors, setRescheduleErrors] = useState([])
  const [rescheduleChecking, setRescheduleChecking] = useState(false)
  const [rescheduleCanSend, setRescheduleCanSend] = useState(false)
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [declineReasonType, setDeclineReasonType] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState('')
  const [confirmType, setConfirmType] = useState('success')
  const [showAllModal, setShowAllModal] = useState(false)
  const [showWalkInModal, setShowWalkInModal] = useState(false)
  const location = useLocation()
  const [availability, setAvailability] = useState({ Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] })
  const [showAddDatedModal, setShowAddDatedModal] = useState(false)
  const [newDatedDate, setNewDatedDate] = useState('')
  const [newDatedType, setNewDatedType] = useState('')
  const [newDatedStart, setNewDatedStart] = useState('')
  const [newDatedEnd, setNewDatedEnd] = useState('')
  const [datedErrors, setDatedErrors] = useState({})
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleDay, setScheduleDay] = useState('')
  const [newStart, setNewStart] = useState('')
  const [newEnd, setNewEnd] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newType, setNewType] = useState('')
  const [editingAvailId, setEditingAvailId] = useState(null)
  const [editingAvailIdx, setEditingAvailIdx] = useState(null)
  const [scheduleWarning, setScheduleWarning] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [datedInputs, setDatedInputs] = useState({})
  const [analyticsTab, setAnalyticsTab] = useState('history')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDept, setFilterDept] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [fromDateFilter, setFromDateFilter] = useState('')
  const [toDateFilter, setToDateFilter] = useState('')
  const statusOptions = ['All', 'pending', 'approved', 'completed', 'rescheduled']
  const [chartRange, setChartRange] = useState('weekly')
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']

  // Helper to parse YYYY-MM-DD into local Date and format
  const isoToLocalDateString = (iso, opts) => {
    try {
      if (!iso) return ''
      const parts = String(iso).split('-')
      const dt = (parts.length >= 3) ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])) : new Date(iso)
      return dt.toLocaleDateString([], opts || undefined)
    } catch (e) { return '' }
  }

  // return local YYYY-MM-DD for a Date or string input (avoids UTC shift)
  const localIso = (input) => {
    if (!input) return ''
    try {
      if (input instanceof Date) {
        return `${input.getFullYear()}-${String(input.getMonth()+1).padStart(2,'0')}-${String(input.getDate()).padStart(2,'0')}`
      }
      const s = String(input)
      const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
      if (m) return m[1]
      const d = new Date(s)
      if (!isNaN(d)) return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    } catch (e) {}
    return ''
  }

  const prevMonth = () => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))
  const nextMonth = () => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))

  const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate()
  const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const blanks = Array(firstDay).fill(null)
  const year = selectedDate.getFullYear()
  const month = selectedDate.getMonth()
  const selectedIso = localIso(selectedDate)

  const refreshAppointments = async () => {
    try {
      const res = await listAppointments()
      // If API reachable, treat server data as authoritative (even if empty)
      if (res && res.ok && Array.isArray(res.data)) {
        const serverApts = res.data || []
        try { localStorage.setItem('appointments', JSON.stringify(serverApts)) } catch (e) {}
        // annotate server appointments with admin name when available
        try {
          const rawAdmin = typeof window !== 'undefined' && localStorage.getItem('adminUser')
          const adminName = rawAdmin ? (JSON.parse(rawAdmin||'{}').name || JSON.parse(rawAdmin||'{}').fullName || JSON.parse(rawAdmin||'{}').full_name || JSON.parse(rawAdmin||'{}').username) : null
          const annotated = (serverApts || []).map(a => (a && (a.cancelled_by === 'admin' || (String(a.cancelled_by||'').toLowerCase()==='admin')) && adminName) ? { ...a, cancelled_by_name: adminName } : a)
          setAppointments(annotated)
        } catch (e) {
          setAppointments(serverApts)
        }
      } else {
        // Fallback: read appointments from localStorage (used by Walk-In page when backend is unavailable)
        try {
          const raw = localStorage.getItem('appointments')
          const arr = raw ? JSON.parse(raw) : []
          // if admin user is logged in locally, backfill cancelled_by_name for admin-cancelled items
          try {
            const rawAdmin = typeof window !== 'undefined' && localStorage.getItem('adminUser')
            const adminName = rawAdmin ? (JSON.parse(rawAdmin||'{}').name || JSON.parse(rawAdmin||'{}').fullName || JSON.parse(rawAdmin||'{}').full_name || JSON.parse(rawAdmin||'{}').username) : null
            const annotated = (arr || []).map(a => (a && (a.cancelled_by === 'admin' || (String(a.cancelled_by||'').toLowerCase()==='admin')) && adminName) ? { ...a, cancelled_by_name: adminName } : a)
            setAppointments(Array.isArray(annotated) ? annotated : [])
            try { localStorage.setItem('appointments', JSON.stringify(annotated)) } catch (e) {}
          } catch (e) {
            setAppointments(Array.isArray(arr) ? arr : [])
          }
        } catch (e) {
          setAppointments([])
        }
      }
    } catch (e) {
      try {
        const raw = localStorage.getItem('appointments')
        const arr = raw ? JSON.parse(raw) : []
        setAppointments(Array.isArray(arr) ? arr : [])
      } catch (err) {
        setAppointments([])
      }
    }
  }
  useEffect(() => {
    refreshAppointments()
    const id = setInterval(refreshAppointments, 10000)
    return () => clearInterval(id)
  }, [])

useEffect(() => {
  (async () => {
    const resp = await listAvailability()
    const avail = resp && resp.data ? resp.data : (resp || {})
    setAvailability(avail || { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] })
  })()
}, [])

  // enable Send button only when basic client-side validation passes
  useEffect(() => {
    const toMins = (t) => {
      if (!t) return null
      const m = String(t).split(':')
      if (m.length < 2) return null
      const hh = parseInt(m[0], 10)
      const mm = parseInt(m[1], 10)
      if (isNaN(hh) || isNaN(mm)) return null
      return hh * 60 + mm
    }
    try {
      const { date, start, end } = rescheduleData || {}
      if (!date || !start || !end) return setRescheduleCanSend(false)
      const s = toMins(start)
      const e = toMins(end)
      if (s === null || e === null) return setRescheduleCanSend(false)
      if (s >= e) return setRescheduleCanSend(false)
      // not in past (allow small leeway)
      const proposed = new Date(`${date}T${String(start).padStart(5,'0')}`)
      if (proposed.getTime() < Date.now() - 60000) return setRescheduleCanSend(false)
      // availability slot fit
      const weekDays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
      const wd = weekDays[new Date(date).getDay()]
      const ranges = (availability && availability[wd]) ? availability[wd] : []
      const ok = (ranges || []).some(r => {
        if (!r) return false
        if (r.date && String(r.date).slice(0,10) !== String(date).slice(0,10)) return false
        const rs = toMins(r.start)
        const re = toMins(r.end)
        if (rs === null || re === null) return false
        return s >= rs && e <= re
      })
      if (!ok) return setRescheduleCanSend(false)
      setRescheduleCanSend(true)
    } catch (e) {
      setRescheduleCanSend(false)
    }
  }, [rescheduleData, availability])

  // flatten dated availability entries for rendering
  const datedRows = Object.entries(availability).flatMap(([day, arr]) => {
    return (arr || []).filter(r => r && r.date).map(r => ({ day, ...r }))
  })

  // helper: parse appointment date+time into a Date
  const parseAppointmentStart = (a) => {
    try {
      const datePart = a.iso || (a.date ? a.date : '')
      const timePart = a.start || a.time || ''
      if (!datePart || !timePart) return null
      const m = timePart.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
      if (!m) return new Date(`${datePart}T00:00:00`)
      let hh = parseInt(m[1],10)
      const mm = parseInt(m[2],10)
      const ampm = m[3]
      if (ampm) {
        if (ampm.toUpperCase() === 'PM' && hh !== 12) hh += 12
        if (ampm.toUpperCase() === 'AM' && hh === 12) hh = 0
      }
      const dt = new Date(datePart)
      dt.setHours(hh, mm, 0, 0)
      return dt
    } catch (e) { return null }
  }

    // helper: convert time like "9:30 AM" to minutes since midnight, or null
    const toMinutes = (t) => {
      if (!t) return null
      const m = String(t).match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
      if (!m) return null
      let hh = Number(m[1])
      const mm = Number(m[2])
      const ampm = m[3].toUpperCase()
      if (ampm === 'PM' && hh !== 12) hh += 12
      if (ampm === 'AM' && hh === 12) hh = 0
      return hh * 60 + mm
    }

    // helper: return true when appointment is currently ongoing (same date and now between start and end)
    const isAppointmentOngoing = (apt) => {
      try {
        if (!apt) return false
        const iso = apt.iso || (apt.date ? apt.date : '')
        if (!iso) return false
        const now = new Date()
        const todayIso = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
        if (iso !== todayIso) return false
        const startMin = toMinutes(apt.start || apt.time || '')
        const endMin = toMinutes(apt.end || '') || (startMin !== null ? startMin + 30 : null)
        if (startMin === null || endMin === null) return false
        const nowMin = now.getHours() * 60 + now.getMinutes()
        return nowMin >= startMin && nowMin < endMin
      } catch (e) { return false }
    }

  // push notification record and queue a placeholder email in `outbox`
  const sendNotification = (email, title, message) => {}

  const applyBan = (email, hours = 24) => {}

  const handleCreateUser = (user) => {
    try {
      const raw = localStorage.getItem('users')
      const arr = raw ? JSON.parse(raw) : []
      arr.push(user)
      localStorage.setItem('users', JSON.stringify(arr))
      console.log('Created user', user)
    } catch (e) { console.error(e) }
    setShowCreateUser(false)
  }

  // helper: display who cancelled the appointment (try localStorage for actual names)
  const getCancelledByDisplay = (apt) => {
    try {
      if (!apt) return 'Unknown'
      // check local overrides (set when admin cancels while offline or to persist client-side)
      try {
        const rawOverrides = typeof window !== 'undefined' && localStorage.getItem('cancelledByOverrides')
        const overrides = rawOverrides ? JSON.parse(rawOverrides) : {}
        if (overrides && apt.id && overrides[String(apt.id)]) {
          const o = overrides[String(apt.id)]
          return o.name || (o.by ? (o.by === 'admin' ? 'Admin' : (o.by === 'student' ? 'Student' : (o.by === 'guest' ? 'Guest' : 'Unknown'))) : 'Unknown')
        }
      } catch (e) {}
      // quick checks for explicit name fields on the appointment
      const explicitName = apt.cancelledByName || apt.cancelled_by_name || apt.cancelled_by_display || apt.cancelledBy || apt.cancelled_by_fullname || apt.cancelledByFullName || apt.adminName || apt.admin_name || apt.cancelledByAdmin
      if (explicitName) return String(explicitName)

      const key = String(apt.cancelled_by || apt.cancelledBy || '').toLowerCase()
      const note = String(apt.adminNote || apt.admin_note || '')

      // If appointment object embeds an admin object
      if (apt.admin && typeof apt.admin === 'object') {
        const a = apt.admin
        return a.name || a.fullName || a.full_name || a.username || 'Admin'
      }

      // student/guest names are often in apt.name
      if (key === 'student') return apt.name || (typeof window !== 'undefined' && localStorage.getItem('studentName')) || 'Student'
      if (key === 'guest') return apt.name || (typeof window !== 'undefined' && localStorage.getItem('guestName')) || 'Guest'

      // try to extract name from adminNote text using common phrases
      const re1 = /cancelled by[:\s]*([A-Za-z0-9 .,\-'_()]+)/i
      const m1 = note.match(re1)
      if (m1 && m1[1]) {
        const extracted = m1[1].split(/[.\n]/)[0].trim()
        if (/system/i.test(extracted)) return 'Admin'
        return extracted
      }
      const re2 = /was cancelled by[:\s]*([A-Za-z0-9 .,\-'_()]+)/i
      const m2 = note.match(re2)
      if (m2 && m2[1]) {
        const extracted = m2[1].split(/[.\n]/)[0].trim()
        if (/system/i.test(extracted)) return 'Admin'
        return extracted
      }

      if (key === 'admin') {
        try {
          const raw = typeof window !== 'undefined' && localStorage.getItem('adminUser')
          if (raw) {
            const u = JSON.parse(raw || '{}')
            return u.name || u.fullName || u.full_name || u.username || 'Admin'
          }
        } catch (e) {}
        return 'Admin'
      }

      // Treat system cancellations as admin for display purposes
      if (key === 'system') return 'Admin'

      // fallback: if text hints at role
      if (/student/i.test(note)) return apt.name || 'Student'
      if (/guest/i.test(note)) return apt.name || 'Guest'
      if (/admin/i.test(note)) return (typeof window !== 'undefined' && (() => { try { const raw = localStorage.getItem('adminUser'); if (raw) { const u = JSON.parse(raw||'{}'); return u.name || u.fullName || u.full_name || u.username } } catch(e){} })()) || 'Admin'

      // final simple inference: if appointment has studentId treat as Student, if guest flag treat as Guest
      if (['cancelled','canceled'].includes(String(apt.status || '').toLowerCase())) {
        if (apt.studentId || apt.studentId === 0) return 'Student'
        if (apt.guest) return 'Guest'
        try { const raw = typeof window !== 'undefined' && localStorage.getItem('adminUser'); if (raw) return 'Admin' } catch (e) {}
      }

      return 'Unknown'
    } catch (e) { return 'Unknown' }
  }

  // listen for global event dispatched by NavBar when admin clicks "Create User"
  useEffect(() => {
    const onOpen = () => setShowCreateUser(true)
    window.addEventListener('admin:create-user', onOpen)
    return () => window.removeEventListener('admin:create-user', onOpen)
  }, [])

  const handleWalkInSubmit = async (payload) => {
    const now = new Date()
    let iso = localIso(now)
    let start = now.toTimeString().slice(0,5)
    if (payload.date) iso = payload.date
    if (payload.time) start = payload.time
    await apiCreateAppointment({
      reason: payload.reason || 'Walk-in',
      iso,
      start,
      end: '',
      status: 'confirmed',
      guest: payload.role !== 'Student'
    })
    refreshAppointments()
  }

  useEffect(() => {}, [])

  // compute overview counts
  const now = new Date()
  const dayIndex = now.getDay() // 0 Sun .. 6 Sat
  const mondayOffset = (dayIndex + 6) % 7 // convert to Monday=0
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset)
  weekStart.setHours(0,0,0,0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23,59,59,999)

  const weeklyCount = appointments.filter(a => {
    const ts = Number(a.id) || a.submittedAt || 0;
    const apt = new Date(ts);
    const now = new Date();
    const day = now.getDay();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    weekStart.setHours(0,0,0,0);
    return apt >= weekStart;
  }).length;

  const pendingCount = appointments.filter(a => a.status === 'pending').length
  const doneCount = appointments.filter(a => (a.status || '').toLowerCase() === 'completed' || (a.status || '').toLowerCase() === 'done').length
  const cancelledCount = appointments.filter(a => (String(a.status || '').toLowerCase() === 'cancelled') || (String(a.status || '').toLowerCase() === 'declined')).length

  // Helpers to format time values
  const formatFromInput = (hhmm) => {
    if (!hhmm) return ''
    const [hh, mm] = hhmm.split(':').map(Number)
    const ampm = hh >= 12 ? 'PM' : 'AM'
    const hour = ((hh + 11) % 12) + 1
    return `${hour}:${String(mm).padStart(2,'0')} ${ampm}`
  }

  const toInputValue = (display) => {
    if (!display) return ''
    // if already in HH:MM (24) format
    if (/^\d{2}:\d{2}$/.test(display)) return display
    // try parse like '09:00 AM'
    const m = display.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
    if (!m) return ''
    let hh = parseInt(m[1],10)
    const mm = m[2]
    const ampm = m[3].toUpperCase()
    if (ampm === 'PM' && hh !== 12) hh += 12
    if (ampm === 'AM' && hh === 12) hh = 0
    return `${String(hh).padStart(2,'0')}:${mm}`
  }

  const addRange = async () => {
    if (!newStart || !newEnd || !scheduleDay) return
    const start = toInputValue(formatFromInput(newStart)) || newStart
    const end = toInputValue(formatFromInput(newEnd)) || newEnd
    if (editingAvailId) {
      await updateAvailability(editingAvailId, scheduleDay, start, end, newDate)
    } else if (editingAvailIdx !== null) {
      // Update local availability array when no remote id is present
      const copy = { ...availability }
      const arr = (copy[scheduleDay] || []).slice()
      const item = arr[editingAvailIdx]
      if (item) {
        arr[editingAvailIdx] = { ...item, start, end, date: newDate }
        copy[scheduleDay] = arr
        setAvailability(copy)
      }
    } else {
      // if adding would exceed 5 anonymous ranges, show brief warning and abort
      const anonCount = ((availability[scheduleDay] || []).filter(r => !r.date || r.date === '').length)
      if (anonCount >= 5) {
        setScheduleWarning(true)
        setTimeout(() => setScheduleWarning(false), 3000)
        return
      }
      await addAvailability(scheduleDay, start, end, newDate)
    }
    const data = await listAvailability()
    // handle both api helper shapes: { ok, data } or raw object
    const avail = data && data.data ? data.data : (data || {})
    setAvailability(avail || { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] })
    setNewStart('')
    setNewEnd('')
    setNewDate('')
    setEditingAvailId(null)
    setEditingAvailIdx(null)
  }

  // Save a dated availability slot (date + type). We'll store it under the weekday of the chosen date.
  const saveDatedSlot = async () => {
    // client-side validation
    const errs = {}
    if (!newDatedDate) errs.date = 'Date is required'
    // start/end expected in HH:MM (24h)
    if (!newDatedStart) errs.start = 'Start time is required'
    if (!newDatedEnd) errs.end = 'End time is required'
    // Validate start < end
    const parseHM = (s) => {
      try {
        const [hh, mm] = (s || '').split(':').map(Number)
        if (Number.isInteger(hh) && Number.isInteger(mm)) return hh * 60 + mm
      } catch (e) {}
      return null
    }
    const startMin = parseHM(newDatedStart)
    const endMin = parseHM(newDatedEnd)
    if (startMin === null && !errs.start) errs.start = 'Invalid start time'
    if (endMin === null && !errs.end) errs.end = 'Invalid end time'
    if (startMin !== null && endMin !== null && startMin >= endMin) errs.general = 'Start time must be before end time'
    // Do not allow dated availability in the past
    try {
      const today = new Date()
      today.setHours(0,0,0,0)
      const d = new Date(newDatedDate)
      d.setHours(0,0,0,0)
      if (!errs.date && d < today) errs.date = 'Date cannot be in the past'
    } catch (e) {}

    setDatedErrors(errs)
    if (Object.keys(errs).length > 0) return
    try {
      const d = new Date(newDatedDate)
      if (isNaN(d)) return
      const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()]
      const start = newDatedStart || ''
      const end = newDatedEnd || ''
      if (editingAvailId) {
        // update existing dated availability
        await updateAvailability(editingAvailId, dayName, start, end, newDatedDate)
      } else {
        await addAvailability(dayName, start, end, newDatedDate)
      }
    } catch (e) {
      // ignore
    }
    const data = await listAvailability()
    const avail = data && data.data ? data.data : (data || {})
    setAvailability(avail || { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] })
    setNewDatedDate('')
    setNewDatedType('')
    setNewDatedStart('')
    setNewDatedEnd('')
    setShowAddDatedModal(false)
    setEditingAvailId(null)
    setDatedErrors({})
  }

  const cancelEdit = () => {
    setNewStart('')
    setNewEnd('')
    setNewDate('')
    setNewType('')
    setEditingAvailId(null)
    setEditingAvailIdx(null)
  }

  const removeRange = async (day, idx) => {
    const item = (availability[day] || [])[idx]
    if (!item) return

    // helper to parse HH:MM (24h) into a Date on the given ISO date
    const parseIsoTime = (isoDate, hhmm) => {
      try {
        const [hh, mm] = (hhmm || '').split(':').map(Number)
        const d = new Date(isoDate)
        if (!isNaN(hh)) d.setHours(hh, isNaN(mm) ? 0 : mm, 0, 0)
        return d
      } catch (e) { return null }
    }

    // If this availability has a remote id, check for overlapping appointments
    if (item && item.id) {
      // fetch latest appointments
      const resp = await listAppointments()
      const rows = resp && resp.data ? resp.data : (resp || [])

      // if this availability has a specific date (dated slot), check by that date
      const isoDate = item.date || item.iso || ''
      let overlapping = []
      if (isoDate) {
        const rangeStart = parseIsoTime(isoDate, item.start)
        const rangeEnd = parseIsoTime(isoDate, item.end)
        for (const a of (rows || [])) {
          const aptStart = parseAppointmentStart(a)
          if (!aptStart) continue
          // compare only when appointment date matches this availability date
          const aptIso = (a.iso || (a.date ? a.date : ''))
          if (!aptIso || aptIso !== localIso(isoDate)) continue
          if (rangeStart && rangeEnd) {
            if (aptStart >= rangeStart && aptStart < rangeEnd) overlapping.push(a)
          } else {
            // fallback: match by start time string if available
            const aptTime = a.start || a.time || ''
            if (aptTime && item.start && aptTime.includes(item.start.slice(0,2))) overlapping.push(a)
          }
        }
      }

      if (overlapping.length > 0) {
        const proceed = window.confirm(`There are ${overlapping.length} appointment(s) scheduled in this slot. Cancel them and remove the slot?`)
        if (!proceed) return

            // cancel overlapping appointments first
        for (const a of overlapping) {
          try {
            await updateAppointmentStatus(a.id, 'cancelled', {}, true)
            // optimistic local update so UI reflects admin cancel including admin name when available
            const adminName = (() => { try { const raw = localStorage.getItem('adminUser'); if (raw) { const u = JSON.parse(raw||'{}'); return u.name || u.fullName || u.full_name || u.username || null } } catch(e){} return null })()
            setAppointments(prev => prev.map(x => x.id === a.id ? { ...x, status: 'cancelled', cancelled_by: 'admin', cancelled_by_name: adminName } : x))
            try {
              const raw = typeof window !== 'undefined' && localStorage.getItem('cancelledByOverrides')
              const overrides = raw ? JSON.parse(raw) : {}
              overrides[String(a.id)] = { by: 'admin', name: adminName || 'Admin' }
              localStorage.setItem('cancelledByOverrides', JSON.stringify(overrides))
            } catch (e) {}
          } catch (e) { /* ignore per-appointment errors and continue */ }
        }
      }

      // proceed to delete availability
      await deleteAvailability(item.id)
      const data = await listAvailability()
      const avail = data && data.data ? data.data : (data || {})
      setAvailability(avail || { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] })
      return
    }

    // If item has no remote id, remove it locally from availability array
    const copy = { ...availability }
    const arr = (copy[day] || []).slice()
    arr.splice(idx, 1)
    copy[day] = arr
    setAvailability(copy)
  }

  // --- Analytics helpers ---
  const getDepartments = () => {
    const deps = new Set()
    appointments.forEach(a => { if (a.course) deps.add(a.course); if (a.department) deps.add(a.department) })
    return ['All', ...Array.from(deps)]
  }

  const filteredAppointments = () => {
    return appointments.filter(a => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!((a.name || '').toLowerCase().includes(q) || (a.reason || '').toLowerCase().includes(q) || (a.email || '').toLowerCase().includes(q))) return false
      }
      if (filterDept && filterDept !== 'All') {
        const deptVal = a.department || a.course || ''
        if (!deptVal || !deptVal.includes(filterDept)) return false
      }
      if (filterStatus && filterStatus !== 'All') {
        if ((a.status || '').toLowerCase() !== filterStatus.toLowerCase()) return false
      }
      if (fromDateFilter) {
        const iso = a.iso || (a.date ? a.date : '')
        if (!iso || iso < fromDateFilter) return false
      }
      if (toDateFilter) {
        const iso = a.iso || (a.date ? a.date : '')
        if (!iso || iso > toDateFilter) return false
      }
      return true
    })
  }

  const downloadCSV = (rows) => {
    const cols = ['Date','Time','Name','Department','Reason','Status']
    const lines = [cols.join(',')]
    rows.forEach(r => {
      const date = r.date || r.iso || ''
      const time = r.start || r.time || ''
      const dept = r.department || r.course || ''
      const line = [date, time, (r.name||''), dept, (r.reason||''), (r.status||'')].map(v => '"' + String(v).replace(/"/g,'""') + '"').join(',')
      lines.push(line)
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'appointments.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPDF = (rows) => {
    // Simple printable window — user can Save as PDF from print dialog
    const w = window.open('', '_blank')
    const html = `
      <html><head><title>Appointments</title></head><body>
      <h2>Appointments</h2>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%">
      <thead><tr><th>Date</th><th>Time</th><th>Name</th><th>Department</th><th>Reason</th><th>Status</th></tr></thead>
      <tbody>
      ${rows.map(r => `<tr><td>${r.date||r.iso||''}</td><td>${r.start||r.time||''}</td><td>${r.name||''}</td><td>${r.department||r.course||''}</td><td>${r.reason||''}</td><td>${r.status||''}</td></tr>`).join('')}
      </tbody></table>
      </body></html>`
    w.document.write(html)
    w.document.close()
    w.print()
  }

  const computeBarData = () => {
    // Monday..Friday counts for the current week (Mon-Fri)
    const now = new Date()
    const dayIndex = now.getDay() // 0 Sun..6 Sat
    const mondayOffset = (dayIndex + 6) % 7
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset)
    weekStart.setHours(0,0,0,0)
    const labels = ['Mon','Tue','Wed','Thu','Fri']
    const counts = [0,0,0,0,0]
    appointments.forEach(a => {
      const iso = a.iso || (a.date ? a.date : '')
      if (!iso) return
      // parse YYYY-MM-DD as local date to avoid timezone shift
      const parts = String(iso).split('-')
      const d = (parts.length >= 3) ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])) : new Date(iso)
      const diff = Math.floor((d - weekStart) / (24*3600*1000))
      if (diff >=0 && diff < 5) counts[diff]++
    })
    return { labels, counts }
  }

  const computeStatusPie = () => {
    const map = {}
    appointments.forEach(a => {
      const s = (a.status || 'unknown')
      map[s] = (map[s] || 0) + 1
    })
    return map
  }

  // when analytics active, make content fullwidth
  const contentClass = `admin-content ${activeItem === 'availability' ? 'availability-fullwidth' : ''} ${activeItem === 'analytics' ? 'analytics-fullwidth' : ''}`

  const computeMonthlyData = () => {
    // counts per month for current year
    const labels = monthNames.map(m => m.slice(0,3))
    const counts = Array(12).fill(0)
    appointments.forEach(a => {
      const iso = a.iso || (a.date ? a.date : '')
      if (!iso) return
      const parts = String(iso).split('-')
      const d = (parts.length >= 3) ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])) : new Date(iso)
      if (isNaN(d)) return
      counts[d.getMonth()]++
    })
    return { labels, counts }
  }

  const barChartData = () => {
    const src = chartRange === 'monthly' ? computeMonthlyData() : computeBarData()
    return {
      labels: src.labels,
      datasets: [{ label: 'Bookings', data: src.counts, backgroundColor: src.counts.map((_,i)=> ['#f56565','#f6ad55','#f6e05e','#68d391','#63b3ed','#a78bfa','#cbd5e1','#94a3b8','#d6bcf0','#a97c66','#f687b3','#f6c27a'][i%12]) }]
    }
  }

  const pieChartData = () => {
    const map = computeStatusPie()
    return {
      labels: Object.keys(map).map(k => k === 'confirmed' ? 'rescheduled' : k),
      datasets: [{ data: Object.values(map), backgroundColor: ['#2b6cb0','#48bb78','#f6ad55','#f56565','#a0aec0'] }]
    }
  }

  // Render action buttons for the details modal (keeps JSX here simpler)
  const renderDetailsActions = () => {
    if (!selectedAppointment) return null
    const status = String(selectedAppointment.status || '').toLowerCase()

    if (status === 'pending') {
      return (
        <>
          <button className="decline-btn" onClick={() => { setDeclineReason(''); setShowDeclineModal(true) }}>Decline</button>
          <button className="approve-btn" onClick={() => {
            setIsApproving(true)
            updateAppointmentStatus(selectedAppointment.id, 'approved', {}, true).then(() => {
              try {
                const raw = localStorage.getItem('notifications')
                const arr = raw ? JSON.parse(raw) : []
                arr.unshift({ id: Date.now(), appointmentId: selectedAppointment.id, title: 'Appointment approved', message: `Your appointment on ${selectedAppointment.date || selectedAppointment.iso} at ${selectedAppointment.start || selectedAppointment.time} is approved.`, createdAt: Date.now(), read: false, email: selectedAppointment.email || selectedAppointment.studentEmail, studentId: selectedAppointment.studentId, target: 'student' })
                localStorage.setItem('notifications', JSON.stringify(arr))
              } catch (e) {}
              setIsApproving(false)
              setDetailsOpen(false)
              setSelectedAppointment(null)
              refreshAppointments()
            })
          }}>Approve</button>
        </>
      )
    }

    if (status === 'rescheduled') {
      return (<><button className="close-btn" onClick={() => { setDetailsOpen(false); setSelectedAppointment(null) }}>Back</button></>)
    }

    if (['declined','cancelled'].includes(status)) {
      const cancelledByKey = String(selectedAppointment.cancelled_by || selectedAppointment.cancelledBy || selectedAppointment.adminNote || '').toLowerCase()
      // Show reschedule when admin cancelled (or when declined). Treat 'system' as admin.
      const allowReschedule = (status === 'declined') || cancelledByKey.includes('admin') || cancelledByKey.includes('system')
      if (!allowReschedule) return null
      return (
        <>
          <button className="reschedule-open-btn" onClick={() => { setRescheduleData({ date: '', start: '', end: '', reason: '' }); setRescheduleOpen(true) }}>Reschedule</button>
          <button className="close-btn" onClick={() => { setDetailsOpen(false); setSelectedAppointment(null) }}>Close</button>
        </>
      )
    }

    if (isAppointmentOngoing(selectedAppointment) && !['done','completed'].includes((status || '').toLowerCase())) {
      return (
        <>
          <button className="done-btn" onClick={async () => {
            if (!selectedAppointment) return
            setIsCompleting(true)
            const prevAppointment = { ...selectedAppointment }
            const optimisticallyDone = { ...selectedAppointment, status: 'completed' }
            setSelectedAppointment(optimisticallyDone)
            setAppointments(prev => prev.map(a => a.id === optimisticallyDone.id ? optimisticallyDone : a))
            try {
              const raw = localStorage.getItem('notifications')
              const arr = raw ? JSON.parse(raw) : []
              arr.unshift({ id: Date.now(), appointmentId: optimisticallyDone.id, title: 'Appointment completed', message: `Your appointment on ${optimisticallyDone.date || optimisticallyDone.iso} at ${optimisticallyDone.start || optimisticallyDone.time} was marked done.`, createdAt: Date.now(), read: false, email: optimisticallyDone.email || optimisticallyDone.studentEmail, studentId: optimisticallyDone.studentId, target: 'student' })
              localStorage.setItem('notifications', JSON.stringify(arr))
            } catch (e) {}
            setDetailsOpen(false)
            setSelectedAppointment(null)
            try {
              await updateAppointmentStatus(optimisticallyDone.id, 'completed', {}, true)
              refreshAppointments()
            } catch (err) {
              setAppointments(prev => prev.map(a => a.id === prevAppointment.id ? prevAppointment : a))
              alert('Failed to mark appointment done. Please try again.')
            } finally {
              setIsCompleting(false)
            }
          }}>{isCompleting ? 'Completing...' : 'Done'}</button>

          {/* Approve button removed per request; only Done remains */}
        </>
      )
    }

    return null
  }

  return (
    <div className="admin-dashboard">
      <NavBar userType="admin" />
      <main className="admin-main">
        <div className="overview-panel">
          <h2 className="overview-title">Appointment overview</h2>
          <div className="admin-stats">
          <div className="stat-card">
            <div>
              <div className="stat-label">This Week's Bookings</div>
              <div className="stat-value">{weeklyCount}</div>
            </div>
            <div className="stat-icon icon-calendar">📅</div>
          </div>
          <div className="stat-card">
            <div>
              <div className="stat-label">Pending 
                For approval</div>
              <div className="stat-value">{pendingCount}</div>
            </div>
            <div className="stat-icon icon-pending">⏳</div>
          </div>
          <div className="stat-card">
            <div>
              <div className="stat-label">Accomplished</div>
              <div className="stat-value">{doneCount}</div>
            </div>
            <div className="stat-icon icon-done">✅</div>
          </div>
          <div className="stat-card">
            <div>
              <div className="stat-label">Cancelled</div>
              <div className="stat-value">{cancelledCount}</div>
            </div>
            <div className="stat-icon icon-cancelled">❌</div>
          </div>
          </div>
        </div>

        <div className={contentClass}>
          {activeItem === 'calendar' && (
          <div className="admin-calendar-section">
            <div className="calendar-nav">
              <button onClick={prevMonth}>←</button>
              <span>{monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}</span>
              <button onClick={nextMonth}>→</button>
            </div>
            <div className="weekdays">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="calendar-grid">
              {blanks.map((_, i) => <div key={`b${i}`} className="day blank" />)}
              {days.map(d => {
                const dateObj = new Date(year, month, d)
                const iso = localIso(dateObj)
                const apptsForDay = appointments.filter(a => a.iso === iso)
                const statuses = [...new Set(apptsForDay.map(a => a.status))]
                return (
                  <div
                    key={d}
                    className={`day ${selectedDate.getDate() === d ? 'selected' : ''}`}
                    onClick={() => setSelectedDate(dateObj)}
                  >
                    <div className="day-number">{d}</div>
                    {apptsForDay.length > 0 && (
                      <div className="day-indicators">
                        {statuses.map(s => <span key={s} className={`dot dot-${s}`} />)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          )}

          {activeItem === 'analytics' && (
            <div className="analytics-panel">
              <div className="analytics-tabs" style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12}}>
                <div style={{display:'flex', gap:8}}>
                  <button className={`tab-btn ${analyticsTab==='history' ? 'active' : ''}`} onClick={() => setAnalyticsTab('history')}>Appointment History</button>
                  <button className={`tab-btn ${analyticsTab==='charts' ? 'active' : ''}`} onClick={() => setAnalyticsTab('charts')}>Analytics</button>
                </div>
                <div style={{display:'flex', gap:8}}>
                  <input placeholder="Search" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} style={{padding:8, borderRadius:8, border:'1px solid #ddd'}} />
                  <select value={filterDept} onChange={e=>setFilterDept(e.target.value)} style={{padding:8, borderRadius:8}}>
                    {getDepartments().map(d=> <option key={d} value={d}>{d === 'All' ? 'Program' : d}</option>)}
                  </select>
                  <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{padding:8, borderRadius:8}}>
                    {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input type="date" value={fromDateFilter} onChange={e=>setFromDateFilter(e.target.value)} style={{padding:8, borderRadius:8}} />
                  <input type="date" value={toDateFilter} onChange={e=>setToDateFilter(e.target.value)} style={{padding:8, borderRadius:8}} />
                  <button className="export-btn" onClick={()=>{ const rows = filteredAppointments(); downloadCSV(rows) }}>Export CSV</button>
                  <button className="export-btn" onClick={()=>{ const rows = filteredAppointments(); exportPDF(rows) }}>Export PDF</button>
                </div>
              </div>

              {analyticsTab === 'history' ? (
                <div className="history-table" style={{marginTop:16}}>
                  <table style={{width:'100%', borderCollapse:'collapse'}}>
                    <thead style={{color:'#888'}}>
                      <tr>
                        <th style={{textAlign:'left', padding:10}}>Date</th>
                        <th style={{textAlign:'left', padding:10}}>Time</th>
                        <th style={{textAlign:'left', padding:10}}>Name</th>
                        <th style={{textAlign:'left', padding:10}}>Department</th>
                        <th style={{textAlign:'left', padding:10}}>Reason</th>
                        <th style={{textAlign:'left', padding:10}}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAppointments().length === 0 ? (
                        <tr><td colSpan={6} style={{padding:60, textAlign:'center', color:'#2b6cb0'}}>No appointments yet</td></tr>
                      ) : filteredAppointments().map(a => (
                        <tr key={a.id} style={{borderTop:'1px solid #f1f1f1'}}>
                          <td style={{padding:10}}>{a.date || a.iso || ''}</td>
                          <td style={{padding:10}}>{a.start || a.time || ''}</td>
                          <td style={{padding:10}}>{a.name}</td>
                          <td style={{padding:10}}>{a.department || a.course || ''}</td>
                          <td style={{padding:10}}>{a.reason}</td>
                          <td style={{padding:10}}>{
                            a.status === 'pending' ? 'For Approval'
                            : a.status === 'approved' ? (isAppointmentOngoing(a) ? 'Ongoing' : 'Approved')
                            : a.status === 'confirmed' ? (isAppointmentOngoing(a) ? 'Ongoing' : 'Rescheduled')
                            : a.status === 'rescheduled' ? 'Rescheduled'
                            : (a.status === 'done' || a.status === 'completed') ? 'Completed'
                            : ((a.status || '').toLowerCase() === 'cancelled') ? 'Cancelled'
                            : ((a.status || '').toLowerCase() === 'declined') ? 'Declined'
                            : a.status
                          }</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="analytics-charts" style={{display:'flex', gap:20, marginTop:16}}>
                  <div style={{flex:1, padding:12, border:'1px solid #f1f1f1', borderRadius:8, background:'#fff'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <h4 style={{marginTop:0}}>Bookings</h4>
                      <div style={{display:'flex', gap:8, alignItems:'center'}}>
                        <label style={{fontSize:13, color:'#556'}}>Range</label>
                        <select value={chartRange} onChange={e=>setChartRange(e.target.value)} style={{padding:6, borderRadius:8}}>
                          <option value="weekly">Weekly (Mon–Fri)</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                    </div>
                    <div style={{height:240}}>
                      <Bar data={barChartData()} options={{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{ beginAtZero:true, ticks:{stepSize:1} } } }} />
                    </div>
                  </div>

                  <div style={{width:420, padding:12, border:'1px solid #f1f1f1', borderRadius:8, background:'#fff'}}>
                    <h4 style={{marginTop:0}}>Status breakdown</h4>
                    <div style={{height:240, display:'flex', alignItems:'center', justifyContent:'center'}}>
                      <div style={{width:220}}>
                        <Pie data={pieChartData()} options={{ responsive:true, maintainAspectRatio:true, plugins:{legend:{position:'bottom'}} }} />
                      </div>
                    </div>
                    <div style={{marginTop:8}}>
                      {Object.entries(computeStatusPie()).map(([k,v],i)=> (
                        <div key={k} style={{display:'flex', gap:8, alignItems:'center', padding:'6px 0'}}>
                          <div style={{width:12, height:12, background:['#2b6cb0','#48bb78','#f6ad55','#f56565','#a0aec0'][i%5], borderRadius:4}} />
                          <div style={{flex:1, fontWeight:700}}>{k === 'confirmed' ? 'rescheduled' : k}</div>
                          <div style={{color:'#666'}}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeItem === 'calendar' && (
          <div className="admin-sidebar">
            <div className="sidebar-section">
              <h3>Appointments</h3>
                  <button className="sidebar-link" onClick={() => setShowAllModal(true)}>View all</button>
            </div>
            {(() => {
              const visible = appointments.filter(a => a.iso === selectedIso)
              if (visible.length === 0) return <div className="sidebar-empty">No appointments for this day</div>
              return visible.map(apt => (
                <div key={apt.id} className={`sidebar-card ${
                  String(apt.status || '').toLowerCase() === 'confirmed' ? 'status-confirmed'
                  : String(apt.status || '').toLowerCase() === 'approved' ? 'status-approved'
                  : String(apt.status || '').toLowerCase() === 'pending' ? 'status-pending'
                  : String(apt.status || '').toLowerCase() === 'rescheduled' ? 'status-rescheduled'
                  : (String(apt.status || '').toLowerCase() === 'done' || String(apt.status || '').toLowerCase() === 'completed') ? 'status-done'
                  : String(apt.status || '').toLowerCase() === 'cancelled' ? 'status-cancelled'
                  : 'status-declined'
                }`}>
                <div className="sidebar-card-meta">
                  <span className="sidebar-card-time-meta">{(() => {
                    // Prefer rescheduled values when present; otherwise use iso/date and start/time
                    const maybeTs = (typeof apt.id === 'number' && apt.id > 1000000000) ? new Date(apt.id) : (apt.submittedAt ? new Date(apt.submittedAt) : null)
                    const now = new Date()
                    const timeStr = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    if (maybeTs) {
                      if (maybeTs.toDateString() === now.toDateString()) return `Today at ${timeStr(maybeTs)}`
                      return `${maybeTs.toLocaleDateString()} at ${timeStr(maybeTs)}`
                    }
                    const scheduledIso = apt.rescheduleDate || apt.reschedule_date || apt.iso || (apt.date ? toIsoDate(apt.date) : '')
                    const scheduledStart = apt.rescheduleStart || apt.reschedule_start || apt.start || apt.time || ''
                    if (scheduledStart) {
                      const todayIso = toIsoDate(new Date())
                      if (scheduledIso === todayIso) return `Today at ${scheduledStart}`
                      return `${scheduledIso ? isoToLocalDateString(scheduledIso) + ' at ' + scheduledStart : (apt.date ? apt.date + ' at ' + scheduledStart : scheduledStart)}`
                    }
                    return scheduledIso ? isoToLocalDateString(scheduledIso) : (apt.date || '')
                  })()}</span>
                  {(() => {
                    const status = String(apt.status || '').toLowerCase()
                    const ongoing = isAppointmentOngoing(apt)
                    const cls = status === 'confirmed' ? 'status-confirmed'
                      : status === 'approved' ? 'status-approved'
                      : status === 'pending' ? 'status-pending'
                      : status === 'rescheduled' ? 'status-rescheduled'
                      : (status === 'done' || status === 'completed') ? 'status-done'
                      : status === 'cancelled' ? 'status-cancelled'
                      : 'status-declined'
                    return (
                      <span className={`sidebar-card-status status-text ${cls}${ongoing ? ' status-ongoing' : ''}`}>
                        { status === 'confirmed' ? (ongoing ? 'Ongoing' : 'Rescheduled')
                          : status === 'approved' ? (ongoing ? 'Ongoing' : 'Approved')
                          : status === 'pending' ? 'For Approval'
                          : status === 'rescheduled' ? 'Rescheduled'
                          : (status === 'done' || status === 'completed') ? <span className="status-text status-completed">Completed</span>
                          : status === 'declined' ? 'Declined'
                          : 'Cancelled'
                        }
                      </span>
                    )
                  })()}
                </div>

                  <div className="sidebar-card-left">
                  <div className="sidebar-card-icon">🕗</div>
                  <div className="sidebar-card-time-left">{(apt.rescheduleStart || apt.reschedule_start || apt.start || apt.time) || ''}{(apt.rescheduleStart || apt.reschedule_start || apt.start) && (apt.rescheduleEnd || apt.reschedule_end || apt.end) ? ' - ' + (apt.rescheduleEnd || apt.reschedule_end || apt.end) : ''}</div>
                </div>

                <div className="sidebar-card-info">
                  <div className="sidebar-card-name">{apt.name}</div>
                  {apt.course && <div className="sidebar-card-course">{apt.course}</div>}

                  {/* Identifier: student ID, role (alumni/teaching), guest, or email */}
                  {apt.guest ? (
                    <div className="sidebar-card-identifier">Guest</div>
                  ) : apt.studentId ? (
                    <div className="sidebar-card-identifier">Student ID: {apt.studentId}</div>
                  ) : apt.role ? (
                    <div className="sidebar-card-identifier">{apt.role}</div>
                  ) : apt.email ? (
                    <div className="sidebar-card-identifier">{apt.email}</div>
                  ) : null}

                </div>

                <span onClick={() => { setSelectedAppointment(apt); setDetailsOpen(true) }} className="sidebar-view" style={{cursor:'pointer'}}>View Details</span>
                {String(apt.status || '').toLowerCase() === 'cancelled' && (() => {
                  const key = String(apt.cancelled_by || apt.cancelledBy || apt.adminNote || '').toLowerCase()
                  const isAdminCancel = key === 'admin' || key.includes('admin')
                  const isStudentOrGuest = !!apt.guest || !!apt.studentId || String(apt.role || '').toLowerCase() === 'student'
                  return (isAdminCancel && isStudentOrGuest) ? (
                    <button className="reschedule-open-btn" onClick={(e) => { e.stopPropagation(); setSelectedAppointment(apt); setRescheduleData({ date: (apt.iso || apt.date) || '', start: apt.start || apt.time || '', end: apt.end || '', reason: apt.reason || '' }); setRescheduleOpen(true) }} style={{marginLeft:8}}>Reschedule</button>
                  ) : null
                })()}
              </div>
              ))
            })()}
          </div>
          )}
          {/* Availability panel (when selected from Sidebar) */}
          {activeItem === 'availability' && (
            <>
            <div className="availability-panel">
              <div style={{background:'#fff', borderRadius:12, padding:20, boxShadow:'0 6px 18px rgba(15,23,42,0.06)'}}>
                <h2 style={{marginTop:0}}>Office Hours Availability
                  <span className="help-tooltip" aria-label="Pre-set dated availability">
                    ?
                    <div className="help-tooltip-content">
                      <div className="help-tooltip-title">Pre-set date/time</div>
                      <div className="help-tooltip-desc" style={{marginTop:6, fontSize:13, color:'#556'}}>
                        Select the dates and times when the dean is available for student consultations.
                      </div>
                    </div>
                  </span>
                </h2>
                <div className="availability-list">
                  {['Monday','Tuesday','Wednesday','Thursday','Friday'].map(day => (
                    <div key={day} className="weekday-row">
                      <div className="weekday-day">
                        <div className="weekday-name">{day}</div>
                        <div className={`weekday-sub ${(availability[day] && availability[day].length) ? 'has-schedule' : 'no-schedule'}`}>
                            {(availability[day] && availability[day].length) ? availability[day].map((r, i) => (
                              <div key={i} style={{marginBottom:8}}>
                                <div style={{fontWeight:500}}>{r.start} to {r.end}</div>
                              </div>
                            )) : 'No Schedule'}
                          </div>
                      </div>
                      <div>
                        <button className="set-schedule-btn" onClick={() => { setScheduleDay(day); setScheduleOpen(true); setNewStart(''); setNewEnd(''); setNewDate(''); setNewType('') }}>+ Set Time Schedule</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="availability-panel">
              <div style={{background:'#fff', borderRadius:12, padding:20, boxShadow:'0 6px 18px rgba(15,23,42,0.06)'}}>
                  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                    <h2 style={{marginTop:0}}>Available Time Slots
                      <span className="help-tooltip" aria-label="Pre-set dated availability" style={{marginLeft:8}}>
                        ?
                        <div className="help-tooltip-content">
                          <div className="help-tooltip-desc" style={{marginTop:6, fontSize:13, color:'#556'}}>List of scheduled dates and times when the dean is available. You can edit or remove a slot.</div>
                        </div>
                      </span>
                    </h2>
                    <button className="set-dated-btn" onClick={() => { setShowAddDatedModal(true); setNewDatedDate(''); setNewDatedType(''); setNewDatedStart(''); setNewDatedEnd('') }}>Add</button>
                  </div>
                {datedRows.length === 0 ? (
                  <div style={{color:'#888'}}>No dated availability</div>
                ) : (
                  datedRows.map(r => (
                    <div key={r.id} style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', borderBottom:'1px solid #f7f7f7'}}>
                      <div>
                        <div style={{fontWeight:500}}>
                          {isoToLocalDateString(r.date, { month: 'short', day: 'numeric', year: 'numeric' })} — {r.day} — {r.start} to {r.end}
                        </div>
                      </div>
                      <div style={{display:'flex', gap:8, alignItems:'center'}}>
                        <button className="edit-btn" onClick={() => {
                          // pre-fill modal for editing this dated availability
                          setEditingAvailId(r.id)
                          setNewDatedDate(r.date || '')
                          // `r.start` and `r.end` are in 12-hour format like "1:35 PM"; convert to 24h hh:mm for input[type=time]
                          const to24 = (t) => {
                            if (!t) return ''
                            try {
                              const m = String(t).match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
                              if (!m) return ''
                              let hh = Number(m[1])
                              const mm = Number(m[2])
                              const ampm = m[3].toUpperCase()
                              if (ampm === 'PM' && hh !== 12) hh += 12
                              if (ampm === 'AM' && hh === 12) hh = 0
                              return String(hh).padStart(2,'0') + ':' + String(mm).padStart(2,'0')
                            } catch (e) { return '' }
                          }
                          setNewDatedStart(to24(r.start))
                          setNewDatedEnd(to24(r.end))
                          setNewDatedType(r.type || '')
                          setShowAddDatedModal(true)
                        }}>Edit</button>
                        <button className="close-btn" onClick={() => { removeRange(r.day, (availability[r.day] || []).findIndex(x => x.id === r.id)) }}>Remove</button>
                      </div>
                    </div>
                  ))
                )}
                  {showAddDatedModal && (
                    <div className="details-modal-overlay" onClick={() => setShowAddDatedModal(false)}>
                      <div className="details-modal open" onClick={e => e.stopPropagation()} style={{maxWidth:560}}>
                        <h2>Add dated availability</h2>
                        <div style={{marginTop:12}}>
                          <label style={{display:'block', marginBottom:6}}>Date</label>
                          <input type="date" value={newDatedDate} onChange={e => { setNewDatedDate(e.target.value); setDatedErrors(prev => { const p = { ...prev }; delete p.date; return p }) }} style={{width:'100%', padding:12, borderRadius:8, border:'1px solid #e6e6e6'}} />
                          {datedErrors.date && <div style={{color:'red', marginTop:6, fontSize:13}}>{datedErrors.date}</div>}
                        </div>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:12}}>
                          <div>
                            <label style={{display:'block', marginBottom:6}}>Start time</label>
                            <input type="time" value={newDatedStart} onChange={e => { setNewDatedStart(e.target.value); setDatedErrors(prev => { const p = { ...prev }; delete p.start; delete p.general; return p }) }} style={{width:'100%', padding:12, borderRadius:8, border:'1px solid #e6e6e6'}} />
                            {datedErrors.start && <div style={{color:'red', marginTop:6, fontSize:13}}>{datedErrors.start}</div>}
                          </div>
                          <div>
                            <label style={{display:'block', marginBottom:6}}>End time</label>
                            <input type="time" value={newDatedEnd} onChange={e => { setNewDatedEnd(e.target.value); setDatedErrors(prev => { const p = { ...prev }; delete p.end; delete p.general; return p }) }} style={{width:'100%', padding:12, borderRadius:8, border:'1px solid #e6e6e6'}} />
                            {datedErrors.end && <div style={{color:'red', marginTop:6, fontSize:13}}>{datedErrors.end}</div>}
                          </div>
                        </div>
                        <div style={{marginTop:12}}>
                          <label style={{display:'block', marginBottom:6}}>Reason:</label>
                          <input type="text" value={newDatedType} onChange={e => setNewDatedType(e.target.value)} placeholder="Reason" style={{width:'100%', padding:12, borderRadius:8, border:'1px solid #e6e6e6'}} />
                        </div>
                        {datedErrors.general && <div style={{color:'red', marginTop:8}}>{datedErrors.general}</div>}
                        <div style={{display:'flex', justifyContent:'flex-end', gap:12, marginTop:14}}>
                          <button className="close-btn" onClick={() => { setShowAddDatedModal(false); setDatedErrors({}); setEditingAvailId(null) }}>Cancel</button>
                          <button className="approve-btn" onClick={saveDatedSlot} disabled={!newDatedDate || !newDatedStart || !newDatedEnd} style={{opacity: (!newDatedDate || !newDatedStart || !newDatedEnd) ? 0.6 : 1}}>Save</button>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </div>

            </>
          )}
          
          {showCreateUser && (
            <NewUserModal onClose={() => setShowCreateUser(false)} onCreate={handleCreateUser} />
          )}
        </div>
        {detailsOpen && selectedAppointment && (
          <div className="details-modal-overlay" onClick={() => setDetailsOpen(false)}>
            <div className={`details-modal open`} onClick={(e) => e.stopPropagation()}>
              <div className="details-top">
                <div className="details-main">
                    {selectedAppointment.name ? (
                      <img src={`/Images/${selectedAppointment.name}.png`} alt={selectedAppointment.name} style={{width:64,height:64,borderRadius:'50%',objectFit:'cover',marginRight:12}} onError={(e)=>{ e.currentTarget.style.display='none' }} />
                    ) : null}
                    <h2 className="details-name">{selectedAppointment.name}</h2>
                    {(selectedAppointment.course || selectedAppointment.department || selectedAppointment.courseName) && (
                      <div className="details-course">{selectedAppointment.course || selectedAppointment.department || selectedAppointment.courseName}</div>
                    )}
                    {selectedAppointment.studentId ? (
                      <div className="details-id">Student ID: {selectedAppointment.studentId}</div>
                    ) : selectedAppointment.guest ? (
                      <div className="details-id">Guest</div>
                    ) : selectedAppointment.email ? (
                      <div className="details-id">{selectedAppointment.email}</div>
                    ) : null}
                  </div>

                  {(() => {
                    const status = String(selectedAppointment.status || '').toLowerCase()
                    const ongoing = isAppointmentOngoing(selectedAppointment)
                    const cls = status === 'confirmed' ? 'status-confirmed'
                      : status === 'approved' ? 'status-approved'
                      : status === 'pending' ? 'status-pending'
                      : status === 'rescheduled' ? 'status-rescheduled'
                      : (status === 'done' || status === 'completed') ? 'status-done'
                      : status === 'cancelled' ? 'status-cancelled'
                      : 'status-declined'

                    return (
                      <div className={`details-status status-text ${cls}${ongoing ? ' status-ongoing' : ''}`}>
                        {
                          status === 'confirmed' ? (ongoing ? 'Ongoing' : 'Rescheduled')
                          : status === 'approved' ? (ongoing ? 'Ongoing' : 'Approved')
                          : status === 'pending' ? 'For Approval'
                          : status === 'rescheduled' ? 'Rescheduled'
                          : (status === 'done' || status === 'completed') ? <span className="status-text status-completed">Completed</span>
                          : status === 'declined' ? 'Declined'
                          : 'Cancelled'
                        }
                      </div>
                    )
                  })()}
              </div>

              <div className="details-section">
                <h3>Reason:</h3>
                <p>{selectedAppointment.reason}</p>
              </div>

              <div className="details-section">
                <h3>Schedule Date:</h3>
                <p>{(selectedAppointment.iso || selectedAppointment.date) ? isoToLocalDateString(selectedAppointment.iso || selectedAppointment.date, { month: 'long', day: 'numeric', year: 'numeric' }) : ''}{selectedAppointment.start ? ' at ' + selectedAppointment.start : ''}{selectedAppointment.end ? ' to ' + selectedAppointment.end : ''}</p>
              </div>

              {selectedAppointment.submittedAt && (
                <div className="details-section">
                  <h3>Submitted:</h3>
                  <p>{new Date(selectedAppointment.submittedAt).toLocaleString([], { timeZone: 'Asia/Manila', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                </div>
              )}

              {String(selectedAppointment.status || '').toLowerCase() === 'cancelled' && selectedAppointment.cancelReason && (
                <div className="details-section">
                  <h3>Cancellation reason:</h3>
                  <p>{selectedAppointment.cancelReason}</p>
                </div>
              )}

              {String(selectedAppointment.status || '').toLowerCase() === 'cancelled' && (
                <div className="details-section">
                  <h3>Cancelled by:</h3>
                  <p>{getCancelledByDisplay(selectedAppointment)}</p>
                </div>
              )}

              {String(selectedAppointment.status || '').toLowerCase() === 'cancelled' && (selectedAppointment.cancelledAt || selectedAppointment.cancelled_at || selectedAppointment.cancelled_at) && (
                <div className="details-section">
                  <h3>Cancelled at:</h3>
                  <p>{new Date(selectedAppointment.cancelledAt || selectedAppointment.cancelled_at || selectedAppointment.cancelled_at).toLocaleString([], { timeZone: 'Asia/Manila', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                </div>
              )}

              {selectedAppointment.status === 'rescheduled' && (
                <div className="details-section">
                  <h3>Rescheduled:</h3>
                  <p>Rescheduled on {selectedAppointment.date} at {selectedAppointment.start}. (Set {selectedAppointment.rescheduledAt ? new Date(selectedAppointment.rescheduledAt).toLocaleString() : ''})</p>
                </div>
              )}
              {selectedAppointment.status === 'declined' && selectedAppointment.adminNote && (
                <div className="details-section">
                  <h3>Decline reason:</h3>
                  <p>{selectedAppointment.adminNote}</p>
                </div>
              )}

              <div className="details-actions">{renderDetailsActions()}</div>
            </div>
          </div>
        )}

        {showAllModal && (
          <div className="details-modal-overlay" onClick={() => setShowAllModal(false)}>
            <div className="details-modal open" onClick={(e) => e.stopPropagation()} style={{maxWidth:800}}>
              <h2>All appointments for {selectedDate.toDateString()}</h2>
              <div style={{marginTop:12}}>
                {appointments.filter(a => a.iso === selectedIso).map(a => (
                  <div key={a.id} style={{padding:12, borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <div>
                      <div style={{fontWeight:800}}>{a.name}</div>
                      <div style={{color:'#556'}}>{a.start || a.time} {a.end ? ' - ' + a.end : ''} • {a.reason}</div>
                    </div>
                    <div style={{display:'flex', gap:8, alignItems:'center'}}>
                      <div className={`status-text ${isAppointmentOngoing(a) ? 'status-ongoing' : ''}`} style={{fontWeight:700, color: 
                        isAppointmentOngoing(a) ? '#D9730D'
                        : a.status === 'pending' ? '#60A5FA'
                        : a.status === 'approved' ? '#2FC26A'
                        : a.status === 'confirmed' ? '#B45309'
                        : a.status === 'done' ? '#0E8A32'
                        : '#A33131'}}>
                        {a.status === 'pending' ? 'For Approval' 
                          : a.status === 'approved' ? (isAppointmentOngoing(a) ? 'Ongoing' : 'Approved')
                          : a.status === 'confirmed' ? (isAppointmentOngoing(a) ? 'Ongoing' : 'Rescheduled')
                          : a.status === 'done' ? 'Done'
                          : 'Cancelled'}
                      </div>
                      <button className="view-details-btn" onClick={() => { setSelectedAppointment(a); setDetailsOpen(true); setShowAllModal(false) }}>View</button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{display:'flex', justifyContent:'flex-end', marginTop:14}}>
                <button className="close-btn" onClick={() => setShowAllModal(false)}>Close</button>
              </div>
            </div>
          </div>
        )}

        <Toast show={showConfirm} type={confirmType} message={confirmMessage} onClose={() => setShowConfirm(false)} />

        {rescheduleOpen && selectedAppointment && (
          <div className="details-modal-overlay" onClick={() => setRescheduleOpen(false)}>
            <div className="reschedule-modal" onClick={(e) => e.stopPropagation()}>
              <h2>Reschedule</h2>
              <p>Fill out the form below to reschedule your appointment with the Student Affairs Office</p>
              <div style={{display:'flex', gap:20, marginTop:18}}>
                <div style={{flex:'1 1 0'}}>
                  <label style={{display:'block', marginBottom:8}}>Choose date</label>
                  <input type="date" value={rescheduleData.date} onChange={e => setRescheduleData(d => ({ ...d, date: e.target.value }))} style={{width:'100%', padding:12, borderRadius:8, border:'1px solid #ccc'}} />
                </div>
                <div style={{flex:'1 1 0'}}>
                  <label style={{display:'block', marginBottom:8}}>Choose start time</label>
                  <input type="time" value={rescheduleData.start} onChange={e => setRescheduleData(d => ({ ...d, start: e.target.value }))} style={{width:'100%', padding:12, borderRadius:8, border:'1px solid #ccc'}} />
                  <label style={{display:'block', marginTop:12, marginBottom:8}}>Choose end time</label>
                  <input type="time" value={rescheduleData.end} onChange={e => setRescheduleData(d => ({ ...d, end: e.target.value }))} style={{width:'100%', padding:12, borderRadius:8, border:'1px solid #ccc'}} />
                </div>
              </div>

              <div style={{marginTop:14}}>
                <label style={{display:'block', marginBottom:8}}>Email</label>
                <input type="email" value={selectedAppointment.email} readOnly style={{width:'100%', padding:12, borderRadius:8, border:'1px solid #ddd', background:'#f7f7f7'}} />
              </div>

              {/* Validation panel removed: button will be disabled until inputs look valid */}

                <div style={{display:'flex', justifyContent:'flex-end', gap:12, marginTop:18}}>
                <button className="close-btn" onClick={() => setRescheduleOpen(false)}>Back</button>
                <button className="approve-btn" disabled={!rescheduleCanSend || rescheduleChecking} onClick={async () => {
                  // client-side validation before sending
                  setRescheduleErrors([])
                  const validateReschedule = async () => {
                    const errs = []
                    const { date, start, end } = rescheduleData || {}
                    if (!date) errs.push('Date is required')
                    if (!start) errs.push('Start time is required')
                    if (!end) errs.push('End time is required')
                    // parse times HH:MM
                    const toMins = (t) => {
                      if (!t) return null
                      const m = String(t).split(':')
                      if (m.length < 2) return null
                      const hh = parseInt(m[0], 10)
                      const mm = parseInt(m[1], 10)
                      if (isNaN(hh) || isNaN(mm)) return null
                      return hh * 60 + mm
                    }
                    const s = toMins(start)
                    const e = toMins(end)
                    if (s === null || e === null) errs.push('Invalid time format')
                    if (s !== null && e !== null && s >= e) errs.push('Start time must be before end time')
                    // not in the past
                    try {
                      if (date && s !== null) {
                        const proposed = new Date(`${date}T${String(start).padStart(5,'0')}`)
                        if (proposed.getTime() < Date.now() - 60000) errs.push('Proposed start is in the past')
                      }
                    } catch (e) {}

                    // availability check: ensure there is an availability slot that contains the requested range
                    if (date && s !== null && e !== null) {
                      try {
                        const weekDays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
                        const wd = weekDays[new Date(date).getDay()]
                        const ranges = (availability && availability[wd]) ? availability[wd] : []
                        // allow dated availability entries (r.date === date)
                        const ok = (ranges || []).some(r => {
                          if (!r) return false
                          // if r has date, it must match
                          if (r.date && String(r.date).slice(0,10) !== String(date).slice(0,10)) return false
                          const rs = toMins(r.start)
                          const re = toMins(r.end)
                          if (rs === null || re === null) return false
                          return s >= rs && e <= re
                        })
                        if (!ok) errs.push('Requested time does not fit any availability slot')
                      } catch (e) {}
                    }

                    // conflict and daily limit checks using existing appointments
                    try {
                      const res = await listAppointments()
                      if (res && res.ok) {
                        const iso = String(date)
                        const existing = (res.data || []).filter(a => {
                          const apIso = a.iso || (a.date ? (typeof a.date === 'string' && a.date.length === 10 ? a.date : '') : '')
                          if (!apIso) return false
                          if (apIso !== iso) return false
                          if ((a.status || '').toLowerCase() === 'cancelled') return false
                          return a.id !== selectedAppointment.id
                        })
                        // daily limit
                        if (existing.length >= 5) errs.push('Daily appointment limit reached for selected date')
                        // conflict: overlapping times
                        const overlaps = (otherStart, otherEnd, s2, e2) => Math.max(otherStart, s2) < Math.min(otherEnd, e2)
                        const conflicts = existing.some(a => {
                          const aStart = toMins(a.start || a.time || '')
                          const aEnd = toMins(a.end || '')
                          if (aStart === null || aEnd === null) return false
                          return overlaps(aStart, aEnd, s, e)
                        })
                        if (conflicts) errs.push('Requested time conflicts with another appointment')
                      }
                    } catch (e) {}

                    return errs
                  }

                    setRescheduleChecking(true)
                    const errors = await validateReschedule()
                  setRescheduleChecking(false)
                  if (errors && errors.length > 0) {
                    // don't render the inline panel; alert instead
                    alert(errors.join('\n'))
                    return
                  }

                  // Call backend to apply and approve reschedule
                  try {
                    await updateAppointmentStatus(selectedAppointment.id, 'confirmed', { rescheduleDate: rescheduleData.date, rescheduleStart: rescheduleData.start, rescheduleEnd: rescheduleData.end, rescheduleReason: rescheduleData.reason, approveReschedule: true }, true)
                  } catch (e) {
                    // ignore - we'll refresh to get server state
                  }
                  // update local UI for immediate feedback
                  const resAt = Date.now()
                  setAppointments(prev => prev.map(a => a.id === selectedAppointment.id ? { ...a, date: rescheduleData.date || a.date, iso: (rescheduleData.date || a.date) ? (rescheduleData.date || a.date) : a.iso, start: rescheduleData.start || a.start, end: rescheduleData.end || a.end, reason: rescheduleData.reason || a.reason, status: 'confirmed', rescheduledAt: resAt } : a))
                  try {
                    const rawNot = localStorage.getItem('notifications')
                    const arr = rawNot ? JSON.parse(rawNot) : []
                    arr.push({ id: Date.now(), appointmentId: selectedAppointment.id, title: 'Appointment rescheduled', message: `Your appointment was rescheduled to ${rescheduleData.date} at ${rescheduleData.start}`, createdAt: Date.now(), read: false, email: selectedAppointment.email || selectedAppointment.studentEmail, studentId: selectedAppointment.studentId, target: 'student' })
                    localStorage.setItem('notifications', JSON.stringify(arr))
                  } catch (e) {}
                  setRescheduleOpen(false)
                  setDetailsOpen(false)
                  setSelectedAppointment(null)
                  refreshAppointments()
                }}>Send</button>
              </div>
            </div>
          </div>
        )}
        {showDeclineModal && selectedAppointment && (
          <div className="details-modal-overlay" onClick={() => setShowDeclineModal(false)}>
            <div className="details-modal open" onClick={(e) => e.stopPropagation()} style={{maxWidth:520}}>
              <h2>Decline appointment</h2>
              <p>Please tell us why you're declining this appointment</p>
              <div style={{marginTop:12}}>
                <label style={{display:'block', marginBottom:8}}>Declining Reason</label>
                <select value={declineReasonType} onChange={e => setDeclineReasonType(e.target.value)} style={{width:'100%', padding:10, borderRadius:8, border:'1px solid #e6e6e6'}}>
                  <option value="" disabled>Select reason</option>
                  <option value="Medical_or_emergency_leave">Medical or emergency leave</option>
                  <option value="Schedule_conflict">Schedule conflict</option>
                  <option value="others">Others</option>
                </select>
                {declineReasonType === 'others' && (
                  <textarea value={declineReason} onChange={e => setDeclineReason(e.target.value)} placeholder="Please provide cancellation details" style={{width:'100%', minHeight:100, padding:12, borderRadius:8, border:'1px solid #e6e6e6', marginTop:12}} />
                )}
              </div>
              <div style={{display:'flex', justifyContent:'flex-end', gap:12, marginTop:14}}>
                <button className="close-btn" onClick={() => {
                  setShowDeclineModal(false)
                  setDeclineReason('')
                  setDeclineReasonType('')
                }}>Back</button>
                <button className="decline-btn" onClick={async () => {
                  const type = (declineReasonType || '').trim()
                  const otherText = (declineReason || '').trim()
                  // validation
                  if (!type) {
                    setConfirmType('error')
                    setConfirmMessage('Please select a cancellation reason.')
                    setShowConfirm(true)
                    setTimeout(() => setShowConfirm(false), 3000)
                    return
                  }
                  if (type === 'others' && !otherText) {
                    setConfirmType('error')
                    setConfirmMessage('Please provide details for "Others".')
                    setShowConfirm(true)
                    setTimeout(() => setShowConfirm(false), 3000)
                    return
                  }
                  const reasonMap = {
                    medical_or_emergency_leave: 'Medical or emergency leave',
                    Schedule_conflict: 'Schedule conflict',
                    others: otherText
                  }
                  const reason = (reasonMap[type] !== undefined) ? reasonMap[type] : otherText

                  // Optimistically update local UI
                  const cancelledTs = new Date().toISOString()
                  const adminName = (() => { try { const raw = localStorage.getItem('adminUser'); if (raw) { const u = JSON.parse(raw||'{}'); return u.name || u.fullName || u.full_name || u.username || null } } catch(e){} return null })()
                  setAppointments(prev => prev.map(a => a.id === selectedAppointment.id ? { ...a, status: 'cancelled', cancelReason: reason, adminNote: reason, cancelled_by: 'admin', cancelled_by_name: adminName, cancelledAt: cancelledTs, cancelled_at: cancelledTs } : a))
                  setSelectedAppointment(prev => ({ ...prev, status: 'cancelled', cancelReason: reason, adminNote: reason, cancelled_by: 'admin', cancelled_by_name: adminName, cancelledAt: cancelledTs, cancelled_at: cancelledTs }))

                  // notifications
                  try {
                    const raw = localStorage.getItem('notifications')
                    const arr = raw ? JSON.parse(raw) : []
                    const msgReason = reason ? ` Reason: ${reason}` : ''
                    arr.unshift({ id: Date.now(), appointmentId: selectedAppointment.id, title: 'Appointment cancelled', message: `Your appointment on ${selectedAppointment.date || selectedAppointment.iso} was cancelled by the admin.${msgReason}`, createdAt: Date.now(), read: false, email: selectedAppointment.email || selectedAppointment.studentEmail, studentId: selectedAppointment.studentId, target: 'student' })
                    localStorage.setItem('notifications', JSON.stringify(arr))
                  } catch (e) {}

                  // update cancelledByOverrides
                  try {
                    const raw = typeof window !== 'undefined' && localStorage.getItem('cancelledByOverrides')
                    const overrides = raw ? JSON.parse(raw) : {}
                    overrides[String(selectedAppointment.id)] = { by: 'admin', name: adminName || 'Admin' }
                    localStorage.setItem('cancelledByOverrides', JSON.stringify(overrides))
                  } catch (e) {}

                  // update local appointments cache so optimistic cancel persists
                  try {
                    const rawA = localStorage.getItem('appointments')
                    const arrA = rawA ? JSON.parse(rawA) : []
                    const updatedArr = (arrA || []).map(a =>
                      a && a.id === selectedAppointment.id ? { ...a, status: 'cancelled', cancelReason: reason, cancelledAt: cancelledTs, cancelled_at: cancelledTs, cancelled_by: 'admin', adminNote: reason } : a
                    )
                    if (!updatedArr.find(x => x && x.id === selectedAppointment.id)) {
                      const orig = (appointments.find(a => a && a.id === selectedAppointment.id) || { id: selectedAppointment.id })
                      updatedArr.unshift({ ...orig, status: 'cancelled', cancelReason: reason, cancelledAt: cancelledTs, cancelled_at: cancelledTs, cancelled_by: 'admin', adminNote: reason })
                    }
                    localStorage.setItem('appointments', JSON.stringify(updatedArr))
                  } catch (e) {}

                  // Call backend to cancel (fire-and-forget)
                  (async () => {
                    try {
                      await updateAppointmentStatus(selectedAppointment.id, 'cancelled', { cancelReason: reason, adminNote: reason }, true)
                    } catch (e) { /* ignore */ }
                    try { await refreshAppointments() } catch (e) {}
                  })()

                  setShowDeclineModal(false)
                  setDetailsOpen(false)
                  setSelectedAppointment(null)
                  setDeclineReason('')
                  setDeclineReasonType('')
                }}>Confirm Decline</button>
              </div>
            </div>
          </div>
        )}
        {scheduleOpen && (
          <div className="details-modal-overlay" onClick={() => setScheduleOpen(false)}>
            <div className="details-modal open" onClick={e => e.stopPropagation()} style={{maxWidth:560}}>
              <h2>Set schedule — {scheduleDay}</h2>
              <div style={{marginTop:12}}>
                <div style={{marginBottom:10, color:'#556', fontWeight:700}}>Existing time ranges</div>
                {(availability[scheduleDay] || []).length === 0 && <div style={{color:'#888'}}>No schedule</div>}
                {(availability[scheduleDay] || []).map((r, idx) => (
                  <div key={idx} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f1f1f1'}}>
                    <div>
                      <div style={{fontWeight:500}}>{r.start} to {r.end}</div>
                    </div>
                    <div style={{display:'flex', gap:8}}>
                      <button className="close-btn" onClick={() => {
                        setNewStart(toInputValue(r.start) || r.start)
                        setNewEnd(toInputValue(r.end) || r.end)
                        setNewDate(r.date || '')
                        setNewType(r.type || '')
                        if (r.id) {
                          setEditingAvailId(r.id)
                          setEditingAvailIdx(null)
                        } else {
                          setEditingAvailIdx(idx)
                          setEditingAvailId(null)
                        }
                      }}>Edit</button>
                      <button className="close-btn" onClick={() => removeRange(scheduleDay, idx)}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>

              

              <div style={{display:'flex', gap:12, marginTop:8}}>
                <div style={{flex:1}}>
                  <label style={{display:'block', marginBottom:6}}>Start time</label>
                  <input type="time" value={newStart} onChange={e => setNewStart(e.target.value)} style={{width:'100%', padding:12, borderRadius:8, border:'1px solid #e6e6e6'}} />
                </div>
                <div style={{flex:1}}>
                  <label style={{display:'block', marginBottom:6}}>End time</label>
                  <input type="time" value={newEnd} onChange={e => setNewEnd(e.target.value)} style={{width:'100%', padding:12, borderRadius:8, border:'1px solid #e6e6e6'}} />
                </div>
              </div>
              <div style={{display:'flex', gap:12, justifyContent:'flex-start', marginTop:12}}>
                {(() => {
                  const maxReached = ((availability[scheduleDay] || []).filter(r => !r.date || r.date === '').length) >= 5
                  const isEditing = Boolean(editingAvailId || editingAvailIdx !== null)
                  return (
                    <>
                      <button className="approve-btn" onClick={addRange} disabled={!isEditing && maxReached}>{isEditing ? 'Save' : 'Add'}</button>
                      {!isEditing && scheduleWarning ? <div style={{color:'#d00', marginLeft:8}}>Max 5 time ranges allowed per day</div> : null}
                    </>
                  )
                })()}
                {editingAvailId || editingAvailIdx !== null ? (
                  <button className="close-btn" onClick={cancelEdit}>Cancel</button>
                ) : null}
                <button className="close-btn" onClick={() => {
                  const hasChanges = (newStart && newStart !== '') || (newEnd && newEnd !== '') || (newDate && newDate !== '') || (newType && newType !== '') || (editingAvailId !== null && editingAvailId !== undefined) || (editingAvailIdx !== null && editingAvailIdx !== undefined)
                  if (hasChanges) {
                    setShowDiscardConfirm(true)
                    return
                  }
                  cancelEdit(); setScheduleOpen(false)
                }}>Done</button>
                {showDiscardConfirm && (
                  <div className="details-modal-overlay" onClick={() => setShowDiscardConfirm(false)}>
                    <div className="details-modal open" onClick={e => e.stopPropagation()} style={{maxWidth:420}}>
                      <h3>Discard changes?</h3>
                      <p style={{color:'#666'}}>You have unsaved changes. Discard them?</p>
                      <div style={{display:'flex', gap:12, justifyContent:'flex-end', marginTop:12}}>
                        <button className="close-btn" onClick={() => setShowDiscardConfirm(false)}>Cancel</button>
                        <button className="decline-btn" onClick={() => { cancelEdit(); setShowDiscardConfirm(false); setScheduleOpen(false) }}>Discard</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <Sidebar activeItem={activeItem} onSelect={(id) => {
          if (id === 'register-visit') {
            setShowWalkInModal(true)
            return
          }
          setActiveItem(id)
        }} />

        {showWalkInModal && (
          <WalkInModal onClose={() => setShowWalkInModal(false)} onSubmit={handleWalkInSubmit} />
        )}
      </main>
    </div>
  )
}
