import { useEffect, useRef } from 'react'
import Card from '../../../components/ui/Card'
import WizardProvider from './WizardProvider'
import WizardStepper from './WizardStepper'
import { STEPS, useWizard } from './wizardState'
import FindOrderStep from './steps/FindOrderStep'
import SelectItemsStep from './steps/SelectItemsStep'
import DetailsStep from './steps/DetailsStep'
import ReviewStep from './steps/ReviewStep'

const STEP_COMPONENTS = [FindOrderStep, SelectItemsStep, DetailsStep, ReviewStep]

function Wizard() {
  const { state } = useWizard()
  const headingRef = useRef(null)
  const first = useRef(true)
  const Step = STEP_COMPONENTS[state.step]
  const meta = STEPS[state.step]

  // Move focus to the new step's heading (not on first load) so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    headingRef.current?.focus()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [state.step])

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <div className="grid gap-1">
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">Start a return</p>
        <WizardStepper steps={STEPS} current={state.step} />
      </div>
      <Card className="grid gap-6" aria-labelledby="wizard-step-title">
        <header className="grid gap-1">
          <p className="text-sm font-medium text-muted tabular">
            Step {state.step + 1} of {STEPS.length}
          </p>
          <h1 id="wizard-step-title" ref={headingRef} tabIndex={-1} className="text-2xl font-semibold outline-none">
            {meta.title}
          </h1>
          <p className="text-muted">{meta.description}</p>
        </header>
        <Step />
      </Card>
    </div>
  )
}

export default function ReturnWizardPage() {
  return (
    <WizardProvider>
      <Wizard />
    </WizardProvider>
  )
}
