import { children, createMemo, useContext } from 'solid-js'
import { FieldContext } from './fieldContext'
import type { JSX } from '@solidjs/web'

/** Keep field rendering in one owner after siblings register their metadata. */
export function renderAfterRegistration(view: () => JSX.Element): JSX.Element {
  const element = createMemo(view, { lazy: true })
  // Preserve the accessor as a child. Calling it here renders before registration ends.
  return <>{element}</>
}

/** Construct a compound root once and let its Field prepare it before SSR labels. */
export function renderCompoundFieldRoot(view: () => JSX.Element): JSX.Element {
  const field = useContext(FieldContext)
  if (!field) return view()
  const root = view()
  const resolved = children(() => root)
  field.registerCompoundRoot(resolved)
  return <>{resolved}</>
}
