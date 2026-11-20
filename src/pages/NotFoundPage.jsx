import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <div className="stack">
      <h1>Page not found</h1>
      <p className="muted">Check the address, or go back to the start.</p>
      <Link to="/" className="btn">Go to home</Link>
    </div>
  )
}
