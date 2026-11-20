import { useId } from 'react'
import { AlertCircle } from 'lucide-react'
import { cx } from '../../lib/format'

const control =
  'block w-full min-h-11 rounded-lg border bg-surface px-3 text-[15px] text-ink placeholder:text-muted ' +
  'transition-colors focus:border-accent disabled:bg-secondary-soft disabled:text-muted'

/**
 * Label + control + hint + error, wired with aria-describedby / aria-invalid.
 * @param {{ label: string, hint?: string, error?: string, optional?: boolean, id?: string, className?: string,
 *   children: (a: { id: string, 'aria-describedby'?: string, 'aria-invalid'?: boolean, className: string }) => React.ReactNode }} props
 */
export function Field({ label, hint, error, optional, id, className, children }) {
  const auto = useId()
  const fieldId = id ?? auto
  const hintId = hint ? `${fieldId}-hint` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cx('grid gap-1.5', className)}>
      <label htmlFor={fieldId} className="text-sm font-medium text-ink">
        {label}
        {optional && <span className="font-normal text-muted"> (optional)</span>}
      </label>
      {hint && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {children({
        id: fieldId,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        className: cx(control, error ? 'border-danger' : 'border-line-strong'),
      })}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm font-medium text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}

export function Input({ label, hint, error, optional, id, className, ...rest }) {
  return (
    <Field {...{ label, hint, error, optional, id, className }}>
      {(p) => <input {...p} {...rest} />}
    </Field>
  )
}

export function Select({ label, hint, error, optional, id, className, children, ...rest }) {
  return (
    <Field {...{ label, hint, error, optional, id, className }}>
      {(p) => (
        <select {...p} {...rest} className={cx(p.className, 'appearance-auto pr-8')}>
          {children}
        </select>
      )}
    </Field>
  )
}

export function Textarea({ label, hint, error, optional, id, className, ...rest }) {
  return (
    <Field {...{ label, hint, error, optional, id, className }}>
      {(p) => <textarea rows={3} {...p} {...rest} className={cx(p.className, 'py-2.5')} />}
    </Field>
  )
}
