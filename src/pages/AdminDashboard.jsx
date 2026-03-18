import { useState, useEffect } from 'react'
import NavBar from '../components/NavBar'
import { Bar, Pie } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Hourglass, 
  ChevronLeft, 
  ChevronRight, 
  HelpCircle, 
  Plus, 
  Search, 
  FileDown, 
  FileText,
  User,
  UserPlus,
  MoreVertical
} from 'lucide-react'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)
import AdminWalkIn from './AdminWalkIn'
import WalkInModal from '../components/WalkInModal'
import ModalNoOverlay from '../components/ModalNoOverlay'
import { useLocation } from 'react-router-dom'
import NewUserModal from '../components/NewUserModal'
import './AdminDashboard.css'
import { listAppointments, updateAppointmentStatus, requestReschedule, createAppointment as apiCreateAppointment, listAvailability, addAvailability, deleteAvailability, updateAvailability } from '../api'
import Toast from '../components/Toast'

export default function AdminDashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [activeItem, setActiveItem] = useState('calendar')
  const [appointments, setAppointments] = useState([])
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [isApproving, setIsApproving] = useState(false)
  const [isDeclining, setIsDeclining] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [rescheduleData, setRescheduleData] = useState({ date: '', start: '', end: '', reason: '' })
  const [rescheduleErrors, setRescheduleErrors] = useState([])
  const [rescheduleChecking, setRescheduleChecking] = useState(false)
  const [rescheduleCanSend, setRescheduleCanSend] = useState(false)
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [declineReasonType, setDeclineReasonType] = useState('other')
  const [declineError, setDeclineError] = useState('')
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
  const [scheduleErrors, setScheduleErrors] = useState({})
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

  useEffect(() => {
    if (!declineError) return
    const id = setTimeout(() => setDeclineError(''), 2000)
    return () => clearTimeout(id)
  }, [declineError])

  useEffect(() => {
    if (Object.keys(scheduleErrors).length === 0) return
    const id = setTimeout(() => setScheduleErrors({}), 2000)
    return () => clearTimeout(id)
  }, [scheduleErrors])

  useEffect(() => {
    if (Object.keys(datedErrors).length === 0) return
    const id = setTimeout(() => setDatedErrors({}), 2000)
    return () => clearTimeout(id)
  }, [datedErrors])

  useEffect(() => {
    if (rescheduleErrors.length === 0) return
    const id = setTimeout(() => setRescheduleErrors([]), 2000)
    return () => clearTimeout(id)
  }, [rescheduleErrors])

  useEffect(() => {
    if (!showConfirm) return
    const id = setTimeout(() => setShowConfirm(false), 5000)
    return () => clearTimeout(id)
  }, [showConfirm])

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
      if (res && res.ok && Array.isArray(res.data)) {
        const serverApts = res.data || []
        try { localStorage.setItem('appointments', JSON.stringify(serverApts)) } catch (e) {}
        try {
          const rawAdmin = typeof window !== 'undefined' && localStorage.getItem('adminUser')
          const adminName = rawAdmin ? (JSON.parse(rawAdmin||'{}').name || JSON.parse(rawAdmin||'{}').fullName || JSON.parse(rawAdmin||'{}').full_name || JSON.parse(rawAdmin||'{}').username) : null
          const annotated = (serverApts || []).map(a => {
            const cancelledByVal = a && (a.cancelled_by || a.cancelledBy)
            const isAdminCancelled = cancelledByVal && String(cancelledByVal).toLowerCase() === 'admin'
            return (a && isAdminCancelled && adminName) ? { ...a, cancelled_by_name: adminName } : a
          })
          setAppointments(annotated)
        } catch (e) {
          setAppointments(serverApts)
        }
      } else {
        try {
          const raw = localStorage.getItem('appointments')
          const arr = raw ? JSON.parse(raw) : []
          try {
            const rawAdmin = typeof window !== 'undefined' && localStorage.getItem('adminUser')
            const adminName = rawAdmin ? (JSON.parse(rawAdmin||'{}').name || JSON.parse(rawAdmin||'{}').fullName || JSON.parse(rawAdmin||'{}').full_name || JSON.parse(rawAdmin||'{}').username) : null
            const annotated = (arr || []).map(a => {
              const cancelledByVal = a && (a.cancelled_by || a.cancelledBy)
              const isAdminCancelled = cancelledByVal && String(cancelledByVal).toLowerCase() === 'admin'
              return (a && isAdminCancelled && adminName) ? { ...a, cancelled_by_name: adminName } : a
            })
            setAppointments(Array.isArray(annotated) ? annotated : [])
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
      const proposed = new Date(`${date}T${String(start).padStart(5,'0')}`)
      if (proposed.getTime() < Date.now() - 60000) return setRescheduleCanSend(false)
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

  const datedRows = Object.entries(availability).flatMap(([day, arr]) => {
    return (arr || []).filter(r => r && r.date).map(r => ({ day, ...r }))
  })

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

  const getAppointmentStatusKey = (apt) => {
    if (!apt) return ''
    const status = String(apt.status || '').toLowerCase()
    // If a reschedule was requested, treat it as "rescheduled" visually
    if (apt.rescheduleRequested || status === 'rescheduled') return 'rescheduled'
    // Some appointments might be marked cancelled but still contain a reschedule request
    if (status === 'cancelled' && apt.rescheduleRequested) return 'rescheduled'
    return status
  }

  const getAppointmentStatusLabel = (apt) => {
    const key = getAppointmentStatusKey(apt)
    if (key === 'pending') return 'Pending for approval'
    if (key === 'approved') return isAppointmentOngoing(apt) ? 'Ongoing' : 'Approved'
    if (key === 'rescheduled') return 'Rescheduled'
    if (key === 'done' || key === 'completed') return 'Completed'
    if (key === 'cancelled' || key === 'declined') return 'Cancelled'
    return (apt?.status || '').toString()
  }

  const handleCreateUser = (user) => {
    try {
      const raw = localStorage.getItem('users')
      const arr = raw ? JSON.parse(raw) : []
      arr.push(user)
      localStorage.setItem('users', JSON.stringify(arr))
    } catch (e) {}
    setShowCreateUser(false)
  }

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

  const formatFromInput = (hhmm) => {
    if (!hhmm) return ''
    const [hh, mm] = hhmm.split(':').map(Number)
    const ampm = hh >= 12 ? 'PM' : 'AM'
    const hour = ((hh + 11) % 12) + 1
    return `${hour}:${String(mm).padStart(2,'0')} ${ampm}`
  }

  const toInputValue = (display) => {
    if (!display) return ''
    if (/^\d{2}:\d{2}$/.test(display)) return display
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
    const errs = {}
    if (!newStart) errs.start = 'Start time is required'
    if (!newEnd) errs.end = 'End time is required'
    if (!scheduleDay) errs.general = 'Day is required'

    const parseHM = (s) => {
      try {
        const [hh, mm] = (s || '').split(':').map(Number)
        if (Number.isInteger(hh) && Number.isInteger(mm)) return hh * 60 + mm
      } catch (e) {}
      return null
    }

    const startMin = parseHM(newStart)
    const endMin = parseHM(newEnd)

    if (startMin === null && !errs.start) errs.start = 'Invalid start time'
    if (endMin === null && !errs.end) errs.end = 'Invalid end time'
    if (startMin !== null && endMin !== null && startMin >= endMin) errs.general = 'Start time must be before end time'

    // Check overlaps for recurring slots (no date)
    if (startMin !== null && endMin !== null && !newDate) {
      const dayRanges = availability[scheduleDay] || []
      const hasOverlap = dayRanges.some((r, idx) => {
        if (r.date) return false // skip dated slots
        if (editingAvailId && r.id === editingAvailId) return false
        if (editingAvailIdx !== null && idx === editingAvailIdx) return false
        const rs = parseHM(r.start)
        const re = parseHM(r.end)
        return (startMin < re && endMin > rs)
      })
      if (hasOverlap) errs.general = 'This schedule overlaps with an existing slot'
    }

    setScheduleErrors(errs)
    if (Object.keys(errs).length > 0) return

    const start = toInputValue(formatFromInput(newStart)) || newStart
    const end = toInputValue(formatFromInput(newEnd)) || newEnd
    if (editingAvailId) {
      await updateAvailability(editingAvailId, scheduleDay, start, end, newDate)
    } else if (editingAvailIdx !== null) {
      const copy = { ...availability }
      const arr = (copy[scheduleDay] || []).slice()
      const item = arr[editingAvailIdx]
      if (item) {
        arr[editingAvailIdx] = { ...item, start, end, date: newDate }
        copy[scheduleDay] = arr
        setAvailability(copy)
      }
    } else {
      const anonCount = ((availability[scheduleDay] || []).filter(r => !r.date || r.date === '').length)
      if (anonCount >= 5) {
        setScheduleWarning(true)
        setTimeout(() => setScheduleWarning(false), 3000)
        return
      }
      await addAvailability(scheduleDay, start, end, newDate)
    }
    const data = await listAvailability()
    const avail = data && data.data ? data.data : (data || {})
    setAvailability(avail || { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] })
    setNewStart('')
    setNewEnd('')
    setNewDate('')
    setEditingAvailId(null)
    setEditingAvailIdx(null)
    setScheduleErrors({})
  }

  const saveDatedSlot = async () => {
    const errs = {}
    if (!newDatedDate) errs.date = 'Date is required'
    if (!newDatedStart) errs.start = 'Start time is required'
    if (!newDatedEnd) errs.end = 'End time is required'
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

    // Check overlaps for special slots on the same date
    if (startMin !== null && endMin !== null && newDatedDate) {
      const d = new Date(newDatedDate)
      const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()]
      const dayRanges = availability[dayName] || []
      const hasOverlap = dayRanges.some(r => {
        if (!r.date || r.date.slice(0, 10) !== newDatedDate) return false
        if (editingAvailId && r.id === editingAvailId) return false
        const rs = parseHM(r.start)
        const re = parseHM(r.end)
        return (startMin < re && endMin > rs)
      })
      if (hasOverlap) errs.general = 'This slot overlaps with an existing special slot'
    }

    setDatedErrors(errs)
    if (Object.keys(errs).length > 0) return
    try {
      const d = new Date(newDatedDate)
      const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()]
      if (editingAvailId) {
        await updateAvailability(editingAvailId, dayName, newDatedStart, newDatedEnd, newDatedDate)
      } else {
        await addAvailability(dayName, newDatedStart, newDatedEnd, newDatedDate)
      }
    } catch (e) {}
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
    if (item && item.id) {
      await deleteAvailability(item.id)
      const data = await listAvailability()
      const avail = data && data.data ? data.data : (data || {})
      setAvailability(avail || { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] })
      return
    }
    const copy = { ...availability }
    const arr = (copy[day] || []).slice()
    arr.splice(idx, 1)
    copy[day] = arr
    setAvailability(copy)
  }

  const filteredAppointments = () => {
    return appointments.filter(a => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!((a.name || '').toLowerCase().includes(q) || (a.reason || '').toLowerCase().includes(q))) return false
      }
      if (filterDept && filterDept !== 'All') {
        const deptVal = a.department || a.course || ''
        if (!deptVal.includes(filterDept)) return false
      }
      if (filterStatus && filterStatus !== 'All') {
        if ((a.status || '').toLowerCase() !== filterStatus.toLowerCase()) return false
      }
      return true
    })
  }

  const downloadCSV = (rows) => {
    const cols = ['Date','Time','Name','Department','Reason','Status']
    const lines = [cols.join(',')]
    rows.forEach(r => {
      const line = [r.date || r.iso || '', r.start || r.time || '', r.name||'', r.department || r.course || '', r.reason||'', r.status||''].map(v => '"' + String(v).replace(/"/g,'""') + '"').join(',')
      lines.push(line)
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'appointments.csv'
    a.click()
  }

  const exportPDF = (rows) => {
    const w = window.open('', '_blank')
    const html = `<html><body><h2>Appointments</h2><table border="1" style="border-collapse:collapse;width:100%"><thead><tr><th>Date</th><th>Time</th><th>Name</th><th>Status</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r.date||r.iso||''}</td><td>${r.start||r.time||''}</td><td>${r.name||''}</td><td>${r.status||''}</td></tr>`).join('')}</tbody></table></body></html>`
    w.document.write(html)
    w.document.close()
    w.print()
  }

  const getDepartments = () => {
    const depts = [...new Set(appointments.map(a => a.department || a.course).filter(Boolean))]
    return ['All', ...depts]
  }

  const barChartData = () => {
    const filtered = appointments.filter(a => {
      if (filterDept !== 'All') {
        const deptVal = a.department || a.course || ''
        if (!deptVal.includes(filterDept)) return false
      }
      return true
    })

    const days = chartRange === 'monthly' 
      ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    
    const counts = chartRange === 'monthly' ? Array(12).fill(0) : Array(5).fill(0)
    
    filtered.forEach(a => {
      const dt = parseAppointmentStart(a)
      if (dt) {
        if (chartRange === 'monthly') {
          counts[dt.getMonth()]++
        } else {
          const dayIdx = dt.getDay() - 1 // 0=Mon, 4=Fri
          if (dayIdx >= 0 && dayIdx <= 4) counts[dayIdx]++
        }
      }
    })

    return { 
      labels: days, 
      datasets: [{ 
        label: 'Bookings', 
        data: counts, 
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        hoverBackgroundColor: '#2563eb'
      }] 
    }
  }

  const pieChartData = () => {
    const filtered = appointments.filter(a => {
      if (filterDept !== 'All') {
        const deptVal = a.department || a.course || ''
        if (!deptVal.includes(filterDept)) return false
      }
      return true
    })

    const p = filtered.filter(a => a.status === 'pending').length
    const d = filtered.filter(a => (a.status || '').toLowerCase() === 'completed' || (a.status || '').toLowerCase() === 'done').length
    const c = filtered.filter(a => (String(a.status || '').toLowerCase() === 'cancelled') || (String(a.status || '').toLowerCase() === 'declined')).length

    return { 
      labels: ['Pending', 'Completed', 'Cancelled'], 
      datasets: [{ 
        data: [p, d, c], 
        backgroundColor: ['#fbbf24', '#3b82f6', '#ef4444'],
        borderWidth: 0,
        hoverOffset: 4
      }] 
    }
  }

  const contentClass = `admin-content ${activeItem === 'calendar' ? '' : 'full-width'}`

  return (
    <div className="admin-dashboard">
      <NavBar userType="admin" />
      <Toast show={showConfirm} type={confirmType} message={confirmMessage} onClose={() => setShowConfirm(false)} />
      <main className="admin-main">
        <div className="section-header">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Admin Dashboard</h1>
            <p className="section-subtitle">Manage appointments, availability, and view analytics</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="walk-in-btn" onClick={() => setShowWalkInModal(true)}>
              <UserPlus size={20} />
              <span>Walk-in</span>
            </button>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button className={`tab-btn-pill ${activeItem==='calendar' ? 'active' : ''}`} onClick={() => setActiveItem('calendar')}>Calendar</button>
              <button className={`tab-btn-pill ${activeItem==='analytics' ? 'active' : ''}`} onClick={() => setActiveItem('analytics')}>Analytics</button>
              <button className={`tab-btn-pill ${activeItem==='availability' ? 'active' : ''}`} onClick={() => setActiveItem('availability')}>Availability</button>
            </div>
          </div>
        </div>
        <div className="section-divider" />

        <div className="overview-panel">
          <div className="admin-stats grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="stat-card border-blue-500">
              <div className="stat-info">
                <div className="stat-label">This Week's Bookings</div>
                <div className="stat-value">{weeklyCount}</div>
              </div>
              <div className="stat-icon bg-blue-100 text-blue-600">
                <Calendar size={24} />
              </div>
            </div>
            <div className="stat-card border-yellow-500">
              <div className="stat-info">
                <div className="stat-label">Pending For approval</div>
                <div className="stat-value">{pendingCount}</div>
              </div>
              <div className="stat-icon bg-yellow-100 text-yellow-600">
                <Hourglass size={24} />
              </div>
            </div>
            <div className="stat-card border-green-500">
              <div className="stat-info">
                <div className="stat-label">Accomplished</div>
                <div className="stat-value">{doneCount}</div>
              </div>
              <div className="stat-icon bg-green-100 text-green-600">
                <CheckCircle size={24} />
              </div>
            </div>
            <div className="stat-card border-red-500">
              <div className="stat-info">
                <div className="stat-label">Cancelled</div>
                <div className="stat-value">{cancelledCount}</div>
              </div>
              <div className="stat-icon bg-red-100 text-red-600">
                <XCircle size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="admin-content-fullwidth">
          {activeItem === 'calendar' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Side: Calendar (Smaller and centered) */}
              <div className="lg:col-span-5 xl:col-span-4 flex justify-center lg:justify-start">
                <div className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 w-full max-w-[420px]">
                  <div className="flex items-center justify-between mb-6">
                    <button onClick={prevMonth} className="p-2 hover:bg-gray-50 rounded-xl transition-colors text-gray-400 hover:text-blue-600"><ChevronLeft size={20} /></button>
                    <div className="text-lg font-extrabold text-gray-900">{monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}</div>
                    <button onClick={nextMonth} className="p-2 hover:bg-gray-50 rounded-xl transition-colors text-gray-400 hover:text-blue-600"><ChevronRight size={20} /></button>
                  </div>
                  <div className="grid grid-cols-7 mb-4">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <span key={d} className="text-center text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">{d}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {blanks.map((_, i) => <div key={`b${i}`} className="aspect-square" />)}
                    {days.map(d => {
                      const dateObj = new Date(year, month, d)
                      const iso = localIso(dateObj)
                      const apptsForDay = appointments.filter(a => a.iso === iso)
                      const isSelected = selectedDate.getDate() === d && selectedDate.getMonth() === month && selectedDate.getFullYear() === year
                      
                      return (
                        <div
                          key={d}
                          className={`aspect-square flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all relative group ${
                            isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'hover:bg-gray-50 text-gray-600'
                          }`}
                          onClick={() => setSelectedDate(dateObj)}
                        >
                          <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-gray-700'}`}>{d}</span>
                          {apptsForDay.length > 0 && !isSelected && (
                            <div className="absolute bottom-1.5 flex gap-0.5">
                              {[...new Set(apptsForDay.map(a => getAppointmentStatusKey(a)))].slice(0, 3).map((s, idx) => (
                                <div key={idx} className={`w-1 h-1 rounded-full ${
                                  s === 'pending' || s === 'rescheduled' ? 'bg-yellow-400' : 
                                  (s === 'done' || s === 'completed') ? 'bg-blue-400' : 
                                  (s === 'cancelled' || s === 'declined') ? 'bg-red-400' : 'bg-green-400'
                                }`} />
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Right Side: Suggested - Daily Schedule & Quick Stats */}
              <div className="lg:col-span-7 xl:col-span-8 space-y-8">
                <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h3 className="text-2xl font-black text-gray-900">Schedule for Today</h3>
                      <p className="text-gray-400 font-bold text-sm mt-1">{selectedDate.toDateString()}</p>
                    </div>
                    <div className="flex gap-3">
                      <button className="text-blue-600 font-black hover:underline px-4 py-2 bg-blue-50 rounded-xl text-sm" onClick={() => setShowAllModal(true)}>View All Records</button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(() => {
                      const visible = appointments.filter(a => a.iso === selectedIso)
                      if (visible.length === 0) return (
                        <div className="col-span-full py-16 text-center bg-gray-50 rounded-[28px] border-2 border-dashed border-gray-100">
                          <div className="flex flex-col items-center gap-3">
                            <div className="p-4 bg-white rounded-2xl shadow-sm text-gray-300">
                              <Calendar size={32} />
                            </div>
                            <p className="text-gray-400 font-bold">No appointments for this day</p>
                          </div>
                        </div>
                      )
                      return visible.map(apt => (
                        <div key={apt.id} className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden" onClick={() => { setSelectedAppointment(apt); setDetailsOpen(true) }} style={{cursor:'pointer'}}>
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl">
                              <Clock size={14} className="text-gray-400" />
                              <span className="text-sm font-black text-gray-600">{apt.start || apt.time}</span>
                            </div>
                            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                              getAppointmentStatusKey(apt) === 'pending' || getAppointmentStatusKey(apt) === 'rescheduled' ? 'bg-yellow-50 text-yellow-600' :
                              (getAppointmentStatusKey(apt) === 'done' || getAppointmentStatusKey(apt) === 'completed') ? 'bg-blue-50 text-blue-600' :
                              (getAppointmentStatusKey(apt) === 'cancelled' || getAppointmentStatusKey(apt) === 'declined') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                            }`}>
                              {getAppointmentStatusLabel(apt)}
                            </span>
                          </div>
                          <div className="mb-1 text-lg font-black text-gray-900 group-hover:text-blue-600 transition-colors">{apt.name}</div>
                          <div className="text-sm font-bold text-gray-400">{apt.course || 'No Department'}</div>
                          <div className="absolute right-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight size={20} className="text-blue-600" />
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeItem === 'analytics' && (
            <div className="analytics-panel space-y-8">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
                  <button className={`px-6 py-2 rounded-lg font-bold transition-all ${analyticsTab==='history' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setAnalyticsTab('history')}>Record History</button>
                  <button className={`px-6 py-2 rounded-lg font-bold transition-all ${analyticsTab==='charts' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setAnalyticsTab('charts')}>Visual Reports</button>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  {/* Common Filters */}
                  <select 
                    value={filterDept} 
                    onChange={e=>setFilterDept(e.target.value)} 
                    className="px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-600 bg-white"
                  >
                    {getDepartments().map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
                  </select>

                  {analyticsTab === 'history' && (
                    <>
                  <div className="relative flex items-center">
                    <Search className="absolute left-4 text-gray-400" size={18} />
                    <input 
                      placeholder="Search student or reason..." 
                      value={searchQuery} 
                      onChange={e=>setSearchQuery(e.target.value)} 
                      className="pl-12 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-72 text-sm transition-all" 
                    />
                  </div>
                      <select 
                        value={filterStatus} 
                        onChange={e=>setFilterStatus(e.target.value)} 
                        className="px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-600 bg-white"
                      >
                        {statusOptions.map(s => <option key={s} value={s}>{s === 'All' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </>
                  )}

                  <div className="flex gap-2">
                    <button 
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-100 text-sm" 
                      onClick={()=>{ const rows = filteredAppointments(); downloadCSV(rows) }}
                    >
                      <FileDown size={18} />
                      Export CSV
                    </button>
                    <button 
                      className="flex items-center gap-2 px-4 py-2 bg-white text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-bold shadow-sm text-sm" 
                      onClick={()=>{ const rows = filteredAppointments(); exportPDF(rows) }}
                    >
                      <FileText size={18} />
                      Export PDF
                    </button>
                  </div>
                </div>
              </div>

              {analyticsTab === 'history' ? (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50">
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Date & Time</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Student Name</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Department</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Reason</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Status</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredAppointments().length === 0 ? (
                          <tr><td colSpan={6} className="py-24 text-center text-gray-400 font-bold bg-gray-50/30">No records found matching your filters</td></tr>
                        ) : filteredAppointments().map(a => (
                          <tr key={a.id} className="hover:bg-gray-50/80 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="text-sm font-black text-gray-900">{a.date || a.iso || ''}</div>
                              <div className="text-xs font-bold text-gray-400 mt-0.5">{a.start || a.time || ''}</div>
                            </td>
                            <td className="px-6 py-4 font-black text-gray-900 text-sm">{a.name}</td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1 bg-gray-100 rounded-lg text-xs font-black text-gray-500">{a.department || a.course || '—'}</span>
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-gray-600 truncate max-w-[200px]">{a.reason}</td>
                            <td className="px-6 py-4">
                              <span className={`sidebar-card-status status-text status-${getAppointmentStatusKey(a)}${isAppointmentOngoing(a) ? ' status-ongoing' : ''}`}>
                                {getAppointmentStatusLabel(a)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => { setSelectedAppointment(a); setDetailsOpen(true) }}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                              >
                                <MoreVertical size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-8 bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h4 className="text-xl font-black text-gray-900">Appointment Volume</h4>
                        <p className="text-sm font-bold text-gray-400 mt-1">Number of bookings across workdays</p>
                      </div>
                      <select value={chartRange} onChange={e=>setChartRange(e.target.value)} className="text-xs font-black text-gray-500 bg-gray-50 px-4 py-2 rounded-xl border-none focus:ring-0 uppercase tracking-widest">
                        <option value="weekly">This Week</option>
                        <option value="monthly">Full Year</option>
                      </select>
                    </div>
                    <div className="h-[350px]">
                      <Bar 
                        data={barChartData()} 
                        options={{ 
                          responsive:true, 
                          maintainAspectRatio:false, 
                          plugins:{legend:{display:false}}, 
                          scales:{ 
                            y:{ beginAtZero:true, ticks:{stepSize:1, font:{weight:'bold'}}, grid:{color:'#f8fafc'} }, 
                            x:{ grid:{display:false}, ticks:{font:{weight:'bold'}} } 
                          } 
                        }} 
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-4 bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col">
                    <h4 className="text-xl font-black text-gray-900 mb-2">Status Distribution</h4>
                    <p className="text-sm font-bold text-gray-400 mb-8">Breakdown of all appointment statuses</p>
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="h-[250px] relative">
                        <Pie 
                          data={pieChartData()} 
                          options={{ 
                            responsive:true, 
                            maintainAspectRatio:false, 
                            plugins:{
                              legend:{
                                position:'bottom', 
                                labels: { 
                                  usePointStyle: true, 
                                  padding: 25,
                                  font: { weight: 'bold', size: 11 }
                                } 
                              } 
                            } 
                          }} 
                        />
                      </div>
                      
                      <div className="mt-8 space-y-3">
                        {pieChartData().labels.map((label, idx) => (
                          <div key={label} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full" style={{backgroundColor: pieChartData().datasets[0].backgroundColor[idx]}} />
                              <span className="text-xs font-black text-gray-600 uppercase tracking-wider">{label}</span>
                            </div>
                            <span className="text-sm font-black text-gray-900">{pieChartData().datasets[0].data[idx]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeItem === 'availability' && (
            <div className="grid grid-cols-1 gap-8">
              <div className="availability-panel bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                      Office Hours
                      <div className="group relative">
                        <HelpCircle size={20} className="text-gray-400 cursor-help" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-64 p-4 bg-gray-900 text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                          Configure regular weekly consulting hours for each day. Students will see these slots during booking.
                        </div>
                      </div>
                    </h2>
                    <p className="text-gray-500 mt-1">Set recurring weekly availability for student consultations</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {['Monday','Tuesday','Wednesday','Thursday','Friday'].map(day => (
                    <div key={day} className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-blue-200 transition-colors group">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-gray-900 text-lg">{day}</h3>
                        <button 
                          onClick={() => { setScheduleDay(day); setScheduleOpen(true); setNewStart(''); setNewEnd(''); setNewDate(''); setNewType('') }}
                          className="p-1.5 bg-white text-blue-600 rounded-lg shadow-sm border border-gray-100 hover:bg-blue-50 transition-colors"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                      <div className="space-y-2">
                        {(availability[day] && availability[day].length) ? availability[day].map((r, i) => (
                          <div key={i} className="bg-white px-3 py-2 rounded-xl text-sm font-bold text-blue-700 shadow-sm border border-blue-50 flex items-center justify-center">
                            {r.start} - {r.end}
                          </div>
                        )) : (
                          <div className="py-4 text-center text-gray-400 text-sm font-medium border-2 border-dashed border-gray-200 rounded-2xl">
                            No slots
                          </div>
                        )}
                      </div>
                    </div>
                   ))}
                </div>
              </div>

              <div className="availability-panel bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                      Special Availability
                      <div className="group relative">
                        <HelpCircle size={20} className="text-gray-400 cursor-help" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-64 p-4 bg-gray-900 text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                          Override weekly hours for specific dates. Useful for holidays or special events.
                        </div>
                      </div>
                    </h2>
                    <p className="text-gray-500 mt-1">Manage one-time availability slots for specific dates</p>
                  </div>
                  <button 
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-100"
                    onClick={() => { setShowAddDatedModal(true); setNewDatedDate(''); setNewDatedType(''); setNewDatedStart(''); setNewDatedEnd('') }}
                  >
                    <Plus size={20} /> Add Special Slot
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {datedRows.length === 0 ? (
                    <div className="col-span-full py-12 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                      <p className="text-gray-400 font-medium">No special slots scheduled</p>
                    </div>
                  ) : datedRows.map(r => (
                    <div key={r.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="text-blue-600 font-bold text-sm uppercase tracking-wider mb-1">{r.day}</div>
                          <div className="text-gray-900 font-extrabold text-lg">
                            {isoToLocalDateString(r.date, { month: 'long', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                            onClick={() => {
                              setEditingAvailId(r.id)
                              setNewDatedDate(r.date || '')
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
                            }}
                          >
                            <FileText size={18} />
                          </button>
                          <button 
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            onClick={() => removeRange(r.day, (availability[r.day] || []).findIndex(x => x.id === r.id))}
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600 font-bold bg-gray-50 px-4 py-3 rounded-xl border border-gray-100">
                        <Clock size={18} className="text-blue-500" />
                        {r.start} - {r.end}
                      </div>
                      {r.type && (
                        <div className="mt-3 text-sm text-gray-500 italic px-1">
                          Reason: {r.type}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {detailsOpen && selectedAppointment && (
        <div className="details-modal-overlay" onClick={() => setDetailsOpen(false)}>
          <div className={`details-modal open bg-white`} onClick={(e) => e.stopPropagation()}>
            <div className="details-top flex justify-between items-start mb-8">
              <div className="details-main">
                  <h2 className="details-name text-4xl font-black mb-2">{selectedAppointment.name}</h2>
                  {(selectedAppointment.course || selectedAppointment.department) && (
                    <div className="details-course text-xl font-bold text-gray-500">{selectedAppointment.course || selectedAppointment.department}</div>
                  )}
                  <div className="details-id text-gray-400 font-bold mt-1">
                    {selectedAppointment.studentId ? `ID: ${selectedAppointment.studentId}` : selectedAppointment.guest ? 'Guest' : selectedAppointment.email}
                  </div>
                </div>
                {(() => {
                  const cls = `status-${getAppointmentStatusKey(selectedAppointment)}`
                  return (
                    <div className={`sidebar-card-status status-text ${cls}${isAppointmentOngoing(selectedAppointment) ? ' status-ongoing' : ''}`}>
                      {getAppointmentStatusLabel(selectedAppointment)}
                    </div>
                  )
                })()}
            </div>

            <div className="space-y-8">
              <div className="details-section">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Reason for Appointment</h3>
                <p className="text-lg text-gray-700 font-medium leading-relaxed">{selectedAppointment.reason}</p>
              </div>

              <div className="details-section">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Schedule Details</h3>
                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <Calendar className="text-blue-500" size={24} />
                  <div>
                    <div className="font-bold text-gray-900">{isoToLocalDateString(selectedAppointment.iso || selectedAppointment.date, { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                    <div className="text-gray-500 font-bold">{selectedAppointment.start || selectedAppointment.time} {selectedAppointment.end ? ` - ${selectedAppointment.end}` : ''}</div>
                  </div>
                </div>
              </div>

              {String(selectedAppointment.status || '').toLowerCase() === 'cancelled' && (
                <div className="details-section">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Cancellation Details</h3>
                  {(selectedAppointment.cancelReason || selectedAppointment.cancel_reason) ? (
                    <p className="text-lg text-gray-700 font-medium leading-relaxed">
                      <span className="font-bold">Reason: </span>
                      {selectedAppointment.cancelReason || selectedAppointment.cancel_reason}
                    </p>
                  ) : (
                    <p className="text-lg text-gray-700 font-medium leading-relaxed">No reason provided.</p>
                  )}
                  {(selectedAppointment.cancelled_by_name || selectedAppointment.cancelled_by || selectedAppointment.cancelledBy || selectedAppointment.cancelledByName) && (
                    <p className="text-sm text-gray-500 mt-2">
                      Cancelled by: {selectedAppointment.cancelled_by_name || selectedAppointment.cancelled_by || selectedAppointment.cancelledByName || selectedAppointment.cancelledBy}
                    </p>
                  )}
                  {(selectedAppointment.cancelled_at || selectedAppointment.cancelledAt) && (
                    <p className="text-sm text-gray-500 mt-1">
                      Cancelled at: {new Date(selectedAppointment.cancelled_at || selectedAppointment.cancelledAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {selectedAppointment.submittedAt && (
                <div className="details-section">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Submission Date</h3>
                  <p className="text-gray-600 font-bold">{new Date(selectedAppointment.submittedAt).toLocaleString()}</p>
                </div>
              )}
            </div>

            <div className="details-actions flex justify-end gap-4 mt-12 pt-8 border-t border-gray-100">
              <button className="close-btn" onClick={() => setDetailsOpen(false)}>Close</button>

              {/* Reschedule when cancelled by admin */}
              {String(selectedAppointment.status || '').toLowerCase() === 'cancelled' && (
                (() => {
                  const cancelledByVal = selectedAppointment.cancelled_by || selectedAppointment.cancelledBy || selectedAppointment.cancelledByName || selectedAppointment.cancelled_by_name || ''
                  const isAdminCancelled = String(cancelledByVal).toLowerCase() === 'admin'
                  return isAdminCancelled ? (
                    <button
                      className="reschedule-btn"
                      onClick={() => {
                        setRescheduleData({
                          date: selectedAppointment.iso || selectedAppointment.date || '',
                          start: selectedAppointment.start || selectedAppointment.time || '',
                          end: selectedAppointment.end || '',
                          reason: ''
                        })
                        setRescheduleOpen(true)
                      }}
                    >
                      Request Reschedule
                    </button>
                  ) : null
                })()
              )}

              {selectedAppointment.status === 'pending' && (
                <>
                  <button className="decline-btn" onClick={() => {
                    setDeclineReason('')
                    setDeclineReasonType('other')
                    setShowDeclineModal(true)
                  }}>Decline</button>
                  <button className="approve-btn" disabled={isApproving} onClick={async () => {
                    setIsApproving(true)
                    const res = await updateAppointmentStatus(selectedAppointment.id, 'approved', {}, true)
                    setIsApproving(false)

                    if (!res || !res.ok) {
                      setConfirmType('error')
                      setConfirmMessage(res?.error || 'Unable to approve appointment')
                      setShowConfirm(true)
                      return
                    }

                    setConfirmType('success')
                    setConfirmMessage('Appointment approved')
                    setShowConfirm(true)

                    setDetailsOpen(false)
                    refreshAppointments()
                  }}>{isApproving ? 'Approving...' : 'Approve'}</button>
                </>
              )}
              {isAppointmentOngoing(selectedAppointment) && selectedAppointment.status === 'approved' && (
                <button className="done-btn" onClick={async () => {
                  setIsCompleting(true)
                  const res = await updateAppointmentStatus(selectedAppointment.id, 'completed', {}, true)
                  setIsCompleting(false)

                  if (!res || !res.ok) {
                    setConfirmType('error')
                    setConfirmMessage(res?.error || 'Unable to mark appointment as done')
                    setShowConfirm(true)
                    return
                  }

                  setConfirmType('success')
                  setConfirmMessage('Appointment marked as completed')
                  setShowConfirm(true)

                  setDetailsOpen(false)
                  refreshAppointments()
                }}>Mark as Done</button>
              )}
            </div>
          </div>
        </div>
      )}

      {showAllModal && (
        <div className="details-modal-overlay" onClick={() => setShowAllModal(false)}>
          <div className="details-modal open bg-white rounded-[32px] p-10" onClick={(e) => e.stopPropagation()} style={{maxWidth:800}}>
            <h2 className="text-3xl font-black mb-8">Appointments for {selectedDate.toDateString()}</h2>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4">
              {appointments.filter(a => a.iso === selectedIso).map(a => (
                <div key={a.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center hover:border-blue-200 transition-all">
                  <div>
                    <div className="text-lg font-black text-gray-900">{a.name}</div>
                    <div className="text-gray-500 font-bold">{a.start || a.time} • {a.reason}</div>
                  </div>
                  <button className="text-blue-600 font-bold px-6 py-2 bg-white rounded-xl shadow-sm hover:shadow-md transition-all" onClick={() => { setSelectedAppointment(a); setDetailsOpen(true); setShowAllModal(false) }}>View</button>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-10">
              <button className="close-btn" onClick={() => setShowAllModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {showDeclineModal && selectedAppointment && (
        <ModalNoOverlay className="decline-modal" onClose={() => setShowDeclineModal(false)}>
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Cancel Appointment</h2>
            <p className="text-sm text-gray-600">Please provide a reason for canceling this appointment.</p>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">Reason type</label>
              <select
                value={declineReasonType}
                onChange={(e) => {
                  const value = e.target.value
                  setDeclineReasonType(value)
                  if (value === 'other') {
                    setDeclineReason('')
                  } else if (value === 'unavailable') {
                    setDeclineReason('Slot unavailable')
                  } else if (value === 'incomplete') {
                    setDeclineReason('Incomplete details')
                  } else if (value === 'policy') {
                    setDeclineReason('Against policy')
                  }
                }}
                className="w-full rounded-xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="other">Other</option>
                <option value="unavailable">Unavailable time</option>
                <option value="incomplete">Incomplete details</option>
                <option value="policy">Against policy</option>
              </select>
            </div>

            {declineReasonType === 'other' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">Reason</label>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="w-full h-24 resize-none rounded-xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Student did not respond, slot unavailable, etc."
                />
              </div>
            )}

            {declineError && <div className="text-sm text-red-600">{declineError}</div>}

            <div className="flex justify-end gap-3">
              <button className="close-btn" onClick={() => setShowDeclineModal(false)} type="button">Close</button>
              <button
                className="decline-btn"
                type="button"
                disabled={isDeclining}
                onClick={async () => {
                  setDeclineError('')
                  if (declineReasonType === 'other' && !declineReason.trim()) {
                    setDeclineError('Please enter a reason for cancellation.')
                    return
                  }
                  setIsDeclining(true)

                  // Ensure backend sees this as an admin cancellation
                  const res = await updateAppointmentStatus(selectedAppointment.id, 'cancelled', { cancelReason: declineReason, cancelled_by: 'admin' }, true)

                  if (!res || !res.ok) {
                    setConfirmType('error')
                    setConfirmMessage(res?.error || 'Unable to cancel appointment')
                    setShowConfirm(true)
                    setIsDeclining(false)
                    return
                  }

                  // Update UI optimistically to show admin as canceller
                  let adminName = null
                  try {
                    const raw = typeof window !== 'undefined' && localStorage.getItem('adminUser')
                    const parsed = raw ? JSON.parse(raw) : null
                    adminName = parsed ? (parsed.name || parsed.fullName || parsed.full_name || parsed.username) : null
                  } catch (e) {
                    adminName = null
                  }

                  setAppointments((prev) => prev.map((a) => a?.id === selectedAppointment?.id ? {
                    ...a,
                    status: 'cancelled',
                    cancelReason: declineReason,
                    cancelled_by: 'admin',
                    cancelled_by_name: adminName,
                    cancelled_at: new Date().toISOString()
                  } : a))

                  setSelectedAppointment((prev) => prev ? {
                    ...prev,
                    status: 'cancelled',
                    cancelReason: declineReason,
                    cancelled_by: 'admin',
                    cancelled_by_name: adminName,
                    cancelled_at: new Date().toISOString()
                  } : prev)

                  setConfirmType('cancelled')
                  setConfirmMessage('Appointment cancelled')
                  setShowConfirm(true)

                  setIsDeclining(false)
                  setShowDeclineModal(false)
                  setDetailsOpen(false)
                  refreshAppointments()
                }}
              >
                {isDeclining ? 'Cancelling...' : 'Confirm cancellation'}
              </button>
            </div>
          </div>
        </ModalNoOverlay>
      )}

      {rescheduleOpen && selectedAppointment && (
        <ModalNoOverlay className="reschedule-modal" onClose={() => setRescheduleOpen(false)}>
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Request Reschedule</h2>
            <p className="text-sm text-gray-600">Choose a new date and time for this appointment.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Date</label>
                <input
                  type="date"
                  value={rescheduleData.date}
                  onChange={(e) => setRescheduleData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-gray-50 border-gray-100 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Start Time</label>
                <input
                  type="time"
                  value={rescheduleData.start}
                  onChange={(e) => setRescheduleData(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full bg-gray-50 border-gray-100 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">End Time</label>
                <input
                  type="time"
                  value={rescheduleData.end}
                  onChange={(e) => setRescheduleData(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full bg-gray-50 border-gray-100 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Reason (optional)</label>
                <input
                  type="text"
                  value={rescheduleData.reason}
                  onChange={(e) => setRescheduleData(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full bg-gray-50 border-gray-100 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                  placeholder="Optional explanation for reschedule"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Email</label>
                <input
                  type="text"
                  value={selectedAppointment?.email || selectedAppointment?.guestEmail || ''}
                  readOnly
                  className="w-full bg-gray-100 border-gray-100 rounded-xl p-4 text-gray-600"
                />
              </div>
            </div>

            {rescheduleErrors.length > 0 && (
              <div className="text-sm text-red-600 space-y-1">
                {rescheduleErrors.map((err, idx) => (
                  <div key={idx}>{err}</div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                className="approve-btn"
                type="button"
                disabled={!rescheduleCanSend || rescheduleChecking}
                onClick={async () => {
                  const errs = []
                  if (!rescheduleData.date) errs.push('Please select a date.')
                  if (!rescheduleData.start) errs.push('Please select a start time.')
                  if (!rescheduleData.end) errs.push('Please select an end time.')
                  if (errs.length > 0) {
                    setRescheduleErrors(errs)
                    return
                  }

                  setRescheduleErrors([])
                  setRescheduleChecking(true)

                  const res = await requestReschedule(
                    selectedAppointment.id,
                    rescheduleData.date,
                    rescheduleData.start,
                    rescheduleData.end,
                    rescheduleData.reason,
                    selectedAppointment?.email || selectedAppointment?.guestEmail || ''
                  )
                  setRescheduleChecking(false)

                  if (!res || !res.ok) {
                    setConfirmType('error')
                    setConfirmMessage(res?.error || 'Unable to request reschedule')
                    setShowConfirm(true)
                    return
                  }

                  setConfirmType('success')
                  setConfirmMessage('Reschedule requested')
                  setShowConfirm(true)

                  setRescheduleOpen(false)
                  setDetailsOpen(false)
                  refreshAppointments()
                }}
              >
                {rescheduleChecking ? 'Sending...' : 'Send Request'}
              </button>
              <button
                className="close-btn"
                type="button"
                onClick={() => setRescheduleOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </ModalNoOverlay>
      )}


      {scheduleOpen && (
        <div className="details-modal-overlay" onClick={() => { setScheduleOpen(false); setScheduleErrors({}); }}>
          <div className="details-modal open bg-white rounded-[32px] p-10" onClick={e => e.stopPropagation()} style={{maxWidth:600}}>
            <h2 className="text-3xl font-black mb-2">Set Schedule</h2>
            <p className="text-blue-600 font-bold uppercase tracking-widest mb-8">{scheduleDay}</p>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Start Time</label>
                  <input type="time" value={newStart} onChange={e => setNewStart(e.target.value)} className={`w-full bg-gray-50 border-gray-100 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold ${scheduleErrors.start ? 'border-red-500' : ''}`} />
                  {scheduleErrors.start && <p className="text-red-500 text-xs mt-1 font-bold">{scheduleErrors.start}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">End Time</label>
                  <input type="time" value={newEnd} onChange={e => setNewEnd(e.target.value)} className={`w-full bg-gray-50 border-gray-100 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold ${scheduleErrors.end ? 'border-red-500' : ''}`} />
                  {scheduleErrors.end && <p className="text-red-500 text-xs mt-1 font-bold">{scheduleErrors.end}</p>}
                </div>
              </div>
              {scheduleErrors.general && <p className="text-red-500 text-sm font-bold text-center">{scheduleErrors.general}</p>}
              <button className="approve-btn w-full py-4" onClick={addRange}>Save Schedule</button>
              <button className="close-btn w-full py-4" onClick={() => { setScheduleOpen(false); setScheduleErrors({}); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showAddDatedModal && (
        <div className="details-modal-overlay" onClick={() => { setShowAddDatedModal(false); setDatedErrors({}); }}>
          <div className="details-modal open bg-white rounded-[32px] p-10" onClick={e => e.stopPropagation()} style={{maxWidth:600}}>
            <h2 className="text-3xl font-black mb-8">Add Special Slot</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Date</label>
                <input type="date" value={newDatedDate} onChange={e => setNewDatedDate(e.target.value)} className={`w-full bg-gray-50 border-gray-100 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold ${datedErrors.date ? 'border-red-500' : ''}`} />
                {datedErrors.date && <p className="text-red-500 text-xs mt-1 font-bold">{datedErrors.date}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Start Time</label>
                  <input type="time" value={newDatedStart} onChange={e => setNewDatedStart(e.target.value)} className={`w-full bg-gray-50 border-gray-100 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold ${datedErrors.start ? 'border-red-500' : ''}`} />
                  {datedErrors.start && <p className="text-red-500 text-xs mt-1 font-bold">{datedErrors.start}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">End Time</label>
                  <input type="time" value={newDatedEnd} onChange={e => setNewDatedEnd(e.target.value)} className={`w-full bg-gray-50 border-gray-100 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold ${datedErrors.end ? 'border-red-500' : ''}`} />
                  {datedErrors.end && <p className="text-red-500 text-xs mt-1 font-bold">{datedErrors.end}</p>}
                </div>
              </div>
              {datedErrors.general && <p className="text-red-500 text-sm font-bold text-center">{datedErrors.general}</p>}
              <button className="approve-btn w-full py-4" onClick={saveDatedSlot}>Save Special Slot</button>
              <button className="close-btn w-full py-4" onClick={() => { setShowAddDatedModal(false); setDatedErrors({}); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showWalkInModal && (
        <WalkInModal onClose={() => setShowWalkInModal(false)} onSubmit={handleWalkInSubmit} />
      ) }

      {showCreateUser && (
        <NewUserModal onClose={() => setShowCreateUser(false)} onCreate={handleCreateUser} />
      )}
    </div>
  )
}
