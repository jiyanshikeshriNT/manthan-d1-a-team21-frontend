import PagePlaceholder from '../../components/PagePlaceholder'
import { FINANCE_APPROVAL_THRESHOLD_INR } from '../../domain/returnStatus'

export default function ApprovalsPage() {
  return (
    <div className="stack">
      <h1>Refund approvals</h1>
      <PagePlaceholder
        title="To build"
        items={[
          `Queue of refunds above ₹${FINANCE_APPROVAL_THRESHOLD_INR.toLocaleString('en-IN')}`,
          'Detail panel with inspection grade and customer flags',
          'Approve & pay: sends an Idempotency-Key to the API',
          'Ledger rows for the selected return',
        ]}
      />
    </div>
  )
}
