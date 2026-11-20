import { Link, Outlet } from 'react-router'
import Logo from '../components/Logo'

const YEAR = new Date().getFullYear()

/** Customer area: mobile-first header, centred content column. */
export default function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-3 focus:shadow-pop">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <nav aria-label="Help" className="flex items-center gap-1 text-sm font-medium">
            <Link to="/return/new" className="hidden min-h-11 items-center rounded-lg px-3 text-secondary hover:bg-secondary-soft sm:inline-flex">
              Start a return
            </Link>
            <Link to="/login" className="inline-flex min-h-11 items-center rounded-lg px-3 text-muted hover:bg-secondary-soft">
              Staff sign in
            </Link>
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <Outlet />
      </main>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-2 px-4 py-5 text-sm text-muted sm:px-6">
          <p>© {YEAR} ReturnRight Retail Pvt. Ltd.</p>
          <p>Returns accepted within 30 days · Electronics within 10 days</p>
        </div>
      </footer>
    </div>
  )
}
