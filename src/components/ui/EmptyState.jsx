import { Inbox } from 'lucide-react'

/** @param {{ icon?: React.ComponentType<{className?: string}>, title: string, description?: React.ReactNode, action?: React.ReactNode }} props */
export default function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="mx-auto grid max-w-md justify-items-center gap-3 px-4 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-secondary-soft text-secondary">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
