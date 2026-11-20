import { useEffect, useRef } from 'react'
import { cx } from '../../lib/format'

const VARIANT = {
  center: 'm-auto max-h-[90dvh] w-[min(92vw,52rem)] rounded-xl animate-pop-in',
  drawer: 'fixed inset-y-0 right-0 m-0 h-dvh max-h-none w-full max-w-xl rounded-none animate-slide-in',
}

/**
 * Native <dialog>: focus is trapped, Esc closes, and focus returns to the opener.
 * Children mount only while open.
 * @param {{ open: boolean, onClose: () => void, label: string, variant?: 'center'|'drawer', className?: string, children: React.ReactNode }} props
 */
export default function Modal({ open, onClose, label, variant = 'center', className, children }) {
  const ref = useRef(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      try {
        d.showModal()
      } catch {
        d.setAttribute('open', '') // environments without showModal
      }
    } else if (!open && d.open) {
      d.close?.()
      d.removeAttribute('open')
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cx(
        'overflow-y-auto bg-surface p-0 text-ink shadow-pop backdrop:bg-ink/50',
        VARIANT[variant],
        className,
      )}
    >
      {open && children}
    </dialog>
  )
}
