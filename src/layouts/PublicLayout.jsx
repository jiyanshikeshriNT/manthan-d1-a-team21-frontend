import { Link, Outlet } from 'react-router'
import Logo from '../components/Logo'

const YEAR = new Date().getFullYear()

const FOOTER_LINKS = [
  { to: '/return-policy', label: 'Return policy' },
  { to: '/privacy', label: 'Privacy policy' },
]

/** Customer area: mobile-first header, centred content column. */
export default function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4 sm:px-6">
          <Logo />
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 outline-none px-4 py-6 sm:px-6 sm:py-10">
        <Outlet />
      </main>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4 text-sm text-muted sm:px-6">
          <p>© {YEAR} ReturnRight Retail Pvt. Ltd.</p>
          <nav aria-label="Policies" className="flex flex-wrap gap-x-1">
            {FOOTER_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="inline-flex min-h-11 items-center rounded-lg px-2 text-secondary hover:bg-secondary-soft hover:text-ink">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  )
}
