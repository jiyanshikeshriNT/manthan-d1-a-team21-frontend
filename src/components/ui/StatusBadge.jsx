import { Ban, CheckCircle2, CircleDot, Clock, PackageCheck, SearchCheck, Truck, XCircle } from 'lucide-react'
import Badge from './Badge'
import { STATUS_LABEL, toCustomerStep } from '../../domain/returnStatus'

// Icon + text + tone per customer-visible status (CLAUDE.md "Semantic status tokens").
const MAP = {
  REQUESTED: { tone: 'info', icon: Clock },
  APPROVED: { tone: 'success', icon: CheckCircle2 },
  IN_TRANSIT: { tone: 'info', icon: Truck },
  RECEIVED: { tone: 'info', icon: PackageCheck },
  INSPECTED: { tone: 'info', icon: SearchCheck },
  REFUNDED: { tone: 'success', icon: CheckCircle2 },
  REJECTED: { tone: 'danger', icon: XCircle },
  CANCELLED: { tone: 'neutral', icon: Ban },
}

/** Customer-facing: PENDING_REVIEW shows as "Requested"; AWAITING_FINANCE and REFUND_IN_PROGRESS as "Inspected". */
export default function StatusBadge({ status, className }) {
  const shown = toCustomerStep(status)
  const { tone, icon } = MAP[shown] ?? { tone: 'neutral', icon: CircleDot }
  return (
    <Badge tone={tone} icon={icon} className={className}>
      {STATUS_LABEL[shown] ?? status}
    </Badge>
  )
}
