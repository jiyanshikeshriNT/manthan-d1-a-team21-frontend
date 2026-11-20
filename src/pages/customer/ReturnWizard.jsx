import { useState } from 'react'
import Stepper from '../../components/Stepper'
import PagePlaceholder from '../../components/PagePlaceholder'

const STEPS = ['Find order', 'Pick items', 'Reason + photo', 'Refund method', 'Return label']

const STEP_CONTENT = [
  ['Order number input', 'Email input', 'Error: "We couldn\'t find an order with that number and email."'],
  ['List order items with eligibility badge', 'Show the reason when an item is not returnable', 'Only eligible items can be ticked'],
  ['Reason dropdown per item', 'Optional comment', 'Photo upload (stored locally on the server)'],
  ['Original payment or store credit', 'Estimated refund total', 'Note: final amount set after inspection, grade C = 50%'],
  ['Mock label with QR code', 'Return ID', 'Link to the status timeline'],
]

export default function ReturnWizard() {
  const [step, setStep] = useState(0)

  return (
    <div className="stack">
      <Stepper steps={STEPS} current={step} />
      <PagePlaceholder title={STEPS[step]} items={STEP_CONTENT[step]} />
      <div className="row">
        <button className="btn" disabled={step === 0} onClick={() => setStep(step - 1)}>
          Back
        </button>
        <button
          className="btn primary"
          disabled={step === STEPS.length - 1}
          onClick={() => setStep(step + 1)}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
