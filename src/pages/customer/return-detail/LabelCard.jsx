import { Clock, Printer, TriangleAlert } from 'lucide-react'
import Card from '../../../components/ui/Card'
import Alert from '../../../components/ui/Alert'
import Button from '../../../components/ui/Button'
import Spinner from '../../../components/ui/Spinner'
import { useReturnLabel } from '../../../api/hooks'
import { daysUntil, formatDate } from '../../../lib/format'

function ExpiryNotice({ expiresAt }) {
  const days = daysUntil(expiresAt)
  if (days < 0) {
    return <Alert tone="danger" title="This label has expired">It expired on {formatDate(expiresAt)}. Contact support and we’ll issue a new one.</Alert>
  }
  if (days <= 3) {
    return (
      <Alert tone="warning" title={days === 0 ? 'Expires today' : `Expires in ${days} ${days === 1 ? 'day' : 'days'}`}>
        Ship your parcel by {formatDate(expiresAt)}, or the label stops working.
      </Alert>
    )
  }
  return <p className="flex items-center gap-1.5 text-sm text-muted"><Clock className="size-4" aria-hidden="true" />Valid until {formatDate(expiresAt)}</p>
}

/** Return label with QR code. Only the element with .print-label is printed. */
export default function LabelCard({ returnId, status }) {
  const ready = status === 'APPROVED' || status === 'IN_TRANSIT'
  const { data, isPending, isError } = useReturnLabel(returnId, ready)

  if (status === 'REQUESTED') {
    return (
      <Card className="grid gap-1 animate-fade-up" aria-labelledby="label-h">
        <h2 id="label-h" className="font-semibold">Return label</h2>
        <p className="text-sm text-muted">Your label appears here as soon as your return is approved.</p>
      </Card>
    )
  }
  if (!ready) return null

  return (
    <Card className="print-label grid gap-4 animate-fade-up" aria-labelledby="label-h">
      <h2 id="label-h" className="font-semibold">Return label</h2>

      {isPending && <div className="flex items-center gap-2 py-6 text-muted"><Spinner label="" /> Preparing your label…</div>}

      {isError && (
        <Alert tone="warning" title="We can’t show your label right now">
          <span className="inline-flex items-center gap-1"><TriangleAlert className="size-4" aria-hidden="true" /></span> Refresh the page in a moment. If it keeps happening, contact support.
        </Alert>
      )}

      {data && (
        <>
          <div className="grid justify-items-center gap-3 rounded-lg border border-dashed border-line-strong p-4 text-center">
            <img
              src={`data:image/png;base64,${data.qrPngBase64}`}
              alt={`QR code for label ${data.labelNumber}`}
              width={176}
              height={176}
              className="size-44 [image-rendering:pixelated]"
            />
            <div>
              <p className="text-xs font-medium tracking-wide text-muted uppercase">Label number</p>
              <p className="font-mono text-lg font-medium">{data.labelNumber}</p>
            </div>
            <p className="max-w-[16rem] text-sm text-muted">Attach this label to your parcel, or show the QR code at the courier counter.</p>
          </div>
          <ExpiryNotice expiresAt={data.expiresAt} />
          <Button variant="secondary" onClick={() => window.print()} className="print:hidden">
            <Printer className="size-4" aria-hidden="true" /> Print label
          </Button>
        </>
      )}
    </Card>
  )
}
