import { cx } from '../../lib/format'

const TONES = {
  neutral: 'bg-secondary-soft text-secondary',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  brand: 'bg-primary-soft text-primary',
}

/**
 * Always pass visible text: colour is never the only signal.
 * @param {{ tone?: keyof TONES, icon?: React.ComponentType<{className?: string}>, children: React.ReactNode, className?: string }} props
 */
export default function Badge({ tone = 'neutral', icon: Icon, children, className }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {Icon && <Icon className="size-3.5" aria-hidden="true" />}
      {children}
    </span>
  )
}
