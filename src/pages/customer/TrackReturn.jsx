import { useParams } from 'react-router'
import StatusTimeline from '../../components/StatusTimeline'
import { STATUS } from '../../domain/returnStatus'

export default function TrackReturn() {
  const { returnId } = useParams()

  // TODO: load the return from the API. Hard-coded status for the skeleton.
  return (
    <div className="stack">
      <h2>Return {returnId}</h2>
      <section className="card">
        <StatusTimeline current={STATUS.IN_TRANSIT} />
      </section>
    </div>
  )
}
