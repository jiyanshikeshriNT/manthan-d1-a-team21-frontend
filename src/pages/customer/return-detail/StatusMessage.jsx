import Alert from '../../../components/ui/Alert'
import { refundMethodLabel } from '../../../domain/returns'
import { formatINR } from '../../../lib/format'

/** Friendly banner for the states that need explaining: rejected, refund retrying, refunded. */
export default function StatusMessage({ data }) {
  const base = 'animate-fade-up'
  if (data.status === 'REJECTED') {
    return (
      <Alert tone="danger" title="We couldn’t accept this return" className={base}>
        {data.rejectionReason || 'Our team couldn’t accept this return.'} If you have questions, contact support and quote your return number.
      </Alert>
    )
  }
  if (data.status === 'REFUND_FAILED') {
    return (
      <Alert tone="warning" title="We’re retrying your refund" className={base}>
        No action needed. We’ll keep trying and update this page as soon as it goes through.
      </Alert>
    )
  }
  if (data.status === 'REFUNDED') {
    return (
      <Alert tone="success" title={`${formatINR(data.refundedPaise ?? 0)} refunded`} className={base}>
        Sent to {refundMethodLabel(data.refundMethod).toLowerCase()}. Your bank may take a few days to show it.
      </Alert>
    )
  }
  return null
}
