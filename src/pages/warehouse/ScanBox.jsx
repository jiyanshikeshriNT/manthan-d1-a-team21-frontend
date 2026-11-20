import { useEffect, useId, useRef, useState } from 'react'
import { Camera, ScanLine } from 'lucide-react'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Kbd from '../../components/ui/Kbd'
import { useDecodeLabel, useScan } from '../../api/staff'

const MESSAGE = {
  RETURN_NOT_FOUND: 'No return matches that code. Check the label and scan it again.',
  INVALID_TRANSITION: 'This parcel can’t be received yet: the customer hasn’t marked it as shipped, or the return was closed.',
}

/**
 * Scan input for a QR scanner in keyboard-wedge mode (types the label code, then Enter), a pasted label
 * code or a typed RMA number. A photo of the label can be uploaded instead; the server decodes the QR.
 * It takes focus on load and whenever `focusSignal` changes, i.e. after each completed return.
 * @param {{ onLoaded: (ret: import('../../api/staff').WarehouseReturn) => void, focusSignal: number }} props
 */
export default function ScanBox({ onLoaded, focusSignal }) {
  const ref = useRef(null)
  const fileId = useId()
  const [value, setValue] = useState('')
  const scan = useScan()
  const decode = useDecodeLabel()
  const pending = scan.isPending || decode.isPending

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

  const loaded = (ret) => {
    setValue('')
    onLoaded(ret)
  }

  function submit(e) {
    e.preventDefault()
    const code = value.trim()
    if (!code || pending) return
    decode.reset()
    scan.mutate(code, { onSuccess: loaded })
  }

  function pickPhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || pending) return
    scan.reset()
    decode.mutate(file, { onSuccess: loaded })
  }

  const failed = scan.error ?? decode.error
  const error = failed && (MESSAGE[failed.code] ?? failed.message)

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-line bg-surface p-4 shadow-card sm:p-5" aria-label="Scan a return">
      <label htmlFor="scan-input" className="flex items-center gap-2 font-semibold">
        <ScanLine className="size-5 text-primary" aria-hidden="true" /> Scan return label
      </label>
      <p id="scan-hint" className="text-sm text-muted">
        Scan the QR code, paste the label code or type the RMA number, then press <Kbd>Enter</Kbd>. In-transit parcels are marked as received.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="scan-input"
          ref={ref}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-describedby={error ? 'scan-hint scan-error' : 'scan-hint'}
          aria-invalid={error ? true : undefined}
          placeholder="RR-RMA-100001-1a2b3c4d"
          className="min-h-12 w-full flex-1 rounded-lg border border-line-strong bg-surface px-3 font-mono text-lg placeholder:text-muted focus:border-accent aria-invalid:border-danger"
        />
        <Button type="submit" size="lg" loading={scan.isPending} disabled={!value.trim() || pending}>
          {scan.isPending ? 'Looking up…' : 'Load return'}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <span>No scanner?</span>
        <label
          htmlFor={fileId}
          className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-2 font-medium text-secondary hover:bg-secondary-soft focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent"
        >
          <Camera className="size-4" aria-hidden="true" />
          {decode.isPending ? 'Reading the label…' : 'Upload a photo of the label'}
          <input id={fileId} type="file" accept="image/jpeg,image/png" onChange={pickPhoto} disabled={pending} className="sr-only" />
        </label>
      </div>
      {error && (
        <div id="scan-error">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}
    </form>
  )
}
