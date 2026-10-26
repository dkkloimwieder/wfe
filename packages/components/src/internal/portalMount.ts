export function portalMount(anchor: HTMLElement | null | undefined) {
  const scope = anchor?.closest<HTMLElement>('[data-ui]')
  const layer = anchor?.closest<HTMLElement>('[popover], .ui-dialog-portal')
  const theme = anchor?.closest<HTMLElement>('[data-ui-portal-root]')
  // Keep the nearest boundary: an inner theme wins over an outer dialog.
  if (theme && layer) return layer.contains(theme) ? theme : layer
  return (
    layer ??
    theme ??
    scope?.parentElement?.closest<HTMLElement>('[data-ui]') ??
    scope ??
    undefined
  )
}
