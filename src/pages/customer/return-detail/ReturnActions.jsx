import { useRef, useState } from 'react'
import { Ban, Truck } from 'lucide-react'
import Card from '../../../components/ui/Card'
import Alert from '../../../components/ui/Alert'
import Button from '../../../components/ui/Button'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys, useCancelReturn, useShipReturn } from '../../../api/hooks'
import { STATUS, canTransition } from '../../../domain/returnStatus'

/**
 * Customer actions offered only where the state machine allows them:
 * "I've shipped it" (APPROVED → IN_TRANSIT) and "Cancel return" (before the parcel is shipped).
 */
export default function ReturnActions({ ret }) {
  const qc = useQueryClient()
  const ship = useShipReturn()
  const cancel = useCancelReturn()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const inFlight = useRef(false)

  const canShip = canTransition(ret.status, STATUS.IN_TRANSIT)
  const canCancel = canTransition(ret.status, STATUS.CANCELLED)
  if (!canShip && !canCancel) return null

  const pending = ship.isPending || cancel.isPending
  const error = ship.error ?? cancel.error

  function run(mutation) {
    if (inFlight.current) return
    inFlight.current = true
    mutation.mutate(ret.returnId, {
      // A conflict means the return moved on (e.g. the warehouse received it): show the latest status.
      onError: () => qc.invalidateQueries({ queryKey: queryKeys.return(ret.returnId) }),
      onSettled: () => {
        inFlight.current = false
        setConfirmCancel(false)
      },
    })
  }

  return (
    <Card className="grid gap-4 animate-fade-up print:hidden" aria-labelledby="actions-h">
      <h2 id="actions-h" className="font-semibold">What’s next</h2>

      {error && (
        <Alert tone="danger" title="That didn’t work">
          {error.code === 'INVALID_TRANSITION' ? 'Your return has moved on since this page loaded. It now shows the latest status.' : error.message}
        </Alert>
      )}

      {canShip && (
        <div className="grid gap-2">
          <p className="text-sm text-muted">Dropped your parcel at the courier? Let us know so we can watch for it.</p>
          <Button onClick={() => run(ship)} loading={ship.isPending} disabled={pending}>
            <Truck className="size-4" aria-hidden="true" /> {ship.isPending ? 'Updating…' : 'I’ve shipped my parcel'}
          </Button>
        </div>
      )}

      {canCancel && !confirmCancel && (
        <Button variant="ghost" onClick={() => setConfirmCancel(true)} disabled={pending} className="justify-self-start text-danger">
          <Ban className="size-4" aria-hidden="true" /> Cancel return
        </Button>
      )}

      {canCancel && confirmCancel && (
        <section aria-label="Confirm cancellation" className="grid gap-3 rounded-xl border-2 border-danger bg-danger-soft p-4 animate-pop-in">
          <p className="font-semibold">Cancel this return?</p>
          <p className="text-sm text-ink">You won’t be refunded for these items. You can start a new return while the return window is open.</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="danger" onClick={() => run(cancel)} loading={cancel.isPending} disabled={pending}>
              {cancel.isPending ? 'Cancelling…' : 'Yes, cancel it'}
            </Button>
            <Button variant="secondary" onClick={() => setConfirmCancel(false)} disabled={pending}>Keep my return</Button>
          </div>
        </section>
      )}
    </Card>
  )
}
