import { useId, useState, useSyncExternalStore } from 'react'
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart3, Table2 } from 'lucide-react'
import Button from '../../components/ui/Button'
import { cx } from '../../lib/format'

const ROW = 40
const reducedQuery = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : null
const subscribeMotion = (cb) => {
  reducedQuery?.addEventListener?.('change', cb)
  return () => reducedQuery?.removeEventListener?.('change', cb)
}
const usePrefersReducedMotion = () => useSyncExternalStore(subscribeMotion, () => Boolean(reducedQuery?.matches), () => false)

/** Category name on the left. SVG text takes its colour from the token via CSS (beats the presentation attribute). */
function CategoryTick({ x, y, payload }) {
  return (
    <text x={x - 10} y={y} dy="0.32em" textAnchor="end" className="fill-ink text-[13px]">
      {payload.value}
    </text>
  )
}

/** Direct value label at the end of each bar, in ink, not the series colour. */
function ValueLabel({ x, y, width, height, value, index, data }) {
  const muted = data[index]?.muted
  return (
    <text x={x + width + 8} y={y + height / 2} dy="0.32em" className={cx('text-[13px] tabular', muted ? 'fill-muted' : 'fill-ink font-semibold')}>
      {value}
    </text>
  )
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-pop">
      <p className="font-semibold">{row.label}</p>
      <p className="tabular">{row.display}</p>
      {row.note && <p className="text-muted">{row.note}</p>}
    </div>
  )
}

/**
 * Single-series horizontal bar chart with direct labels, a hover tooltip and a data-table alternative.
 * One series, so one hue and no legend: the title names it, and the labels carry the values.
 * @param {{ title: string, ariaLabel: string, data: { label: string, value: number, display: string, note?: string, muted?: boolean }[],
 *   colorClass: string, columns: [string, string], max?: number, labelWidth?: number,
 *   tableData?: typeof data, footnote?: React.ReactNode }} props  tableData defaults to data; use it for rows that have no bar
 */
export default function BarChartPanelBody({ ariaLabel, data, tableData = data, footnote, colorClass, columns, max, labelWidth = 128, title }) {
  const [showTable, setShowTable] = useState(false)
  const tableId = useId()
  const reduced = usePrefersReducedMotion()
  const domainMax = max ?? (Math.max(...data.map((d) => d.value)) || 1)

  return (
    <div className="grid gap-3">
      <div className="flex justify-end">
        <Button
          variant="ghost"
          aria-pressed={showTable}
          aria-controls={tableId}
          onClick={() => setShowTable((v) => !v)}
          className="-my-2 text-sm"
        >
          {showTable ? <BarChart3 className="size-4" aria-hidden="true" /> : <Table2 className="size-4" aria-hidden="true" />}
          {showTable ? 'Hide table' : 'View as table'}
        </Button>
      </div>

      {/* role="img" + aria-label: screen readers get one summary sentence; the table below has the full data. */}
      <div role="img" aria-label={ariaLabel} className={cx('w-full', colorClass)} style={{ height: data.length * ROW + 16 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 104, bottom: 4, left: 0 }} barCategoryGap={8} accessibilityLayer={false}>
            <CartesianGrid horizontal={false} className="[&_line]:stroke-line" />
            <XAxis type="number" hide domain={[0, domainMax]} />
            <YAxis type="category" dataKey="label" width={labelWidth} tickLine={false} axisLine={false} tick={<CategoryTick />} interval={0} />
            <Tooltip cursor={{ className: 'fill-secondary-soft' }} content={<ChartTooltip />} isAnimationActive={false} />
            <Bar dataKey="value" fill="currentColor" radius={[0, 4, 4, 0]} maxBarSize={22} minPointSize={0} isAnimationActive={!reduced} animationDuration={700}>
              <LabelList dataKey="display" content={<ValueLabel data={data} />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {footnote && <p className="text-sm text-muted">{footnote}</p>}

      <div className={showTable ? 'overflow-x-auto' : 'sr-only'}>
        <table id={tableId} className="w-full text-left text-sm">
          <caption className="sr-only">{title}, as a table</caption>
          <thead className="border-b border-line text-xs tracking-wide text-muted uppercase">
            <tr>
              <th scope="col" className="py-2 pr-3 font-semibold">{columns[0]}</th>
              <th scope="col" className="py-2 text-right font-semibold">{columns[1]}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {tableData.map((d) => (
              <tr key={d.label}>
                <th scope="row" className="py-2 pr-3 font-medium">{d.label}</th>
                <td className="py-2 text-right tabular">
                  {d.display}
                  {d.note && <span className="block text-xs text-muted">{d.note}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
