import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cx } from '../../lib/format'

const TONES = {
  info: { cls: 'bg-info-soft border-info/30 text-info', icon: Info },
  success: { cls: 'bg-success-soft border-success/30 text-success', icon: CheckCircle2 },
  warning: { cls: 'bg-warning-soft border-warning/30 text-warning', icon: AlertTriangle },
  danger: { cls: 'bg-danger-soft border-danger/30 text-danger', icon: XCircle },
}

/**
 * danger alerts use role="alert" (announced immediately); others use role="status".
 * @param {{ tone?: keyof TONES, title?: string, children?: React.ReactNode, className?: string }} props
 */
export default function Alert({ tone = 'info', title, children, className }) {
  const { cls, icon: Icon } = TONES[tone]
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cx('flex gap-3 rounded-lg border p-3.5', cls, className)}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="grid gap-0.5 text-sm">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-ink">{children}</div>}
      </div>
    </div>
  )
}
