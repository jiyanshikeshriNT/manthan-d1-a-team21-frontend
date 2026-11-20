import { useState } from 'react'
import { Info } from 'lucide-react'
import Alert from '../../components/ui/Alert'
import { STATUS_LABEL } from '../../domain/returnStatus'
import { formatINR } from '../../lib/format'
import ScanBox from './ScanBox'
import InspectionForm from './InspectionForm'

const OUTCOME = {
  PENDING_FINANCE: { tone: 'info', title: 'Sent to finance, over ₹10,000' },
  REFUND_PROCESSING: { tone: 'success', title: 'Refund processing' },
  REJECTED: { tone: 'warning', title: 'Return rejected, no refund due' },
}

export default function InspectPage() {
  const [ret, setRet] = useState(null)
  const [outcome, setOutcome] = useState(null)
  const [focusSignal, setFocusSignal] = useState(0)

  // After a return is finished, show the outcome and put the cursor back in the scan box.
  function done(result) {
    setOutcome({ ...result, returnId: ret.returnId })
    setRet(null)
    setFocusSignal((n) => n + 1)
  }

  const o = outcome && (OUTCOME[outcome.outcome] ?? OUTCOME.REFUND_PROCESSING)

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
          setRet(r)
        }}
      />

      {o && (
        <Alert tone={o.tone} title={o.title} className="animate-fade-up">
          <span className="font-mono">{outcome.returnId}</span>
          {outcome.outcome !== 'REJECTED' && <> · refund {formatINR(outcome.refundPaise)}</>}. Scan the next return when you’re ready.
        </Alert>
      )}

      {ret && ret.status === 'RECEIVED' && (
        <InspectionForm
          key={`${ret.returnId}:${ret.version}`}
          ret={ret}
          onDone={done}
          onReload={setRet}
        />
      )}

      {ret && ret.status !== 'RECEIVED' && (
        <Alert tone="info" title="Nothing left to inspect">
          <span className="inline-flex items-center gap-1"><Info className="size-4" aria-hidden="true" /></span>{' '}
          Return <span className="font-mono">{ret.returnId}</span> is now “{STATUS_LABEL[ret.status] ?? ret.status}”. Scan another label to continue.
        </Alert>
      )}
    </div>
  )
}
