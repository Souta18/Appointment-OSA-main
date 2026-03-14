import { useEffect } from 'react'
import './Toast.css'

export default function Toast({ show, type = 'info', message = '', duration = 3000, onClose }) {
  useEffect(() => {
    if (!show) return
    const id = setTimeout(() => {
      onClose && onClose()
    }, duration)
    return () => clearTimeout(id)
  }, [show, duration, onClose])

  if (!show) return null

  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'

  return (
    <div className={`toast-root toast-${type}`} role="status" aria-live="polite">
      <div className="toast-inner">
        <div className="toast-icon">{icon}</div>
        <div className="toast-body">
          <div className="toast-message">{message}</div>
        </div>
        <button className="toast-close" onClick={() => onClose && onClose()} aria-label="Close notification">×</button>
      </div>
    </div>
  )
}
