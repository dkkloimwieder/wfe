const pseudoClass =
  /\\.|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|::[\w-]+|:(hover|focus-visible|focus-within|focus|active)(?![\w-])/g

/** Add a synthetic match without changing the declarations or the cascade. */
export function installForcedStateRules(document: Document) {
  const originals = new Map<CSSStyleRule, string>()
  const visited = new Set<CSSStyleSheet>()

  function copySheet(sheet: CSSStyleSheet | null) {
    if (!sheet || visited.has(sheet)) return
    visited.add(sheet)
    // Cross-origin sheets do not expose their rules to the page.
    let rules: CSSRuleList
    try {
      rules = sheet.cssRules
    } catch (error) {
      if (error instanceof DOMException && error.name === 'SecurityError')
        return
      throw error
    }
    extendRules(rules)
  }

  function extendRules(rules: CSSRuleList) {
    for (const rule of rules) {
      if (rule instanceof CSSImportRule) copySheet(rule.styleSheet)
      if (rule instanceof CSSStyleRule) {
        const original = rule.selectorText
        const extended = original.replace(pseudoClass, (token, state) =>
          state
            ? `:is(${token}, [data-force-${state}]:where([data-variants-page] *))`
            : token,
        )
        if (extended !== original) {
          // CSSOM cannot round-trip a variable shorthand when a longhand
          // overrides part of it. Editing the selector keeps the parsed paint.
          rule.selectorText = extended
          originals.set(rule, original)
        }
        extendRules(rule.cssRules)
      }
      if (rule instanceof CSSGroupingRule) extendRules(rule.cssRules)
    }
  }

  for (const sheet of document.styleSheets) copySheet(sheet)
  for (const sheet of document.adoptedStyleSheets) copySheet(sheet)
  return () => {
    for (const [rule, selector] of originals) rule.selectorText = selector
  }
}

export type ForcedState = 'hover' | 'focus' | 'pressed' | 'disabled'

export function forceState(
  sample: HTMLElement,
  state: ForcedState,
  auditAllFocusTargets: boolean,
) {
  const focusable =
    'button, a[href], summary, input:not([type="hidden"], [type="file"]), textarea, select, [tabindex], [role="option"]'
  const pointer = '.ui-check-control, .ui-radio-control, .ui-switch-control'
  const stateTarget = sample.dataset.variantStateTarget

  if (state === 'disabled') {
    const target = stateTarget && sample.querySelector<HTMLElement>(stateTarget)
    if (target) {
      target.setAttribute('aria-disabled', 'true')
      target.tabIndex = -1
    }
    return
  }
  const ancestorAttribute =
    state === 'hover' ? 'data-force-hover' : 'data-force-focus-within'
  // The explorer previews one choice. The paint audits exercise every target.
  const choice = auditAllFocusTargets
    ? null
    : sample.querySelector('[data-variant-choice]')
  const targets = choice
    ? [choice]
    : sample.querySelectorAll(
        stateTarget ??
          (state === 'focus' ? focusable : `${focusable}, ${pointer}`),
      )
  for (const target of targets) {
    const closed = target.closest('details:not([open])')
    if (
      target.matches(':disabled, [aria-disabled="true"], [data-disabled]') ||
      target.closest('[hidden]') ||
      (closed && !target.closest('summary'))
    )
      continue
    if (state === 'focus') {
      target.setAttribute('data-force-focus', '')
      target.setAttribute('data-force-focus-visible', '')
    }
    if (state === 'pressed') {
      // Mark the target as active while the specimen represents a held press.
      target.setAttribute('data-force-active', '')
      continue
    }
    for (
      let node: Element | null = target;
      node && node !== sample;
      node = node.parentElement
    ) {
      node.setAttribute(ancestorAttribute, '')
    }
    if (state === 'focus' && !auditAllFocusTargets) break
  }
}
