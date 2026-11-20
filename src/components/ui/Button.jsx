import { Link } from 'react-router'
import { cx } from '../../lib/format'
import Spinner from './Spinner'

const VARIANTS = {
  primary: 'bg-primary text-white hover:bg-primary-hover border-transparent',
  secondary: 'bg-surface text-secondary border-line-strong hover:bg-secondary-soft',
  dark: 'bg-secondary text-white hover:bg-secondary-hover border-transparent',
  ghost: 'bg-transparent text-secondary border-transparent hover:bg-secondary-soft',
  danger: 'bg-surface text-danger border-danger hover:bg-danger-soft',
}

/**
 * Min height is 44px (WCAG 2.5.5 touch target) for every size.
 * @param {{ variant?: keyof VARIANTS, size?: 'md'|'lg', loading?: boolean, block?: boolean, as?: 'button'|'link', to?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>} props
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  block = false,
  as = 'button',
  to,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}) {
  const cls = cx(
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border font-semibold transition-[background-color,transform] enabled:active:scale-[0.98]',
    'disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60',
    size === 'lg' ? 'px-6 text-base' : 'px-4 text-sm',
    block && 'w-full',
    VARIANTS[variant],
    className,
  )

  if (as === 'link') {
    return (
      <Link to={to} className={cls} {...rest}>
        {children}
      </Link>
    )
  }

  return (
    <button type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <Spinner size="sm" label="" />}
      {children}
    </button>
  )
}
