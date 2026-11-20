import { CheckCircle2, CircleDot, Clock, PackageCheck, SearchCheck, Truck, XCircle } from 'lucide-react'
import Badge from './Badge'
import { STATUS_LABEL } from '../../domain/returnStatus'

// Icon + text + tone per return status (CLAUDE.md "Semantic status tokens").
const MAP = {
  REQUESTED: { tone: 'info', icon: Clock },
  APPROVED: { tone: 'success', icon: CheckCircle2 },
  IN_TRANSIT: { tone: 'info', icon: Truck },
  RECEIVED: { tone: 'info', icon: PackageCheck },
  INSPECTED: { tone: 'info', icon: SearchCheck },
  REFUNDED: { tone: 'success', icon: CheckCircle2 },
  REJECTED: { tone: 'danger', icon: XCircle },
}

export default function StatusBadge({ status, className }) {
  const { tone, icon } = MAP[status] ?? { tone: 'neutral', icon: CircleDot }
  return (
    <Badge tone={tone} icon={icon} className={className}>
      {STATUS_LABEL[status] ?? status}
    </Badge>
  )
}
