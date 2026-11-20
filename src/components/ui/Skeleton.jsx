import { cx } from '../../lib/format'

/** Grey placeholder block. Hidden from assistive tech: the panel announces "Loading" instead. */
export default function Skeleton({ className, style }) {
  return <span aria-hidden="true" style={style} className={cx('block animate-pulse rounded-md bg-secondary-soft', className)} />
}
