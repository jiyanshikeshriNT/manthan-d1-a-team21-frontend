import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Kbd from '../../components/ui/Kbd'
import { fetchWarehouseReturn, useInspect } from '../../api/staff'
import { FINANCE_APPROVAL_THRESHOLD_INR, FINANCE_APPROVAL_THRESHOLD_PAISE } from '../../domain/returnStatus'
import { formatINR } from '../../lib/format'
import { refundTotal } from '../../lib/refund'
import ItemInspection from './ItemInspection'
import PhotoLightbox from './PhotoLightbox'

const CONFLICT = {
  STALE_VERSION:
    'Someone else changed this return while you were inspecting it. Reload it to see the latest details, then inspect it again.',
  ILLEGAL_TRANSITION:
    'This return can’t be inspected in its current state, for example because it was already inspected. Reload it to see where it stands.',
}

const GRADE_KEYS = { 1: 'A', 2: 'B', 3: 'C' }
const DECISION_KEYS = { a: 'ACCEPT', p: 'PARTIAL', r: 'REJECT' }

function validate(items, lines) {
  const errors = {}
  for (const item of items) {
    const l = lines[item.returnItemId]
    const e = {}
    if (!l.decision) e.decision = 'Choose accept, partial or reject.'
    if (l.decision && l.decision !== 'REJECT' && !l.grade) e.grade = 'Choose a grade.'
    if (l.decision === 'PARTIAL') {
      const n = Number(l.acceptedQty)
      if (!Number.isInteger(n) || n < 1 || n > item.quantity - 1) e.acceptedQty = `Enter a whole number from 1 to ${item.quantity - 1}.`
    }
    if (Object.keys(e).length) errors[item.returnItemId] = e
  }
  return errors
}

/**
 * Keyboard-first inspection. Keys act on the item row that has focus:
 *   1 / 2 / 3 = grade A / B / C     a / p / r = accept / partial / reject     Ctrl+Enter = submit
 * @param {{ ret: import('../../api/staff').WarehouseReturn, onDone: (r: import('../../api/staff').InspectionResult) => void,
 *   onReload: (r: import('../../api/staff').WarehouseReturn) => void }} props
 */
