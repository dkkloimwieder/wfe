import { colorRoles } from '@wfe/components/theme'
import type { ColorRole } from '@wfe/components/theme'
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
  /** Row to use when a specimen shows more than one interactive target. */
  stateTarget?: string
  render: (state: State) => JSX.Element
  /** Interactive copy with the component's normal behavior and positioning. */
  live?: () => JSX.Element
}

export const stateProps = (state: State) => ({
  disabled: state === 'disabled',
  readonly: state === 'read-only',
  invalid: state === 'invalid',
})

export function roleSpecimens(
  id: string,
  label: string,
  render: (role: ColorRole) => JSX.Element,
  states: readonly State[] = ['rest'],
  live?: (role: ColorRole) => JSX.Element,
) {
  return colorRoles.map((role) =>
    specimen(
      `${id}/${role}`,
      `${label} / ${role}`,
      states,
      () => render(role),
      {
        live: live && (() => live(role)),
      },
    ),
  )
}

/** Replace the initial roving-focus highlight only in a forced specimen. */
export function choiceSnapshot(state: State, target = false) {
  return {
    'data-variant-choice': target ? '' : undefined,
    'data-highlighted':
      target && (state === 'hover' || state === 'focus') ? '' : null,
  }
}

export function specimen(
  id: string,
  label: string,
  states: readonly State[],
  render: Specimen['render'],
  options?: Pick<Specimen, 'openTrigger' | 'baseline' | 'stateTarget' | 'live'>,
): Specimen {
  return { id, label, states, render, ...options }
}
