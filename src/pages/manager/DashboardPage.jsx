import { BarChart3 } from 'lucide-react'
import EmptyState from '../../components/ui/EmptyState'

export default function DashboardPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Operations dashboard</h1>
      <EmptyState icon={BarChart3} title="Coming next" description="Return rates, top reasons, cycle time and flagged customers. This screen is built in a later step." />
    </div>
  )
}
