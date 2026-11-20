import { useState } from 'react'
import { Search } from 'lucide-react'
import { useAuditTrail } from '../../api/manager'
import Button from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { STATUS_LABEL } from '../../domain/returnStatus'
import { formatDateTime } from '../../lib/format'
import { PanelEmpty, PanelError } from './Panel'

const stateLabel = (s) => (s ? STATUS_LABEL[s] ?? s : null)

/**
 * Audit trail lookup. Every state change is written in the same transaction as the change itself.
 * `entityId` is a return's id (UUID, e.g. from "History" in the review queue) or a refund number.
 */
export default function AuditPanel({ entityId, onSearch }) {
  const [draft, setDraft] = useState(entityId ?? '')
  const [seen, setSeen] = useState(entityId)
  if (seen !== entityId) {
    setSeen(entityId)
    setDraft(entityId ?? '')
  }
  const audit = useAuditTrail(entityId)
  const rows = audit.data ?? []

  return (
    <section aria-labelledby="audit-title" className="grid content-start gap-4 rounded-xl border border-line bg-surface p-5 shadow-card animate-fade-up sm:p-6">
      <header className="grid gap-0.5">
        <h2 id="audit-title" className="font-semibold">Audit trail</h2>
        <p className="text-sm text-muted">Every change to a return or refund, oldest first.</p>
      </header>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          onSearch(draft.trim())
        }}
      >
        <Input
          label="Return id or refund number"
          hint="A return id is the long id shown under History, for example 3f2b…"
          value={draft}
          maxLength={64}
          spellCheck={false}
          onChange={(e) => setDraft(e.target.value)}
          className="min-w-0 flex-1 [&_input]:font-mono"
        />
        <Button type="submit" variant="secondary" disabled={!draft.trim()}>
          <Search className="size-4" aria-hidden="true" /> Look up
        </Button>
      </form>

      {entityId && audit.isPending && <p className="text-sm text-muted" role="status">Loading the history…</p>}
      {entityId && audit.isError && <PanelError onRetry={() => audit.refetch()} compact />}
      {entityId && audit.data && rows.length === 0 && <PanelEmpty title="No history for that id" text="Check the id and try again." />}
      {rows.length > 0 && (
        <ol className="grid gap-3" aria-label={`History of ${entityId}`}>
          {rows.map((r) => (
            <li key={r.id} className="grid gap-0.5 border-l-2 border-line pl-3 text-sm">
              <p className="font-medium">
                {r.entityType === 'REFUND' ? 'Refund' : 'Return'} {r.action.toLowerCase().replace(/_/g, ' ')}
                {r.toState && <> → {stateLabel(r.toState)}</>}
              </p>
              <p className="text-muted">
                <time dateTime={r.createdAt} className="tabular">{formatDateTime(r.createdAt)}</time> · {r.actor}
                {r.actorRole && ` (${r.actorRole.toLowerCase()})`}
              </p>
              {r.details && <p className="text-ink">{r.details}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
