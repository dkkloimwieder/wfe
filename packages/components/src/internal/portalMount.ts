export function portalMount(anchor: HTMLElement | null | undefined) {
  const scope = anchor?.closest<HTMLElement>('[data-ui]')
  return (
    anchor?.closest<HTMLElement>('[popover], .ui-dialog-portal') ??
    anchor?.closest<HTMLElement>('[data-ui-portal-root]') ??
    scope?.parentElement?.closest<HTMLElement>('[data-ui]') ??
    scope ??
    undefined
  )
}
