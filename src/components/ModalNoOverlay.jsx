import './ModalNoOverlay.css'

export default function ModalNoOverlay({ children, onClose }) {
  return (
    <div className="modal-no-overlay" role="dialog" aria-modal="true">
      <div className="modal-no-overlay__content">
        <button className="modal-no-overlay__close" onClick={onClose} aria-label="Close">×</button>
        {children}
      </div>
    </div>
  )
}
