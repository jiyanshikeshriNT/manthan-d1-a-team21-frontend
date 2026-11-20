import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { ageMs, formatAge, formatDate } from '../../lib/format'

const COLUMNS = [
  { key: 'customerName', label: 'Customer', value: (c) => c.customerName.toLowerCase(), firstDir: 'asc' },
  { key: 'returnCount30d', label: 'Returns (30 days)', value: (c) => c.returnCount30d, numeric: true, firstDir: 'desc' },
  { key: 'lastReturnAt', label: 'Last return', value: (c) => -ageMs(c.lastReturnAt), numeric: true, firstDir: 'desc' },
]

/** @param {{ customers: import('../../api/manager').FlaggedCustomer[] }} props */
export default function FlaggedTable({ customers }) {
  const [sort, setSort] = useState({ key: 'returnCount30d', dir: 'desc' })

  const rows = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sort.key)
    const sorted = [...customers].sort((a, b) => {
      const x = col.value(a)
      const y = col.value(b)
      const r = x < y ? -1 : x > y ? 1 : 0
      return sort.dir === 'asc' ? r : -r
    })
    return sorted
  }, [customers, sort])

  const toggle = (col) =>
    setSort((s) => (s.key === col.key ? { key: col.key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: col.key, dir: col.firstDir }))

  return (
    <div className="-mx-5 overflow-x-auto sm:-mx-6" tabIndex={0} role="region" aria-label="Flagged customers table">
      <table className="w-full min-w-[30rem] text-left text-sm">
        <caption className="sr-only">Flagged customers. Select a column header to sort.</caption>
        <thead className="border-y border-line bg-canvas text-xs tracking-wide text-muted uppercase">
          <tr>
            {COLUMNS.map((col) => {
              const active = sort.key === col.key
              const Icon = !active ? ChevronsUpDown : sort.dir === 'desc' ? ArrowDown : ArrowUp
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className={`px-5 py-1 font-semibold sm:px-6 ${col.numeric ? 'text-right' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(col)}
                    className={`inline-flex min-h-11 items-center gap-1 rounded-md uppercase hover:text-ink ${col.numeric ? 'flex-row-reverse' : ''}`}
                  >
                    {col.label}
                    <Icon className="size-3.5" aria-hidden="true" />
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((c) => (
            <tr key={c.customerId}>
              <th scope="row" className="px-5 py-3 font-medium sm:px-6">
                {c.customerName}
                <span className="block font-mono text-xs font-normal text-muted">{c.customerId}</span>
              </th>
              <td className="px-5 py-3 text-right sm:px-6">
                <span className="font-semibold tabular">{c.returnCount30d}</span>
                <span className="text-muted"> returns</span>
              </td>
              <td className="px-5 py-3 text-right tabular sm:px-6">
                <time dateTime={c.lastReturnAt}>{formatDate(c.lastReturnAt)}</time>
                <span className="block text-xs text-muted">{formatAge(c.lastReturnAt)} ago</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
