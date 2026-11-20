import { useState } from 'react'
import { Activity } from 'lucide-react'
import { useGatewayFaults, useSetGatewayFaults } from '../../api/manager'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Field'

const MODES = [
  { value: 'NONE', label: 'Normal' },
  { value: 'SLOW', label: 'Slow (answers after the delay)' },
  { value: 'TIMEOUT', label: 'Timeout (charges, answers too late)' },
  { value: 'FAIL', label: 'Down (unknown outcome, no charge)' },
  { value: 'FAIL_AFTER_CHARGE', label: 'Fail after charge (response lost)' },
  { value: 'DECLINE', label: 'Decline new payments' },
]

const modeLabel = (m) => MODES.find((x) => x.value === m)?.label ?? m

/**
 * Mock payment gateway fault injection for the SRE drill. Only available outside production;
 * every change is written to the audit log.
 */
export default function GatewayPanel() {
  const current = useGatewayFaults()
  const save = useSetGatewayFaults()
  const [draft, setDraft] = useState(null)
  const value = draft ?? { mode: current.data?.mode ?? 'NONE', latencyMs: String(current.data?.latencyMs ?? 0) }
  const latency = Number(value.latencyMs)
  const latencyError = !Number.isInteger(latency) || latency < 0 || latency > 60_000 ? 'Enter a whole number from 0 to 60000.' : ''

  if (current.isError && current.error.status === 404) return null // not offered by this deployment

  function submit(e) {
    e.preventDefault()
    if (latencyError || save.isPending) return
    save.mutate({ mode: value.mode, latencyMs: latency }, { onSuccess: () => setDraft(null) })
  }

  return (
    <section aria-labelledby="gw-title" className="grid content-start gap-4 rounded-xl border border-line bg-surface p-5 shadow-card animate-fade-up sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-0.5">
          <h2 id="gw-title" className="font-semibold">Payment gateway drill</h2>
          <p className="text-sm text-muted">Inject faults into the mock gateway. Not available in production.</p>
        </div>
        {current.data && (
          <Badge tone={current.data.mode === 'NONE' ? 'success' : 'warning'} icon={Activity}>
            {modeLabel(current.data.mode)}
          </Badge>
        )}
      </header>
      {save.error && <Alert tone="danger" title="The setting wasn’t changed">{save.error.message}</Alert>}
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
        <Select label="Mode" value={value.mode} onChange={(e) => setDraft({ ...value, mode: e.target.value })} disabled={current.isPending}>
          {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </Select>
        <Input
          label="Delay (ms)"
          type="number"
          inputMode="numeric"
          min={0}
          max={60000}
          value={value.latencyMs}
          onChange={(e) => setDraft({ ...value, latencyMs: e.target.value })}
          error={latencyError}
          disabled={current.isPending}
        />
        <Button type="submit" loading={save.isPending} disabled={current.isPending || Boolean(latencyError)}>
          {save.isPending ? 'Applying…' : 'Apply'}
        </Button>
      </form>
    </section>
  )
}
