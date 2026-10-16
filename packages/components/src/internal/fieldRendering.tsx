import { createMemo } from 'solid-js'
import type { JSX } from '@solidjs/web'

/** Keep field rendering in one owner after siblings register their metadata. */
export function renderAfterRegistration(view: () => JSX.Element): JSX.Element {
  const element = createMemo(view, { lazy: true })
  // Preserve the accessor as a child. Calling it here renders before registration ends.
  return <>{element}</>
}
