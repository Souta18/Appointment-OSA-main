import { useState, useEffect } from 'react'
import { Calendar, BarChart2, Settings, LogOut, ChevronsLeft, ChevronsRight, UserPlus } from 'lucide-react'
import './Sidebar.css'

export default function Sidebar({ activeItem, onSelect }) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    // close on small screens by default
    if (window.innerWidth < 640) setCollapsed(true)
  }, [])

  const items = [
    { id: 'calendar', label: 'Calendar', icon: <Calendar /> },
    { id: 'availability', label: 'Availability', icon: <Settings /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart2 /> },
    { id: 'register-visit', label: 'Walk-in', icon: <UserPlus /> }
  ]

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : 'expanded'}`}>
      <div className="sidebar-inner">
        <div className="sidebar-top" />
        <nav className="sidebar-nav">
          {items.map(it => (
            <button
              key={it.id}
              className={`sidebar-item ${activeItem === it.id ? 'active' : ''}`}
              onClick={() => onSelect && onSelect(it.id)}
              title={it.label}
            >
              <span className="sidebar-icon">{it.icon}</span>
              <span className="sidebar-label">{it.label}</span>
            </button>
          ))}
        </nav>
        <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle sidebar">
          {collapsed ? <ChevronsRight /> : <ChevronsLeft />}
        </button>
      </div>
    </aside>
  )
}
