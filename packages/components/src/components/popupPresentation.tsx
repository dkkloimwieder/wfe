import { PopupScope, createPopupScope } from './popupScope'
import type { JSX } from '@solidjs/web'

/** Share only the identical scope; callers retain their typed family primitive. */
export function popupRoot(render: () => JSX.Element) {
  const scope = createPopupScope()
  return <PopupScope value={scope}>{render()}</PopupScope>
}

/** Share the existing frame without adding another owner or portal. */
export function popupPortalFrame(props: { children?: JSX.Element }) {
  return (
    <div data-ui="" class="ui-popup-portal" style={{ display: 'contents' }}>
      {props.children}
    </div>
  )
}
