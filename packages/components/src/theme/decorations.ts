/** Refresh decorative geometry on entry without changing the action hit area. */
export function decorateActions(root: HTMLDivElement) {
  const selector =
    '.ui-button, .ui-dashboard-navigation a[href], .ui-dashboard-menu a[href]'
  const randomize = (node: HTMLElement) => {
    const angle = (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 2)
    node.style.setProperty('--ui-action-angle', `${angle.toFixed(2)}deg`)
    const taper = Math.random() * 3.5 - 1.75
    node.style.setProperty('--ui-action-taper', `${taper.toFixed(2)}deg`)
    const taperY = Math.random() * 3.5 - 1.75
    node.style.setProperty('--ui-action-taper-y', `${taperY.toFixed(2)}deg`)
  }
  const pin = (node: Element) => {
    if (
      !(node instanceof HTMLElement) ||
      node.closest('[data-ui-theme-owner]') !== root ||
      node.style.getPropertyValue('--ui-action-angle')
    )
      return
    randomize(node)
  }
  const scan = (node: Element) => {
    if (node.matches(selector)) pin(node)
    node.querySelectorAll(selector).forEach(pin)
  }
  scan(root)
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof Element) scan(node)
      }
    }
  })
  observer.observe(root, { childList: true, subtree: true })
  const enter = (event: PointerEvent) => {
    if (!(event.target instanceof Element)) return
    const action = event.target.closest(selector)
    if (
      !(action instanceof HTMLElement) ||
      action.closest('[data-ui-theme-owner]') !== root
    )
      return
    if (
      event.relatedTarget instanceof Node &&
      action.contains(event.relatedTarget)
    )
      return
    randomize(action)
  }
  root.addEventListener('pointerover', enter)
  return () => {
    observer.disconnect()
    root.removeEventListener('pointerover', enter)
  }
}
