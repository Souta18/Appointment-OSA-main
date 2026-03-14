import { useState, useEffect } from 'react'
import NavBar from '../components/NavBar'
import { Bar, Pie } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)
import Sidebar from '../components/Sidebar'
import WalkInModal from '../components/WalkInModal'
import NewUserModal from '../components/NewUserModal'
import './AdminDashboard.css'
import { listAppointments, updateAppointmentStatus, createAppointment as apiCreateAppointment, listAvailability, addAvailability, deleteAvailability, updateAvailability } from '../api'

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
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [showAllModal, setShowAllModal] = useState(false)
  const [showWalkInModal, setShowWalkInModal] = useState(false)
  const [availability, setAvailability] = useState({ Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] })
  const [showAddDatedModal, setShowAddDatedModal] = useState(false)
  const [newDatedDate, setNewDatedDate] = useState('')
  const [newDatedType, setNewDatedType] = useState('')
  const [newDatedStart, setNewDatedStart] = useState('')
  const [newDatedEnd, setNewDatedEnd] = useState('')
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

  const prevMonth = () => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))
  const nextMonth = () => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))

  const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate()
  const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const blanks = Array(firstDay).fill(null)
  const year = selectedDate.getFullYear()
  const month = selectedDate.getMonth()
  const selectedIso = selectedDate.toISOString().slice(0,10)

  const refreshAppointments = async () => {
    try {
      const res = await listAppointments()
      if (res && res.ok) {
        setAppointments(Array.isArray(res.data) ? res.data : [])
      } else {
        setAppointments([])
      }
    } catch (e) {
      setAppointments([])
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

  // flatten dated availability entries for rendering
  const datedRows = Object.entries(availability).flatMap(([day, arr]) => {
    return (arr || []).filter(r => r && r.date).map(r => ({ day, ...r }))
  })

  // helper: parse appointment date+time into a Date
  const parseAppointmentStart = (a) => {
    try {
      const datePart = a.iso || (a.date ? (new Date(a.date)).toISOString().slice(0,10) : '')
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
        const iso = apt.iso || (apt.date ? (() => {
          const d = new Date(apt.date)
          if (isNaN(d)) return ''
          return d.toISOString().slice(0,10)
        })() : '')
        if (!iso) return false
        const todayIso = (new Date()).toISOString().slice(0,10)
        if (iso !== todayIso) return false
        const startMin = toMinutes(apt.start || apt.time || '')
        const endMin = toMinutes(apt.end || '') || (startMin !== null ? startMin + 30 : null)
        if (startMin === null || endMin === null) return false
        const now = new Date()
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

  // listen for global event dispatched by NavBar when admin clicks "Create User"
  useEffect(() => {
    const onOpen = () => setShowCreateUser(true)
    window.addEventListener('admin:create-user', onOpen)
    return () => window.removeEventListener('admin:create-user', onOpen)
  }, [])

  const handleWalkInSubmit = async (payload) => {
    const now = new Date()
    let iso = now.toISOString().slice(0,10)
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
  const cancelledCount = appointments.filter(a => a.status === 'cancelled' || a.status === 'declined').length

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
    if (!newDatedDate) return
    try {
      const d = new Date(newDatedDate)
      if (isNaN(d)) return
      const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()]
      const start = newDatedStart || ''
      const end = newDatedEnd || ''
      await addAvailability(dayName, start, end, newDatedDate, newDatedType)
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
          const aptIso = (a.iso || (a.date ? (new Date(a.date)).toISOString().slice(0,10) : ''))
          if (!aptIso || aptIso !== (new Date(isoDate)).toISOString().slice(0,10)) continue
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
            await updateAppointmentStatus(a.id, 'cancelled')
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
        const iso = a.iso || (a.date ? (new Date(a.date)).toISOString().slice(0,10) : '')
        if (!iso || iso < fromDateFilter) return false
      }
      if (toDateFilter) {
        const iso = a.iso || (a.date ? (new Date(a.date)).toISOString().slice(0,10) : '')
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
      const iso = a.iso || (a.date ? (new Date(a.date)).toISOString().slice(0,10) : '')
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
      const iso = a.iso || (a.date ? (new Date(a.date)).toISOString().slice(0,10) : '')
      if (!iso) return
      const d = new Date(iso)
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
      labels: Object.keys(map),
      datasets: [{ data: Object.values(map), backgroundColor: ['#2b6cb0','#48bb78','#f6ad55','#f56565','#a0aec0'] }]
    }
  }

  // Render action buttons for the details modal (keeps JSX here simpler)
  const renderDetailsActions = () => {
    if (!selectedAppointment) return null
    const status = selectedAppointment.status

    if (status === 'pending') {
      return (
        <>
          <button className="decline-btn" onClick={() => { setDeclineReason(''); setShowDeclineModal(true) }}>Decline</button>
          <button className="approve-btn" onClick={() => {
            setIsApproving(true)
            updateAppointmentStatus(selectedAppointment.id, 'approved').then(() => {
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
      if (selectedAppointment.adminNote === 'Cancelled by student') return null
      return (
        <>
          <button className="reschedule-open-btn" onClick={() => { setRescheduleData({ date: '', start: '', end: '', reason: '' }); setRescheduleOpen(true) }}>Reschedule</button>
          <button className="close-btn" onClick={() => { setDetailsOpen(false); setSelectedAppointment(null) }}>Close</button>
        </>
      )
    }

    if (isAppointmentOngoing(selectedAppointment)) {
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
              await updateAppointmentStatus(optimisticallyDone.id, 'completed')
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
                const iso = dateObj.toISOString().slice(0,10)
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
                    {getDepartments().map(d=> <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{padding:8, borderRadius:8}}>
                    <option>All</option>
                    <option>pending</option>
                    <option>approved</option>
                    <option>confirmed</option>
                    <option>done</option>
                    <option>cancelled</option>
                    <option>declined</option>
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
                            : a.status === 'cancelled' ? 'Cancelled'
                            : a.status === 'declined' ? 'Declined'
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
                          <div style={{flex:1, fontWeight:700}}>{k}</div>
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
                  apt.status === 'confirmed' ? 'status-confirmed'
                  : apt.status === 'approved' ? 'status-approved'
                  : apt.status === 'pending' ? 'status-pending'
                  : apt.status === 'rescheduled' ? 'status-rescheduled'
                  : (apt.status === 'done' || apt.status === 'completed') ? 'status-done'
                  : apt.status === 'cancelled' ? 'status-cancelled'
                  : 'status-declined'
                }`}>
                <div className="sidebar-card-meta">
                  <span className="sidebar-card-time-meta">{(() => {
                    // Prefer a timestamp (id as epoch or submittedAt) to show when action happened
                    const maybeTs = (typeof apt.id === 'number' && apt.id > 1000000000) ? new Date(apt.id) : (apt.submittedAt ? new Date(apt.submittedAt) : null)
                    const now = new Date()
                    const timeStr = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

                    if (maybeTs) {
                      if (maybeTs.toDateString() === now.toDateString()) {
                        return `Today at ${timeStr(maybeTs)}`
                      }
                      return `${maybeTs.toLocaleDateString()} at ${timeStr(maybeTs)}`
                    }

                    
                    if (apt.start) {
                      // if appointment is today, show 'Today at ...'
                      const aptDate = apt.iso || ''
                      const todayIso = new Date().toISOString().slice(0,10)
                      if (aptDate === todayIso) return `Today at ${apt.start}`
                      return `${apt.date ? apt.date + ' at ' : ''}${apt.start}`
                    }

                    if (apt.time) {
                      const aptDate = apt.iso || ''
                      const todayIso = new Date().toISOString().slice(0,10)
                      if (aptDate === todayIso) return `Today at ${apt.time}`
                      return `${apt.date ? apt.date + ' at ' : ''}${apt.time}`
                    }

                    return apt.date || ''
                  })()}</span>
                  <span className={`sidebar-card-status status-text ${
                    apt.status === 'confirmed' ? 'status-confirmed'
                    : apt.status === 'approved' ? 'status-approved'
                    : apt.status === 'pending' ? 'status-pending'
                    : apt.status === 'rescheduled' ? 'status-rescheduled'
                    : (apt.status === 'done' || apt.status === 'completed') ? 'status-done'
                    : apt.status === 'cancelled' ? 'status-cancelled'
                    : 'status-declined'
                  }${isAppointmentOngoing(apt) ? ' status-ongoing' : ''}`}>
                    {
                        (apt.status === 'confirmed') ? (isAppointmentOngoing(apt) ? 'Ongoing' : 'Rescheduled')
                        : (apt.status === 'approved') ? (isAppointmentOngoing(apt) ? 'Ongoing' : 'Approved')
                        : (apt.status === 'pending') ? 'For Approval'
                        : (apt.status === 'rescheduled') ? 'Rescheduled'
                        : (apt.status === 'done' || apt.status === 'completed') ? <span className="status-text status-completed">Completed</span>
                        : (apt.status === 'declined') ? 'Declined'
                        : 'Cancelled'
                      }
                  </span>
                </div>

                <div className="sidebar-card-left">
                  <div className="sidebar-card-icon">🕗</div>
                  <div className="sidebar-card-time-left">{apt.start || ''}{apt.start && apt.end ? ' - ' + apt.end : ''}</div>
                </div>

                <div className="sidebar-card-info">
                  <div className="sidebar-card-name">{apt.name}</div>
                  {apt.course && <div className="sidebar-card-course">{apt.course}</div>}

                  {/* Identifier: student ID, role (alumni/teaching), guest, or email */}
                  {apt.studentId ? (
                    <div className="sidebar-card-identifier">Student ID: {apt.studentId}</div>
                  ) : apt.role ? (
                    <div className="sidebar-card-identifier">{apt.role}</div>
                  ) : apt.guest ? (
                    <div className="sidebar-card-identifier">Guest</div>
                  ) : apt.email ? (
                    <div className="sidebar-card-identifier">{apt.email}</div>
                  ) : null}

                </div>

                <span onClick={() => { setSelectedAppointment(apt); setDetailsOpen(true) }} className="sidebar-view" style={{cursor:'pointer'}}>View Details</span>
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
                        <div style={{fontWeight:500}}>{r.day} — {r.start} to {r.end}</div>
                      </div>
                      <div style={{display:'flex', gap:8, alignItems:'center'}}>
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
                          <input type="date" value={newDatedDate} onChange={e => setNewDatedDate(e.target.value)} style={{width:'100%', padding:12, borderRadius:8, border:'1px solid #e6e6e6'}} />
                        </div>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:12}}>
                          <div>
                            <label style={{display:'block', marginBottom:6}}>Start time</label>
                            <input type="time" value={newDatedStart} onChange={e => setNewDatedStart(e.target.value)} style={{width:'100%', padding:12, borderRadius:8, border:'1px solid #e6e6e6'}} />
                          </div>
                          <div>
                            <label style={{display:'block', marginBottom:6}}>End time</label>
                            <input type="time" value={newDatedEnd} onChange={e => setNewDatedEnd(e.target.value)} style={{width:'100%', padding:12, borderRadius:8, border:'1px solid #e6e6e6'}} />
                          </div>
                        </div>
                        <div style={{marginTop:12}}>
                          <label style={{display:'block', marginBottom:6}}>Type — e.g. One-time, Exam, Office hours</label>
                          <input type="text" value={newDatedType} onChange={e => setNewDatedType(e.target.value)} placeholder="e.g. One-time, Exam, Office hours" style={{width:'100%', padding:12, borderRadius:8, border:'1px solid #e6e6e6'}} />
                        </div>
                        <div style={{display:'flex', justifyContent:'flex-end', gap:12, marginTop:14}}>
                          <button className="close-btn" onClick={() => setShowAddDatedModal(false)}>Cancel</button>
                          <button className="approve-btn" onClick={saveDatedSlot}>Save</button>
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
                      <div className="details-id">{selectedAppointment.studentId}</div>
                    ) : selectedAppointment.guest ? (
                      <div className="details-id">Guest</div>
                    ) : selectedAppointment.email ? (
                      <div className="details-id">{selectedAppointment.email}</div>
                    ) : null}
                  </div>

                  <div className={`details-status status-text ${
                  selectedAppointment.status === 'confirmed' ? 'status-confirmed'
                  : selectedAppointment.status === 'approved' ? 'status-approved'
                  : selectedAppointment.status === 'pending' ? 'status-pending'
                  : selectedAppointment.status === 'rescheduled' ? 'status-rescheduled'
                  : (selectedAppointment.status === 'done' || selectedAppointment.status === 'completed') ? 'status-done'
                  : selectedAppointment.status === 'cancelled' ? 'status-cancelled'
                  : 'status-declined'
                }${isAppointmentOngoing(selectedAppointment) ? ' status-ongoing' : ''}`}>
                    {
                      selectedAppointment.status === 'confirmed' ? (isAppointmentOngoing(selectedAppointment) ? 'Ongoing' : 'Rescheduled')
                      : selectedAppointment.status === 'approved' ? (isAppointmentOngoing(selectedAppointment) ? 'Ongoing' : 'Approved')
                      : selectedAppointment.status === 'pending' ? 'For Approval'
                      : selectedAppointment.status === 'rescheduled' ? 'Rescheduled'
                      : (selectedAppointment.status === 'done' || selectedAppointment.status === 'completed') ? <span className="status-text status-completed">Completed</span>
                      : selectedAppointment.status === 'declined' ? 'Declined'
                      : 'Cancelled'
                    }
                  </div>
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

              {selectedAppointment.status === 'cancelled' && selectedAppointment.cancelReason && (
                <div className="details-section">
                  <h3>Cancellation reason:</h3>
                  <p>{selectedAppointment.cancelReason}</p>
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

                <div style={{display:'flex', justifyContent:'flex-end', gap:12, marginTop:18}}>
                <button className="close-btn" onClick={() => setRescheduleOpen(false)}>Back</button>
                <button className="approve-btn" onClick={async () => {
                  // Call backend to apply and approve reschedule
                  try {
                    await updateAppointmentStatus(selectedAppointment.id, 'confirmed', { rescheduleDate: rescheduleData.date, rescheduleStart: rescheduleData.start, rescheduleEnd: rescheduleData.end, rescheduleReason: rescheduleData.reason, approveReschedule: true })
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
              <p>Please provide a reason for declining (optional)</p>
              <div style={{marginTop:12}}>
                <textarea value={declineReason} onChange={e => setDeclineReason(e.target.value)} placeholder="Reason for declining (optional)" style={{width:'100%', minHeight:100, padding:12, borderRadius:8, border:'1px solid #e6e6e6'}} />
              </div>
              <div style={{display:'flex', justifyContent:'flex-end', gap:12, marginTop:14}}>
                <button className="close-btn" onClick={() => setShowDeclineModal(false)}>Back</button>
                <button className="decline-btn" onClick={async () => {
                  const reason = (declineReason || '').trim()
                  try {
                    // mark as cancelled on the server and attach the optional cancel reason
                    await updateAppointmentStatus(selectedAppointment.id, 'cancelled', { cancelReason: reason, adminNote: reason })
                  } catch (e) { /* ignore */ }
                  try {
                    const raw = localStorage.getItem('notifications')
                    const arr = raw ? JSON.parse(raw) : []
                    const msgReason = reason ? ` Reason: ${reason}` : ''
                    arr.unshift({ id: Date.now(), appointmentId: selectedAppointment.id, title: 'Appointment cancelled', message: `Your appointment on ${selectedAppointment.date || selectedAppointment.iso} was cancelled by the admin.${msgReason}`, createdAt: Date.now(), read: false, email: selectedAppointment.email || selectedAppointment.studentEmail, studentId: selectedAppointment.studentId, target: 'student' })
                    localStorage.setItem('notifications', JSON.stringify(arr))
                  } catch (e) {}
                  // update local UI to cancelled with cancelReason for immediate feedback
                  setAppointments(prev => prev.map(a => a.id === selectedAppointment.id ? { ...a, status: 'cancelled', cancelReason: reason, adminNote: reason } : a))
                  setSelectedAppointment(prev => ({ ...prev, status: 'cancelled', cancelReason: reason, adminNote: reason }))
                  setShowDeclineModal(false)
                  setDetailsOpen(false)
                  setSelectedAppointment(null)
                  refreshAppointments()
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
            setActiveItem(id)
            return
          }
          setActiveItem(id)
        }} />
        {showWalkInModal && (
          <WalkInModal onClose={() => setShowWalkInModal(false)} onSubmit={(p) => { handleWalkInSubmit(p); setShowWalkInModal(false) }} />
        )}
      </main>
    </div>
  )
}
