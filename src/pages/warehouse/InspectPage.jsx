import { useState } from 'react'
import { Info } from 'lucide-react'
import Alert from '../../components/ui/Alert'
import { STATUS_LABEL } from '../../domain/returnStatus'
import { formatINR } from '../../lib/format'
import ScanBox from './ScanBox'
import InspectionForm from './InspectionForm'

// After an inspection the backend returns the return's new status. Refunds up to ₹10,000 are paid
// straight away, so the status may already be REFUNDED.
const OUTCOME = {
  AWAITING_FINANCE: { tone: 'info', title: 'Sent to finance, over ₹10,000' },
  REFUND_IN_PROGRESS: { tone: 'success', title: 'Refund processing' },
  REFUNDED: { tone: 'success', title: 'Refund paid' },
  REJECTED: { tone: 'warning', title: 'Return rejected, no refund due' },
}

const NOT_INSPECTABLE = {
  APPROVED: 'The customer hasn’t shipped it yet.',
  PENDING_REVIEW: 'It is still waiting for a manager’s review.',
}

export default function InspectPage() {
  const [ret, setRet] = useState(null)
  const [loadId, setLoadId] = useState(0) // remounts the form with fresh state after each load or reload
  const [outcome, setOutcome] = useState(null)
  const [focusSignal, setFocusSignal] = useState(0)

  const load = (r) => {
    setRet(r)
    setLoadId((n) => n + 1)
  }

  // After a return is finished, show the outcome and put the cursor back in the scan box.
  function done(result) {
    setOutcome({ ...result, returnId: ret.returnId })
    setRet(null)
    setFocusSignal((n) => n + 1)
  }

  const o = outcome && (OUTCOME[outcome.outcome] ?? OUTCOME.REFUND_IN_PROGRESS)

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold">Inspect returns</h1>
        <p className="text-muted">Scan a label to start. You can grade and decide entirely from the keyboard.</p>
      </header>

      <ScanBox
        focusSignal={focusSignal}
        onLoaded={(r) => {
          setOutcome(null)
          load(r)
        }}
      />

      {o && (
        <Alert tone={o.tone} title={o.title} className="animate-fade-up">
          <span className="font-mono">{outcome.returnId}</span>
          {outcome.outcome !== 'REJECTED' && <> · refund {formatINR(outcome.refundPaise)}</>}
          {outcome.refundStatus === 'UNKNOWN' && <> · the payment gateway is slow, so finance will see it if it doesn’t settle</>}
          {outcome.refundStatus === 'FAILED' && <> · the payment failed, finance can retry it</>}. Scan the next return when you’re ready.
        </Alert>
      )}

      {ret && ret.status === 'RECEIVED' && (
        <InspectionForm key={`${ret.returnId}:${loadId}`} ret={ret} onDone={done} onReload={load} />
      )}

      {ret && ret.status !== 'RECEIVED' && (
        <Alert tone="info" title="Nothing to inspect">
          <span className="inline-flex items-center gap-1"><Info className="size-4" aria-hidden="true" /></span>{' '}
          Return <span className="font-mono">{ret.returnId}</span> is “{STATUS_LABEL[ret.status] ?? ret.status}”.{' '}
          {NOT_INSPECTABLE[ret.status] ?? ''} Scan another label to continue.
        </Alert>
      )}
    </div>
  )
}
