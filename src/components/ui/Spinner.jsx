import { cx } from '../../lib/format'

/** @param {{ size?: 'sm'|'md'|'lg', label?: string, className?: string }} props  label="" hides it from screen readers */
export default function Spinner({ size = 'md', label = 'Loading', className }) {
  const px = { sm: 'size-4', md: 'size-6', lg: 'size-8' }[size]
  return (
    <span role={label ? 'status' : undefined} className={cx('inline-flex items-center', className)}>
      <svg className={cx(px, 'animate-spin')} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label && <span className="sr-only">{label}</span>}
    </span>
  )
}
