import PagePlaceholder from '../../components/PagePlaceholder'

export default function InspectPage() {
  return (
    <div className="stack">
      <h1>Inspect a return</h1>
      <PagePlaceholder
        title="To build"
        items={[
          'Scan box (autofocus, Enter loads the return)',
          'Return details and the customer photo',
          'Grade A / B / C per item, with keyboard shortcuts',
          'Refund preview (grade C = 50%)',
          'Accept, partially accept or reject',
        ]}
      />
    </div>
  )
}
