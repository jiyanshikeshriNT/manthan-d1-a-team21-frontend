import { useEffect, useRef, useState } from 'react'
import { ScanLine } from 'lucide-react'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Kbd from '../../components/ui/Kbd'
import { useScan } from '../../api/staff'

const MESSAGE = {
  RETURN_NOT_FOUND: 'No return matches that code. Check the label and scan it again.',
}

/**
 * Scan input for a QR scanner in keyboard-wedge mode (types the token, then Enter) or a pasted token.
 * It takes focus on load and whenever `focusSignal` changes, i.e. after each completed return.
 * @param {{ onLoaded: (ret: import('../../api/staff').WarehouseReturn) => void, focusSignal: number }} props
 */
export default function ScanBox({ onLoaded, focusSignal }) {
  const ref = useRef(null)
  const [value, setValue] = useState('')
  const scan = useScan()

  // A new focusSignal means a return was completed: clear the field and focus it again.
  const [seenSignal, setSeenSignal] = useState(focusSignal)
  if (seenSignal !== focusSignal) {
    setSeenSignal(focusSignal)
    setValue('')
  }
  useEffect(() => {
    ref.current?.focus()
  }, [focusSignal])

  // After a failed scan, keep the text selected so the next scan replaces it.
  useEffect(() => {
    if (scan.isError) {
      ref.current?.focus()
      ref.current?.select()
    }
  }, [scan.isError, scan.failureCount, scan.submittedAt])

  function submit(e) {
    e.preventDefault()
    const token = value.trim()
    if (!token || scan.isPending) return
    scan.mutate(token, {
      onSuccess: (ret) => {
        setValue('')
        onLoaded(ret)
      },
    })
  }

  const error = scan.error && (MESSAGE[scan.error.code] ?? scan.error.message)

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-line bg-surface p-4 shadow-card sm:p-5" aria-label="Scan a return">
      <label htmlFor="scan-input" className="flex items-center gap-2 font-semibold">
        <ScanLine className="size-5 text-primary" aria-hidden="true" /> Scan return label
      </label>
      <p id="scan-hint" className="text-sm text-muted">
        Scan the QR code, or paste the label token, then press <Kbd>Enter</Kbd>.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="scan-input"
          ref={ref}
          autoFocus
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-describedby={error ? 'scan-hint scan-error' : 'scan-hint'}
          aria-invalid={error ? true : undefined}
          placeholder="RET-2026-04901"
          className="min-h-12 w-full flex-1 rounded-lg border border-line-strong bg-surface px-3 font-mono text-lg placeholder:text-muted focus:border-accent aria-invalid:border-danger"
        />
        <Button type="submit" size="lg" loading={scan.isPending} disabled={!value.trim()}>
          {scan.isPending ? 'Looking up…' : 'Load return'}
        </Button>
      </div>
      {error && (
        <div id="scan-error">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}
    </form>
  )
}
