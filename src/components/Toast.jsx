import { useEffect } from 'react'
import './Toast.css'

const VARIANT = {
  success: {
    bg: 'bg-emerald-50/80 border-emerald-200',
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-700'
  },
  error: {
    bg: 'bg-rose-50/80 border-rose-200',
    iconBg: 'bg-rose-100',
    iconText: 'text-rose-700'
  },
  cancelled: {
    bg: 'bg-rose-50/80 border-rose-200',
    iconBg: 'bg-rose-100',
    iconText: 'text-rose-700'
  },
  info: {
    bg: 'bg-sky-50/80 border-sky-200',
    iconBg: 'bg-sky-100',
    iconText: 'text-sky-700'
  }
}

export default function Toast({ show, type = 'info', message = '', duration = 3000, onClose }) {
  useEffect(() => {
    if (!show) return
    const id = setTimeout(() => {
      onClose && onClose()
    }, duration)
    return () => clearTimeout(id)
  }, [show, duration, onClose])

  if (!show) return null

  const icon = (type === 'success' || type === 'cancelled') ? '✓' : type === 'error' ? '✕' : 'ℹ'
  const variant = VARIANT[type] || VARIANT.info

  return (
    <div className="toast-container" role="status" aria-live="polite">
      <div
        className={`toast-root ${variant.bg} ${variant.border} border`} 
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${variant.iconBg} ${variant.iconText} text-lg font-semibold`}>{icon}</div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">{message}</p>
          </div>
          <button
            className="text-slate-500 hover:text-slate-700 transition"
            onClick={() => onClose && onClose()}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}
