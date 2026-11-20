import Skeleton from '../../components/ui/Skeleton'
import { PanelError } from './Panel'
import { cx } from '../../lib/format'

/**
 * Headline number. The label is in text, the value is large ink text, and any status uses an icon plus words.
 * @param {{ label: string, value: React.ReactNode, detail?: React.ReactNode, icon: React.ComponentType<{className?: string}>,
 *   tone?: 'neutral'|'warning', isPending: boolean, isError: boolean, onRetry: () => void, delay?: number }} props
 */
export default function KpiCard({ label, value, detail, icon: Icon, tone = 'neutral', isPending, isError, onRetry, delay = 0 }) {
  return (
    <div
      aria-busy={isPending || undefined}
      className="grid content-start gap-3 rounded-xl border border-line bg-surface p-5 shadow-card animate-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-muted">{label}</h2>
        <span className={cx('grid size-9 place-items-center rounded-lg', tone === 'warning' ? 'bg-warning-soft text-warning' : 'bg-primary-soft text-primary')}>
          <Icon className="size-[18px]" aria-hidden="true" />
        </span>
      </div>
      {isPending ? (
        <>
          <span className="sr-only">Loading</span>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3.5 w-44" />
        </>
      ) : isError ? (
        <PanelError onRetry={onRetry} compact />
      ) : (
        <>
          <p className="text-3xl font-semibold tracking-tight tabular" data-testid={`kpi-${label}`}>{value}</p>
          {detail && <p className="text-sm text-muted">{detail}</p>}
        </>
      )}
    </div>
  )
}
