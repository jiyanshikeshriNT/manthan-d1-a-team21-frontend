import { useSyncExternalStore } from 'react'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { dismissToast, getToasts, subscribeToasts } from './toastStore'
import { cx } from '../../lib/format'

const ICON = { success: CheckCircle2, danger: XCircle, info: Info }
const TONE = { success: 'text-success', danger: 'text-danger', info: 'text-info' }

export default function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts)

  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
    >
      {toasts.map((t) => {
        const Icon = ICON[t.tone]
        return (
          <div
            key={t.id}
            role={t.tone === 'danger' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-surface p-4 shadow-pop"
          >
            <Icon className={cx('mt-0.5 size-5 shrink-0', TONE[t.tone])} aria-hidden="true" />
            <div className="grid flex-1 gap-0.5 text-sm">
              <p className="font-semibold text-ink">{t.title}</p>
              {t.description && <p className="text-muted">{t.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="-m-2 grid size-11 shrink-0 place-items-center rounded-lg text-muted hover:bg-secondary-soft"
              aria-label="Dismiss notification"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
