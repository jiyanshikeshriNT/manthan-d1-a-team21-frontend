import { Link, Outlet } from 'react-router'
import Logo from '../components/Logo'

const YEAR = new Date().getFullYear()

/** Customer area: mobile-first header, centred content column. */
export default function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
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
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 outline-none px-4 py-6 sm:px-6 sm:py-10">
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
