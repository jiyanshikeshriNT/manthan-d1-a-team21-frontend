import { useEffect } from 'react'
import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import Alert from '../../components/ui/Alert'
import Card from '../../components/ui/Card'

/**
 * Shared shell for the policy pages: title, last-updated date, demo notice, table of contents.
 * @param {{ title: string, intro: string, updated: string, sections: { id: string, title: string, body: React.ReactNode }[] }} props
 */
export default function PolicyPage({ title, intro, updated, sections }) {
  // Footer links land here from the bottom of the previous page.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <article className="mx-auto grid max-w-3xl gap-8">
      <header className="grid gap-3">
        <Link to="/" className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-lg text-sm font-medium text-secondary hover:underline">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to home
        </Link>
        <h1 className="text-3xl leading-tight font-semibold">{title}</h1>
        <p className="text-sm text-muted">Last updated {updated}</p>
        <p className="text-lg text-muted">{intro}</p>
        <Alert tone="info" title="Sample text">
          This is placeholder policy text for the ReturnRight demo. It is not legal advice and is not a real company policy.
        </Alert>
      </header>

      <nav aria-labelledby="toc">
        <Card padded={false} className="p-5">
          <h2 id="toc" className="mb-2 text-sm font-semibold tracking-wide text-muted uppercase">
            On this page
          </h2>
          <ol className="grid gap-1 text-sm sm:grid-cols-2">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="inline-flex min-h-11 items-center text-accent hover:underline">
                  {i + 1}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </Card>
      </nav>

      {sections.map((s, i) => (
        <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="grid scroll-mt-24 gap-3">
          <h2 id={`${s.id}-h`} className="text-xl font-semibold">
            {i + 1}. {s.title}
          </h2>
          <div className="grid gap-3 text-ink [&_li]:ml-5 [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-1.5">{s.body}</div>
        </section>
      ))}
    </article>
  )
}
