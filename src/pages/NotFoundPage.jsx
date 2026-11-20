import { MapPinOff } from 'lucide-react'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'

export default function NotFoundPage() {
  return (
    <EmptyState
      icon={MapPinOff}
      title="Page not found"
      description="The link may be broken or the page may have moved."
      action={<Button as="link" to="/">Go to home</Button>}
    />
  )
}
