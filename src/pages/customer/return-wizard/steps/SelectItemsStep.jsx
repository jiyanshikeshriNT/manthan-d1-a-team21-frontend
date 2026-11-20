import { ArrowLeft, ArrowRight, Ban, Check, Clock, Package, PackageX } from 'lucide-react'
import Badge from '../../../../components/ui/Badge'
import Button from '../../../../components/ui/Button'
import Alert from '../../../../components/ui/Alert'
import Spinner from '../../../../components/ui/Spinner'
import EmptyState from '../../../../components/ui/EmptyState'
import { useEligibility } from '../../../../api/hooks'
import { ineligibleInfo } from '../../../../domain/returns'
import { cx, formatDate, formatINR } from '../../../../lib/format'
import { useWizard } from '../wizardState'
import QuantityPicker from '../QuantityPicker'

function DaysLeft({ days }) {
  if (days == null) return null
  const urgent = days <= 3
  return (
    <Badge tone={urgent ? 'warning' : 'neutral'} icon={Clock}>
      {days === 0 ? 'Last day to return' : `${days} ${days === 1 ? 'day' : 'days'} left`}
    </Badge>
  )
}

function ItemRow({ item, selection, dispatch }) {
  const id = `item-${item.orderItemId}`
  const msgId = `${id}-msg`
  const selected = Boolean(selection)

  if (!item.eligible) {
    const info = ineligibleInfo(item.reasonCode)
    return (
      <li className="flex gap-3 rounded-xl border border-line bg-secondary-soft p-4" data-testid="ineligible-item">
        <input id={id} type="checkbox" disabled aria-describedby={msgId} className="mt-1 size-5 shrink-0 accent-primary" />
        <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-lg border border-line bg-surface text-muted">
          <PackageX className="size-6" />
        </span>
        <div className="grid min-w-0 flex-1 gap-1.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <label htmlFor={id} className="font-medium text-muted">
              {item.productName}
            </label>
            <Badge tone="danger" icon={Ban}>{info.badge}</Badge>
          </div>
          <p id={msgId} className="text-sm text-ink">
            {item.message || info.fallback}
          </p>
        </div>
      </li>
    )
  }

  return (
    <li
      className={cx(
        'rounded-xl border p-4 transition-colors',
        selected ? 'border-primary bg-primary-soft' : 'border-line bg-surface hover:border-line-strong',
      )}
    >
      <div className="flex gap-3">
        <input
          id={id}
          type="checkbox"
          checked={selected}
          onChange={() => dispatch({ type: 'TOGGLE_ITEM', item })}
          aria-describedby={msgId}
          className="mt-1 size-5 shrink-0 cursor-pointer accent-primary"
        />
        <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-lg border border-line bg-canvas text-secondary">
          <Package className="size-6" />
        </span>
        <div className="grid min-w-0 flex-1 gap-1.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <label htmlFor={id} className="cursor-pointer font-medium text-ink">
              {item.productName}
            </label>
            <span className="font-semibold tabular">{formatINR(item.unitPricePaise)}</span>
          </div>
          <p id={msgId} className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <span className="font-mono text-xs">{item.sku}</span>
            <span aria-hidden="true">·</span>
            <span>Qty {item.quantity}</span>
            <DaysLeft days={item.daysLeft} />
          </p>
          {selected && item.returnableQuantity > 1 && (
            <div className="pt-2">
              <QuantityPicker
                label={`Quantity to return for ${item.productName}`}
                value={selection.quantity}
                max={item.returnableQuantity}
                onChange={(q) => dispatch({ type: 'UPDATE_ITEM', orderItemId: item.orderItemId, patch: { quantity: q } })}
              />
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

export default function SelectItemsStep() {
  const { state, dispatch } = useWizard()
  const { data, isPending, isError, error, refetch } = useEligibility(state.order?.orderId)
  const count = Object.keys(state.selections).length
  const back = () => dispatch({ type: 'GO_TO', step: 0 })

  if (isPending) {
    return (
      <div className="flex items-center gap-3 py-8 text-muted">
        <Spinner label="" /> Checking which items can be returned…
      </div>
    )
  }

  if (isError) {
    const expired = error?.status === 401
    return (
      <div className="grid gap-4">
        <Alert tone={expired ? 'warning' : 'danger'} title={expired ? 'Your session has expired' : 'We couldn’t load your items'}>
          {expired ? 'For your security, please look up your order again.' : 'Check your connection and try again.'}
        </Alert>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={back}>{expired ? 'Look up order' : 'Back'}</Button>
          {!expired && <Button onClick={() => refetch()}>Try again</Button>}
        </div>
      </div>
    )
  }

  const items = data.items
  const eligibleCount = items.filter((i) => i.eligible).length

  if (eligibleCount === 0) {
    return (
      <div className="grid gap-4">
        <EmptyState
          icon={PackageX}
          title="None of these items can be returned"
          description="Each item below explains why."
        />
        <ul className="grid gap-3">
          {items.map((i) => <ItemRow key={i.orderItemId} item={i} dispatch={dispatch} />)}
        </ul>
        <div><Button variant="secondary" onClick={back}>Look up another order</Button></div>
      </div>
    )
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-canvas px-4 py-3 text-sm">
        <span>
          Order <span className="font-mono font-medium">{data.orderNumber}</span>
          {data.deliveredAt && <span className="text-muted"> · delivered {formatDate(data.deliveredAt)}</span>}
        </span>
        <span className="text-muted">
          {eligibleCount} of {items.length} items can be returned
        </span>
      </div>

      <fieldset className="grid gap-3">
        <legend className="sr-only">Items in this order</legend>
        <ul className="grid gap-3">
          {items.map((i) => (
            <ItemRow key={i.orderItemId} item={i} selection={state.selections[i.orderItemId]} dispatch={dispatch} />
          ))}
        </ul>
      </fieldset>

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="secondary" onClick={back}>
          <ArrowLeft className="size-4" aria-hidden="true" /> Back
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <p id="select-hint" className="text-sm text-muted">
            {count === 0 ? 'Select at least one item to continue.' : (
              <span className="inline-flex items-center gap-1 text-success"><Check className="size-4" aria-hidden="true" />{count} selected</span>
            )}
          </p>
          <Button onClick={() => dispatch({ type: 'GO_TO', step: 2 })} disabled={count === 0} aria-describedby="select-hint">
            Next <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  )
}
