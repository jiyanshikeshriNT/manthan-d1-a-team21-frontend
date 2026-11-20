import { Link } from 'react-router'
import { RotateCcw } from 'lucide-react'

export default function Logo({ to = '/', suffix }) {
  return (
    <Link to={to} className="inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold tracking-tight text-ink">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-white">
        <RotateCcw className="size-4" aria-hidden="true" />
      </span>
      <span className="text-[17px]">ReturnRight</span>
      {suffix && <span className="rounded-md bg-secondary-soft px-2 py-0.5 text-xs font-semibold text-secondary">{suffix}</span>}
    </Link>
  )
}
