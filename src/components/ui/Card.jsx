import { cx } from '../../lib/format'

/** @param {{ as?: React.ElementType, padded?: boolean, className?: string, children: React.ReactNode }} props */
export default function Card({ as: Tag = 'section', padded = true, className, children, ...rest }) {
  return (
    <Tag className={cx('rounded-xl border border-line bg-surface shadow-card', padded && 'p-5 sm:p-6', className)} {...rest}>
      {children}
    </Tag>
  )
}
