/** Keyboard hint, e.g. <Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd>. */
export default function Kbd({ children }) {
  return (
    <kbd className="inline-grid min-w-6 place-items-center rounded-md border border-line-strong border-b-2 bg-surface px-1.5 py-0.5 font-mono text-xs font-medium text-secondary">
      {children}
    </kbd>
  )
}
