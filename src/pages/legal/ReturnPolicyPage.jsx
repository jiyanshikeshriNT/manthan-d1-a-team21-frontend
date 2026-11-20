import { Link } from 'react-router'
import { FINANCE_APPROVAL_THRESHOLD_INR } from '../../domain/returnStatus'
import { GRADE_C_REFUND_FACTOR, MAX_PHOTO_BYTES, REFUND_METHODS, RETURN_WINDOW_DAYS } from '../../domain/returns'
import { formatINR } from '../../lib/format'
import PolicyPage from './PolicyPage'

// Every number comes from src/domain, so this page can't drift from the eligibility rules.
const SECTIONS = [
  {
    id: 'window',
    title: 'How long you have',
    body: (
      <>
        <p>
          You can return most items within <strong>{RETURN_WINDOW_DAYS.STANDARD} days</strong> of delivery. Electronics can be
          returned within <strong>{RETURN_WINDOW_DAYS.ELECTRONICS} days</strong>.
        </p>
        <p>
          The day your order is delivered counts as day 0, and the last day of the window still counts. For example, headphones
          delivered on 1 March can be returned up to and including {1 + RETURN_WINDOW_DAYS.ELECTRONICS} March. Days are counted
          in India Standard Time.
        </p>
      </>
    ),
  },
  {
    id: 'not-returnable',
    title: 'Items that can’t be returned',
    body: (
      <>
        <ul>
          <li>Innerwear, for hygiene reasons</li>
          <li>Perishables such as fresh food, juices and bakery items</li>
          <li>Items whose return window has closed</li>
        </ul>
        <p>
          If a perishable item arrived spoiled or damaged, contact customer support instead of starting a return and we’ll
          sort it out.
        </p>
      </>
    ),
  },
  {
    id: 'how',
    title: 'How to return an item',
    body: (
      <ul>
        <li>
          <Link to="/return/new" className="text-accent hover:underline">Start a return</Link> with your order number and the
          email you used at checkout. No account is needed.
        </li>
        <li>Choose the items, tell us why you’re returning them and pick how you’d like your refund.</li>
        <li>
          Add a photo if an item is damaged or not as described (JPEG, PNG or WebP, up to {MAX_PHOTO_BYTES / (1024 * 1024)} MB).
        </li>
        <li>Print the prepaid label, or show its QR code at the courier counter. The label is free.</li>
      </ul>
    ),
  },
  {
    id: 'inspection',
    title: 'Inspection and how much you get back',
    body: (
      <>
        <p>Our warehouse team checks every returned item and gives it a condition grade:</p>
        <ul>
          <li>
            <strong>Grade A</strong>: as new. Full refund.
          </li>
          <li>
            <strong>Grade B</strong>: lightly used, all parts present. Full refund.
          </li>
          <li>
            <strong>Grade C</strong>: clear wear or damage. {GRADE_C_REFUND_FACTOR * 100}% refund.
          </li>
        </ul>
        <p>
          If only some units of an item can be accepted, we refund those units. If an item doesn’t match your order or can’t be
          accepted at all, we’ll tell you why and arrange to send it back to you.
        </p>
      </>
    ),
  },
  {
    id: 'refunds',
    title: 'Refunds',
    body: (
      <>
        <ul>
          {REFUND_METHODS.map((m) => (
            <li key={m.value}>
              <strong>{m.label}</strong>: {m.description}
            </li>
          ))}
        </ul>
        <p>
          Refunds above {formatINR(FINANCE_APPROVAL_THRESHOLD_INR * 100)} get a quick extra check by our finance team before
          they’re paid. You don’t need to do anything.
        </p>
        <p>Each item is refunded once. If you see a duplicate payment, contact us and we’ll correct it.</p>
      </>
    ),
  },
  {
    id: 'frequent',
    title: 'Frequent returns',
    body: (
      <p>
        To keep returns fair for everyone, accounts with an unusually high number of returns in a short period may be reviewed
        by our team before new returns are approved.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact us',
    body: (
      <p>
        Questions about a return? Write to support@returnright.example or call 1800-000-0000 (Monday to Saturday, 9 am to 7 pm
        IST). Please have your return number ready.
      </p>
    ),
  },
]

export default function ReturnPolicyPage() {
  return (
    <PolicyPage
      title="Return policy"
      updated="20 November 2026"
      intro="What you can return, how long you have, and how refunds work."
      sections={SECTIONS}
    />
  )
}
