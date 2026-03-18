import './ModalNoOverlay.css'

export default function ModalNoOverlay({ children, onClose, className = '' }) {
  return (
    <div className="modal-no-overlay" role="dialog" aria-modal="true">
      <div className={`modal-no-overlay__content ${className}`}>
        <button className="modal-no-overlay__close" onClick={onClose} aria-label="Close">×</button>
        {children}
      </div>
    </div>
  )
}
