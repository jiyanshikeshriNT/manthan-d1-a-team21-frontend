import { Component } from 'react'
import { useRouteError } from 'react-router'
import { AlertOctagon } from 'lucide-react'
import EmptyState from './ui/EmptyState'
import Button from './ui/Button'

function Fallback() {
  return (
    <EmptyState
      icon={AlertOctagon}
      title="Something went wrong"
      description="An unexpected error stopped this page from loading. Reload to try again. If it keeps happening, contact support."
      action={<Button onClick={() => window.location.reload()}>Reload page</Button>}
    />
  )
}

/** Global boundary for render errors outside the router. */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Hook point for error monitoring (Sentry etc.).
    console.error('Unhandled UI error', error, info.componentStack)
  }

  render() {
    return this.state.error ? <Fallback /> : this.props.children
  }
}

/** Router-level errorElement: catches errors thrown while rendering a route. */
export function RouteErrorFallback() {
  const error = useRouteError()
  console.error('Route error', error)
  return <Fallback />
}
