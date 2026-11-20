import { Landmark } from 'lucide-react'
import EmptyState from '../../components/ui/EmptyState'

export default function ApprovalsPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Refund approvals</h1>
      <EmptyState icon={Landmark} title="Coming next" description="Refunds above ₹10,000 waiting for approval will appear here. This screen is built in a later step." />
    </div>
  )
}
