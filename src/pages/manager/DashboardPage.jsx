import { useMemo, useState } from 'react'
import { Flag, Percent, RotateCw, Timer } from 'lucide-react'
import { useFlaggedCustomers, useManagerMetrics } from '../../api/manager'
import Button from '../../components/ui/Button'
import Skeleton from '../../components/ui/Skeleton'
import { reasonLabel } from '../../domain/returns'
import { formatDuration, formatPercent, formatTime } from '../../lib/format'
import BarChartPanelBody from './BarChartPanel'
import FlaggedTable from './FlaggedTable'
import KpiCard from './KpiCard'
import Panel from './Panel'
import ReviewQueue from './ReviewQueue'
import AuditPanel from './AuditPanel'
import GatewayPanel from './GatewayPanel'

const nf = new Intl.NumberFormat('en-IN')

/** Turns the metrics payload into chart rows, sorted, with direct labels. */
function useChartData(metrics) {
  return useMemo(() => {
    if (!metrics) return null
    const cats = metrics.returnRateByCategory ?? []
    const returns = cats.reduce((s, c) => s + c.returns, 0)
    const orders = cats.reduce((s, c) => s + c.orders, 0)

    const categories = [...cats]
      .sort((a, b) => (a.returnable === b.returnable ? b.returnRate - a.returnRate : a.returnable ? -1 : 1))
      .map((c) => ({
        label: c.category,
        value: c.returnable ? c.returnRate : 0,
        display: c.returnable ? formatPercent(c.returnRate) : 'Not returnable',
        note: c.returnable ? `${nf.format(c.returns)} of ${nf.format(c.orders)} units sold` : 'Excluded by policy',
        muted: !c.returnable,
      }))

    const reasonTotal = (metrics.topReasons ?? []).reduce((s, r) => s + r.count, 0)
    const reasons = [...(metrics.topReasons ?? [])]
      .sort((a, b) => b.count - a.count)
      .map((r) => ({
        label: reasonLabel(r.reason),
        value: r.count,
        display: `${r.count} · ${formatPercent(reasonTotal ? r.count / reasonTotal : 0, 0)}`,
        note: `${r.count} of ${reasonTotal} returned items`,
      }))

    const top = categories.find((c) => !c.muted)
    const excluded = categories.filter((c) => c.muted).map((c) => c.label)
    return { categories, excluded, reasons, returns, orders, overall: orders ? returns / orders : null, top, reasonTotal }
  }, [metrics])
}

export default function DashboardPage() {
  const metrics = useManagerMetrics()
  const flagged = useFlaggedCustomers()
  const [auditId, setAuditId] = useState('')
  const showHistory = (id) => {
    setAuditId(id)
    setTimeout(() => document.getElementById('audit-title')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }), 0)
  }
  const chart = useChartData(metrics.data)
  const period = metrics.data?.periodDays ?? 30
  const customers = flagged.data?.customers ?? []
  const fetching = metrics.isFetching || flagged.isFetching
  const updatedAt = Math.max(metrics.dataUpdatedAt, flagged.dataUpdatedAt)

  const refresh = () => {
    metrics.refetch()
    flagged.refetch()
  }

  const metricsState = { isPending: metrics.isPending, isError: metrics.isError && !metrics.data, onRetry: () => metrics.refetch() }
  const flaggedState = { isPending: flagged.isPending, isError: flagged.isError && !flagged.data, onRetry: () => flagged.refetch() }

  const categoryLabel = chart?.top
    ? `Horizontal bar chart of return rate by category over the last ${period} days. Highest is ${chart.top.label} at ${chart.top.display}. ${chart.categories.filter((c) => c.muted).map((c) => c.label).join(' and ')} are not returnable.`
    : 'Return rate by category'
  const reasonsLabel = chart?.reasons.length
    ? `Bar chart of the top return reasons. Most common is ${chart.reasons[0].label}, ${chart.reasons[0].display.replace(' · ', ' returns, ')} of returns.`
    : 'Top return reasons'

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">Operations</p>
          <h1 className="text-2xl font-semibold sm:text-3xl">Returns overview</h1>
          <p className="text-muted">
            Last {period} days
            {updatedAt > 0 && <> · updated {formatTime(updatedAt)}</>}
          </p>
        </div>
        <Button variant="secondary" onClick={refresh} disabled={fetching}>
          <RotateCw className={fetching ? 'size-4 animate-spin' : 'size-4'} aria-hidden="true" />
          {fetching ? 'Refreshing…' : 'Refresh'}
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Average cycle time"
          icon={Timer}
          value={formatDuration(metrics.data?.avgCycleTimeHours)}
          detail={metrics.data ? `Request to refund or rejection · ${nf.format(metrics.data.closedReturns)} closed` : 'Request to refund or rejection'}
          {...metricsState}
        />
        <KpiCard
          label="Overall return rate"
          icon={Percent}
          value={chart?.overall == null ? '—' : formatPercent(chart.overall)}
          detail={chart && `${nf.format(chart.returns)} units returned of ${nf.format(chart.orders)} sold`}
          delay={60}
          {...metricsState}
        />
        <KpiCard
          label="Flagged customers"
          icon={Flag}
          tone={customers.length ? 'warning' : 'neutral'}
          value={nf.format(customers.length)}
          detail="More than 3 returns in 30 days"
          delay={120}
          {...flaggedState}
        />
      </div>

      <ReviewQueue onHistory={showHistory} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          id="by-category"
          title="Return rate by category"
          description="Returned units as a share of units sold, highest first"
          {...metricsState}
          isEmpty={chart && chart.orders === 0}
          empty={{ title: 'No orders in this period', text: 'Return rates appear once orders are placed.' }}
        >
          {chart && (
            <BarChartPanelBody
              title="Return rate by category"
              ariaLabel={categoryLabel}
              data={chart.categories.filter((c) => !c.muted)}
              tableData={chart.categories}
              footnote={chart.excluded.length > 0 && <>{chart.excluded.join(' and ')} can’t be returned, so they aren’t charted.</>}
              colorClass="text-chart-1"
              columns={['Category', 'Return rate']}
            />
          )}
        </Panel>

        <Panel
          id="reasons"
          title="Top return reasons"
          description="Returned items per reason, with share of all returned items"
          {...metricsState}
          isEmpty={chart && chart.reasonTotal === 0}
          empty={{ title: 'No returns yet', text: 'Reasons appear here as customers send items back.' }}
        >
          {chart && (
            <BarChartPanelBody
              title="Top return reasons"
              ariaLabel={reasonsLabel}
              data={chart.reasons}
              colorClass="text-chart-3"
              columns={['Reason', 'Returns']}
            />
          )}
        </Panel>
      </div>

      <Panel
        id="flagged"
        title="Flagged customers"
        description="Customers with more than 3 return requests in 30 days. Their new returns wait for your review. Emails are masked."
        {...flaggedState}
        isEmpty={customers.length === 0}
        empty={{ title: 'No customers are flagged', text: 'Customers with more than 3 returns in 30 days will appear here.' }}
        skeleton={
          <div className="grid gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="grid grid-cols-[1fr_5rem_6rem] gap-4"><Skeleton className="h-4" /><Skeleton className="h-4" /><Skeleton className="h-4" /></div>
            ))}
          </div>
        }
      >
        <FlaggedTable customers={customers} />
      </Panel>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <AuditPanel entityId={auditId} onSearch={setAuditId} />
        <GatewayPanel />
      </div>
    </div>
  )
}
