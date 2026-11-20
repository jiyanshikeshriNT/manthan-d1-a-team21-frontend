import axe from 'axe-core'

/**
 * Runs axe-core on the rendered DOM and returns readable violation lines (empty = pass).
 * color-contrast is off here because jsdom does not compute styles (tests run with css: false).
 * Contrast is covered by the token checks in CLAUDE.md and the manual checklist in the README.
 */
export async function axeViolations(context = document.body) {
  const { violations } = await axe.run(context, {
    resultTypes: ['violations'],
    rules: {
      'color-contrast': { enabled: false },
      'label-content-name-mismatch': { enabled: true }, // experimental in axe, but it is WCAG 2.5.3
    },
  })
  return violations.map(
    (v) => `${v.id} (${v.impact}): ${v.help} -> ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`,
  )
}
