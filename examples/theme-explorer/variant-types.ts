import type { JSX } from '@solidjs/web'

export const actionStates = [
  'rest',
  'hover',
  'focus',
  'pressed',
  'disabled',
] as const
export const editingStates = [...actionStates, 'invalid', 'read-only'] as const
export const interactiveStates = ['rest', 'hover', 'focus', 'pressed'] as const

export type State =
  | (typeof editingStates)[number]
  | 'selected'
  | 'checked'
  | 'mixed'
  | 'open'
  | 'closed'

export type Specimen = {
  id: string
  label: string
  states: readonly State[]
  /** Open a composite control through its own trigger after mounting. */
  openTrigger?: string
  /** Resting row for a specimen that only exists with its popup open. */
  baseline?: string
  render: (state: State) => JSX.Element
}

export const stateProps = (state: State) => ({
  disabled: state === 'disabled',
  readonly: state === 'read-only',
  invalid: state === 'invalid',
})

export function specimen(
  id: string,
  label: string,
  states: readonly State[],
  render: Specimen['render'],
  options?: Pick<Specimen, 'openTrigger' | 'baseline'>,
): Specimen {
  return { id, label, states, render, ...options }
}
