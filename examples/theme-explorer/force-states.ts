const pseudoClass =
  /\\.|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|::[\w-]+|:(hover|focus-visible|focus-within|focus|active)(?![\w-])/g

// Split selector lists without splitting :is(), :has(), or attribute values.
function scopeSelectors(selectors: string) {
  const prefix = ':where([data-variants-page]) '
  let depth = 0
  return (
    prefix +
    selectors.replace(
      /\\.|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[()[\],]/g,
      (token) => {
        if (token === '(' || token === '[') depth++
        if (token === ')' || token === ']') depth--
        return token === ',' && depth === 0 ? ', ' + prefix : token
      },
    )
  )
}

type RuleList = CSSStyleSheet | CSSGroupingRule | CSSStyleRule

/** Insert copies next to their originals, in the original cascade and group. */
export function installForcedStateRules(document: Document) {
  const copies: { parent: RuleList; rule: CSSRule }[] = []
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
    copyRules(sheet, rules)
  }

  function copyRules(parent: RuleList, rules: CSSRuleList) {
    // Walk backwards so insertions leave the remaining indices intact.
    for (let index = rules.length - 1; index >= 0; index--) {
      const rule = rules[index]!
      if (rule instanceof CSSImportRule) copySheet(rule.styleSheet)
      if (rule instanceof CSSStyleRule) {
        const replaced = rule.selectorText.replace(
          pseudoClass,
          (token, state) => (state ? `[data-force-${state}]` : token),
        )
        if (replaced !== rule.selectorText) {
          const nested = Array.from(
            rule.cssRules,
            (child) => child.cssText,
          ).join(' ')
          const selector = scopeSelectors(replaced)
          parent.insertRule(
            `${selector} { ${rule.style.cssText} ${nested} }`,
            index + 1,
          )
          copies.push({ parent, rule: rules[index + 1]! })
        }
        copyRules(rule, rule.cssRules)
      }
      if (rule instanceof CSSGroupingRule) copyRules(rule, rule.cssRules)
    }
  }

  for (const sheet of document.styleSheets) copySheet(sheet)
  for (const sheet of document.adoptedStyleSheets) copySheet(sheet)
  return () => {
    for (const { parent, rule } of copies.reverse()) {
      const index = Array.from(parent.cssRules).indexOf(rule)
      if (index !== -1) parent.deleteRule(index)
    }
  }
}

export type ForcedState = 'hover' | 'focus' | 'pressed'

export function forceState(sample: HTMLElement, state: ForcedState) {
  const focusable =
    'button, a[href], summary, input:not([type="hidden"]), textarea, select, [tabindex], [role="slider"]'
  const pointer =
    '.ui-check-control, .ui-radio-control, .ui-switch-control, .ui-file-actions > button, [role="slider"]'
  const target =
    sample.querySelector('[role="gridcell"] button[tabindex="0"]') ??
    (state === 'focus' ? null : sample.querySelector(pointer)) ??
    sample.querySelector(focusable)
  if (!target) return

  if (state === 'focus') {
    target.setAttribute('data-force-focus', '')
    target.setAttribute('data-force-focus-visible', '')
  }
  const attribute = {
    hover: 'data-force-hover',
    focus: 'data-force-focus-within',
    pressed: 'data-force-active',
  }[state]
  for (
    let node: Element | null = target;
    node && node !== sample;
    node = node.parentElement
  ) {
    node.setAttribute(attribute, '')
  }
}
