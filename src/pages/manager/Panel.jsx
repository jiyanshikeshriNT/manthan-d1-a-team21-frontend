import { AlertTriangle, Inbox, RotateCw } from 'lucide-react'
import Button from '../../components/ui/Button'
import Skeleton from '../../components/ui/Skeleton'
import { cx } from '../../lib/format'

export function PanelError({ onRetry, compact }) {
  return (
    <div role="alert" className={cx('grid justify-items-start gap-3', compact ? 'py-1' : 'py-6')}>
      <p className="flex items-start gap-2 text-sm">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
        <span><strong className="font-semibold">Couldn’t load this data.</strong> <span className="text-muted">Check your connection and try again.</span></span>
      </p>
      <Button variant="secondary" onClick={onRetry}>
        <RotateCw className="size-4" aria-hidden="true" /> Try again
      </Button>
    </div>
  )
}

export function PanelEmpty({ title, text }) {
  return (
    <div className="grid justify-items-center gap-2 py-10 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-secondary-soft text-secondary">
        <Inbox className="size-5" aria-hidden="true" />
      </span>
      <p className="font-semibold">{title}</p>
      {text && <p className="max-w-xs text-sm text-muted">{text}</p>}
    </div>
  )
}

export function ChartSkeleton({ rows = 5 }) {
  return (
    <div className="grid gap-3 py-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="grid grid-cols-[7rem_1fr] items-center gap-3">
          <Skeleton className="h-3.5" />
          <Skeleton className="h-5" style={{ width: `${90 - i * 14}%` }} />
        </div>
      ))}
    </div>
  )
}

/**
 * Dashboard card with title, optional actions and the four states: loading, error, empty, ready.
 * @param {{ id: string, title: string, description?: string, actions?: React.ReactNode, isPending: boolean, isError: boolean,
 *   onRetry: () => void, isEmpty?: boolean, empty?: { title: string, text?: string }, skeleton?: React.ReactNode,
 *   className?: string, children?: React.ReactNode }} props
 */
export default function Panel({ id, title, description, actions, isPending, isError, onRetry, isEmpty, empty, skeleton, className, children }) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      aria-busy={isPending || undefined}
      className={cx('grid content-start gap-4 rounded-xl border border-line bg-surface p-5 shadow-card animate-fade-up sm:p-6', className)}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-0.5">
          <h2 id={`${id}-title`} className="font-semibold">{title}</h2>
          {description && <p className="text-sm text-muted">{description}</p>}
        </div>
        {!isPending && !isError && !isEmpty && actions}
      </header>
      {isPending ? (
        <>
          <span className="sr-only">Loading {title.toLowerCase()}…</span>
          {skeleton ?? <ChartSkeleton />}
        </>
      ) : isError ? (
        <PanelError onRetry={onRetry} />
      ) : isEmpty ? (
        <PanelEmpty {...empty} />
      ) : (
        children
      )}
    </section>
  )
}
