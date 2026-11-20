import { CheckCircle2, CircleDot, Clock, PackageCheck, RefreshCw, SearchCheck, Truck, XCircle } from 'lucide-react'
import Badge from './Badge'
import { STATUS, STATUS_LABEL, toCustomerStep } from '../../domain/returnStatus'

// Icon + text + tone per customer-visible status (CLAUDE.md "Semantic status tokens").
const MAP = {
  REQUESTED: { tone: 'info', icon: Clock },
  APPROVED: { tone: 'success', icon: CheckCircle2 },
  IN_TRANSIT: { tone: 'info', icon: Truck },
  RECEIVED: { tone: 'info', icon: PackageCheck },
  INSPECTED: { tone: 'info', icon: SearchCheck },
  REFUND_FAILED: { tone: 'warning', icon: RefreshCw },
  REFUNDED: { tone: 'success', icon: CheckCircle2 },
  REJECTED: { tone: 'danger', icon: XCircle },
}

/** Customer-facing: PENDING_FINANCE and REFUND_PROCESSING show as "Inspected". */
export default function StatusBadge({ status, className }) {
  const shown = status === STATUS.REFUND_FAILED ? status : toCustomerStep(status)
  const { tone, icon } = MAP[shown] ?? { tone: 'neutral', icon: CircleDot }
  return (
    <Badge tone={tone} icon={icon} className={className}>
      {STATUS_LABEL[shown] ?? status}
    </Badge>
  )
}
