import { ScanLine } from 'lucide-react'
import EmptyState from '../../components/ui/EmptyState'

export default function InspectPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Inspect a return</h1>
      <EmptyState icon={ScanLine} title="Coming next" description="Scan a QR code, grade items A, B or C, and accept or reject. This screen is built in the next step." />
    </div>
  )
}
