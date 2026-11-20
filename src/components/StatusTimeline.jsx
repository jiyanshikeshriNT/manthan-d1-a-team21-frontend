import { STATUS, STATUS_LABEL, TIMELINE } from '../domain/returnStatus'

// Customer-facing timeline. `current` is the return's status;
// a REJECTED return shows the steps it passed and then the rejection.
export default function StatusTimeline({ current }) {
  const rejected = current === STATUS.REJECTED
  const steps = rejected ? [STATUS.REQUESTED, STATUS.REJECTED] : TIMELINE
  const idx = steps.indexOf(current)

  return (
    <ol className="timeline">
      {steps.map((s, i) => {
        const state = i < idx ? 'done' : i === idx ? (rejected ? 'rejected' : 'now') : 'todo'
        return (
          <li key={s} className={`timeline-step ${state}`}>
            <span className="timeline-dot" aria-hidden="true" />
            <span>{STATUS_LABEL[s]}</span>
          </li>
        )
      })}
    </ol>
  )
}
