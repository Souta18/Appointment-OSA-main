import { useState, useEffect } from 'react'
import './Sidebar.css'

export default function Sidebar({ activeItem, onSelect }) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    // close on small screens by default
    if (window.innerWidth < 640) setCollapsed(true)
  }, [])

  const items = [
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'availability', label: 'Availability', icon: '⏱' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'register-visit', label: 'Register Visit', icon: '➕' }
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
          <span className="chev">{collapsed ? '»' : '«'}</span>
        </button>
      </div>
    </aside>
  )
}
