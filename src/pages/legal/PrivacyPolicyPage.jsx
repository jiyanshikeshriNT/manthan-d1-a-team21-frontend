import PolicyPage from './PolicyPage'

const SECTIONS = [
  {
    id: 'collect',
    title: 'What we collect',
    body: (
      <>
        <p>When you start a return, we use:</p>
        <ul>
          <li>Your order number and the email address you used at checkout, to find your order</li>
          <li>The items you choose, your reasons and any notes you write</li>
          <li>Photos you upload of the items you’re returning</li>
          <li>Your refund choice (original payment or store credit)</li>
        </ul>
        <p>We don’t ask you to create an account, and we never ask for card or bank details on this site.</p>
      </>
    ),
  },
  {
    id: 'use',
    title: 'How we use it',
    body: (
      <ul>
        <li>To check whether your items can be returned and create your return label</li>
        <li>To inspect returned items and pay your refund</li>
        <li>To show you the status of your return</li>
        <li>To prevent fraud, such as duplicate refunds or misuse of the returns service</li>
        <li>To understand return trends (for example, which products are returned most) in aggregated form</li>
      </ul>
    ),
  },
  {
    id: 'share',
    title: 'Who we share it with',
    body: (
      <>
        <p>We share only what each partner needs to do their job:</p>
        <ul>
          <li>Courier partners receive your return label details to collect and deliver the parcel</li>
          <li>Our payment provider receives the refund amount and a reference to pay you</li>
          <li>Our warehouse, finance and operations staff see the return details they need to process it</li>
        </ul>
        <p>We don’t sell your personal information.</p>
      </>
    ),
  },
  {
    id: 'keep',
    title: 'How long we keep it',
    body: (
      <p>
        We keep return records, including the audit history of each return, for up to 8 years to meet accounting and tax
        requirements. Photos are deleted 12 months after the return is closed.
      </p>
    ),
  },
  {
    id: 'security',
    title: 'How we protect it',
    body: (
      <p>
        Data is encrypted in transit. Staff access is limited by role, so a warehouse agent sees inspection details but not
        payment records. Every change to a return is logged.
      </p>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies and storage',
    body: (
      <p>
        The returns portal uses only what it needs to work, such as keeping staff signed in for the current browser session.
        We don’t use advertising cookies.
      </p>
    ),
  },
  {
    id: 'rights',
    title: 'Your rights',
    body: (
      <p>
        You can ask to see, correct or delete the personal information we hold about you, subject to the records we must keep by
        law. Write to privacy@returnright.example and we’ll reply within 30 days.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: <p>If we change this policy, we’ll update the date at the top of this page.</p>,
  },
]

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage
      title="Privacy policy"
      updated="20 November 2026"
      intro="What information the returns portal uses, why, and the choices you have."
      sections={SECTIONS}
    />
  )
}
