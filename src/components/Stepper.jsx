export default function Stepper({ steps, current }) {
  return (
    <div className="stepper">
      <div className="stepper-head">
        <span>Step {current + 1} of {steps.length}</span>
        <span>{steps[current]}</span>
      </div>
      <div className="stepper-bar" aria-hidden="true">
        {steps.map((s, i) => (
          <i key={s} className={i <= current ? 'on' : ''} />
        ))}
      </div>
    </div>
  )
}
