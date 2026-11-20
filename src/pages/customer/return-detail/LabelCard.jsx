import { useEffect, useMemo } from 'react'
import { Printer, TriangleAlert } from 'lucide-react'
import Card from '../../../components/ui/Card'
import Alert from '../../../components/ui/Alert'
import Button from '../../../components/ui/Button'
import Spinner from '../../../components/ui/Spinner'
import { useReturnLabel } from '../../../api/hooks'
import { STATUS } from '../../../domain/returnStatus'

/** Object URL for the QR PNG, revoked when the image changes or the card unmounts. */
function useObjectUrl(blob) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob])
  useEffect(() => () => url && URL.revokeObjectURL(url), [url])
  return url
}

/** Return label with its signed QR code. Only the element with .print-label is printed. */
export default function LabelCard({ returnId, status }) {
  const ready = status === STATUS.APPROVED || status === STATUS.IN_TRANSIT
  const { data, isPending, isError } = useReturnLabel(returnId, ready)
  const qrUrl = useObjectUrl(data?.qrPng)

  if (status === STATUS.REQUESTED || status === STATUS.PENDING_REVIEW) {
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
            {qrUrl && (
              <img
                src={qrUrl}
                alt={`QR code for label ${data.labelCode}`}
                width={176}
                height={176}
                className="size-44 [image-rendering:pixelated]"
              />
            )}
            <div>
              <p className="text-xs font-medium tracking-wide text-muted uppercase">Label code</p>
              <p className="font-mono text-sm font-medium break-all">{data.labelCode}</p>
            </div>
            <p className="max-w-[16rem] text-sm text-muted">{data.instructions}</p>
          </div>
          <Button variant="secondary" onClick={() => window.print()} className="print:hidden">
            <Printer className="size-4" aria-hidden="true" /> Print label
          </Button>
        </>
      )}
    </Card>
  )
}
