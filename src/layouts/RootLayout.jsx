import { useEffect, useRef } from 'react'
import { Outlet, ScrollRestoration, useLocation, useMatches } from 'react-router'

/**
 * Runs on every route:
 * - sets document.title from the route's handle.title
 * - after client-side navigation, moves focus to the page's <h1> (or <main>) and announces the new page,
 *   so keyboard and screen-reader users start at the top of the new content
 * - renders the skip link and scroll restoration
 */
export default function RootLayout() {
  const location = useLocation()
  const matches = useMatches()
  const title = [...matches].reverse().find((m) => m.handle?.title)?.handle.title ?? 'ReturnRight'
  const first = useRef(true)
  const announcer = useRef(null)

  useEffect(() => {
    document.title = title === 'ReturnRight' ? 'ReturnRight · Returns & refunds' : `${title} · ReturnRight`
  }, [title])

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    // Wait a frame so the new page has rendered its heading.
    const id = requestAnimationFrame(() => {
      const target = document.querySelector('main h1') ?? document.getElementById('main')
      if (target) {
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
        target.focus({ preventScroll: true })
      }
      if (announcer.current) announcer.current.textContent = `${title} page`
    })
    return () => cancelAnimationFrame(id)
  }, [location.pathname, title])

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-surface px-4 py-3 font-medium shadow-pop focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to main content
      </a>
      <p ref={announcer} aria-live="polite" aria-atomic="true" className="sr-only" />
      <Outlet />
      <ScrollRestoration />
    </>
  )
}
