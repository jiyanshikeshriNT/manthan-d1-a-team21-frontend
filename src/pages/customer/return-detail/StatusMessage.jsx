import Alert from '../../../components/ui/Alert'
import { refundMethodLabel } from '../../../domain/returns'
import { formatINR } from '../../../lib/format'

/** Friendly banner for the states that need explaining: under review, rejected, cancelled, refunded. */
export default function StatusMessage({ data }) {
  const base = 'animate-fade-up'
  if (data.status === 'PENDING_REVIEW') {
    return (
      <Alert tone="info" title="Your return is being reviewed" className={base}>
        Because there have been several returns on your account recently, our team checks this one before it’s approved. No action needed.
      </Alert>
    )
  }
  if (data.status === 'REJECTED') {
    return (
      <Alert tone="danger" title="We couldn’t accept this return" className={base}>
        {data.closingNote ? `${data.closingNote.replace(/\.*$/, '.')} ` : 'Our team couldn’t accept this return. '}
        If you have questions, contact support and quote your return number.
      </Alert>
    )
  }
  if (data.status === 'CANCELLED') {
    return (
      <Alert tone="info" title="Return cancelled" className={base}>
        This return was cancelled, so nothing will be refunded. You can start a new one while the return window is open.
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