export default function InspectionForm({ ret, onDone, onReload }) {
  const inspect = useInspect()
  const [lines, setLines] = useState(() =>
    Object.fromEntries(ret.items.map((i) => [i.returnItemId, { grade: '', decision: '', acceptedQty: '' }])),
  )
  const [showErrors, setShowErrors] = useState(false)
  const [error, setError] = useState(null)
  const [reloading, setReloading] = useState(false)
  const [photo, setPhoto] = useState(null)
  const activeRow = useRef(ret.items[0].returnItemId)
  const inFlight = useRef(false) // blocks a second submit before React re-renders the disabled button
  const formRef = useRef(null)

  // The agent has just scanned, so move focus to the first grade button: keys 1-3 and a/p/r work at once.
  useEffect(() => {
    formRef.current?.querySelector('input[type=radio]:not(:disabled)')?.focus()
  }, [])

  const errors = showErrors ? validate(ret.items, lines) : {}
  const total = refundTotal(ret.items, lines)
  const pending = inspect.isPending

  const setLine = (id, patch) => setLines((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))

  function submit() {
    if (inFlight.current) return
    setShowErrors(true)
    const found = validate(ret.items, lines)
    if (Object.keys(found).length) {
      // Bring the error summary into view once it has rendered.
      setTimeout(() => formRef.current?.querySelector('[role=alert]')?.scrollIntoView?.({ block: 'center' }), 0)
      return
    }
    inFlight.current = true
    setError(null)
    inspect.mutate(
      {
        returnId: ret.returnId,
        version: ret.version,
        items: ret.items.map((i) => {
          const l = lines[i.returnItemId]
          return {
            returnItemId: i.returnItemId,
            grade: l.grade || null,
            decision: l.decision,
            ...(l.decision === 'PARTIAL' && { acceptedQty: Number(l.acceptedQty) }),
          }
        }),
      },
      {
        onSuccess: onDone,
        onError: (e) => {
          inFlight.current = false
          setError(e)
        },
      },
    )
  }

  function onKeyDown(e) {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault()
      submit()
      return
    }
    if (e.ctrlKey || e.altKey || e.metaKey) return
    const t = e.target
    if (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && t.type !== 'radio')) return // typing a quantity

    const id = activeRow.current
    const item = ret.items.find((i) => i.returnItemId === id)
    const key = e.key.toLowerCase()
    if (GRADE_KEYS[key]) {
      e.preventDefault()
      setLine(id, { grade: GRADE_KEYS[key] })
    } else if (DECISION_KEYS[key]) {
      e.preventDefault()
      const decision = DECISION_KEYS[key]
      if (decision === 'PARTIAL' && item.quantity < 2) return
      setLine(id, { decision, ...(decision !== 'PARTIAL' && { acceptedQty: '' }) })
    }
  }

  async function reload() {
    setReloading(true)
    try {
      onReload(await fetchWarehouseReturn(ret.returnId))
    } catch (e) {
      setError(e)
      setReloading(false)
    }
  }

  const conflict = error && CONFLICT[error.code]
  const errorCount = Object.keys(errors).length
  const needsFinance = total > FINANCE_APPROVAL_THRESHOLD_PAISE

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      onKeyDown={onKeyDown}
      noValidate
      aria-label={`Inspect return ${ret.returnId}`}
      className="grid gap-5 animate-fade-up"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold">
          Return <span className="font-mono">{ret.returnId}</span>
        </h2>
        <p className="text-sm text-muted">
          Order <span className="font-mono">{ret.orderNumber}</span> · {ret.items.length} {ret.items.length === 1 ? 'item' : 'items'}
        </p>
      </header>

      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-surface px-4 py-3 text-sm text-muted ring-1 ring-line">
        <span>Grade <Kbd>1</Kbd> <Kbd>2</Kbd> <Kbd>3</Kbd></span>
        <span>Decision <Kbd>A</Kbd> <Kbd>P</Kbd> <Kbd>R</Kbd></span>
        <span>Submit <Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd></span>
      </p>

      {conflict && (
        <Alert tone="danger" title={error.code === 'STALE_VERSION' ? 'This return changed' : 'This return can’t be inspected now'}>
          <p>{conflict}</p>
          <Button variant="secondary" className="mt-3" onClick={reload} loading={reloading}>Reload return</Button>
        </Alert>
      )}
      {error && !conflict && <Alert tone="danger" title="We couldn’t save the inspection">{error.message} Your entries are kept, so you can submit again.</Alert>}
      {errorCount > 0 && <Alert tone="danger" title={`Complete ${errorCount} ${errorCount === 1 ? 'item' : 'items'} to continue`} />}

      <fieldset disabled={pending || reloading} className="contents">
        <ul className="grid gap-4">
          {ret.items.map((item) => (
            <ItemInspection
              key={item.returnItemId}
              item={item}
              line={lines[item.returnItemId]}
              errors={errors[item.returnItemId]}
              onChange={setLine}
              onFocusRow={(id) => (activeRow.current = id)}
              onOpenPhoto={setPhoto}
            />
          ))}
        </ul>
      </fieldset>

      <section aria-label="Refund preview" className="sticky bottom-0 -mx-4 grid gap-3 border-t border-line bg-surface/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:shadow-card">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-semibold">Refund preview</span>
          <strong className="text-2xl tabular" data-testid="refund-total" aria-live="polite">{formatINR(total)}</strong>
        </div>
        <p className="text-sm text-muted">
          {needsFinance
            ? `Over ${formatINR(FINANCE_APPROVAL_THRESHOLD_INR * 100)}: this will be sent to finance for approval.`
            : 'Refunds up to ₹10,000 are paid automatically. Grade C is refunded at 50%.'}
        </p>
        <Button type="submit" size="lg" block loading={pending}>
          {pending ? 'Saving inspection…' : (<>Submit inspection <Send className="size-4" aria-hidden="true" /></>)}
        </Button>
      </section>

      <PhotoLightbox photo={photo} onClose={() => setPhoto(null)} />
    </form>
  )
}
