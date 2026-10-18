/** Include portaled popups linked to controls inside a retained pane. */
export function ownsFocus(
  container: HTMLElement | undefined,
  target: Node | null = container?.ownerDocument.activeElement ?? null,
) {
  if (!container || !target) return false
  if (container.contains(target)) return true
  for (const control of container.querySelectorAll(
    '[aria-expanded="true"][aria-controls]',
  )) {
    for (const id of control.getAttribute('aria-controls')!.split(/\s+/)) {
      if (container.ownerDocument.getElementById(id)?.contains(target))
        return true
    }
  }
  return false
}
