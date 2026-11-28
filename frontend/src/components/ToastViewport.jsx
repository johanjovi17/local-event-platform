import { useEffect } from 'react'

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    const timeout = window.setTimeout(() => onDismiss(toast.id), 4000)
    return () => window.clearTimeout(timeout)
  }, [toast.id, onDismiss])

  return (
    <div
      className="toast"
      role="status"
    >
      <span>{toast.message}</span>
      <button
        className="toast-dismiss"
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  )
}

function ToastViewport({ toasts, onDismiss }) {
  if (toasts.length === 0) return null

  return (
    <div className="toast-viewport" aria-label="Notifications">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

export default ToastViewport
