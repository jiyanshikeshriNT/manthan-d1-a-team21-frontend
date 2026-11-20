import PagePlaceholder from '../../components/PagePlaceholder'

export default function DashboardPage() {
  return (
    <div className="stack">
      <h1>Operations dashboard</h1>
      <PagePlaceholder
        title="To build"
        items={[
          'KPIs: return rate, average cycle time, refunded amount, flagged customers',
          'Return rate by category (accessible colours, values on bars)',
          'Top return reasons',
          'Flagged customers (more than 3 returns in 30 days)',
        ]}
      />
    </div>
  )
}
