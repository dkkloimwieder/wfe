import { NativeSelect } from '@wfe/components'
import type { ColorRole } from '@wfe/components/theme'
import { For, Show } from 'solid-js'

/** Review the compatibility control with its native option elements. */
export function NativeSelectVariant(props: {
  choices: readonly { value: string; label: string; disabled?: boolean }[]
  selected: boolean
  multiple?: boolean
  decoration?: ColorRole
  /** Leave the value to the browser so a click changes it. */
  live?: boolean
}) {
  return (
    <NativeSelect
      decoration={props.decoration}
      multiple={props.multiple}
      size={props.multiple ? 3 : undefined}
      value={
        props.multiple || props.live
          ? undefined
          : props.selected
            ? props.choices[0]?.value
            : ''
      }
    >
      <Show when={!props.multiple}>
        <option value="">Choose a team</option>
      </Show>
      <For each={props.choices}>
        {(choice) => (
          <option
            value={choice.value}
            disabled={choice.disabled}
            selected={
              props.multiple ? props.selected && !choice.disabled : undefined
            }
          >
            {choice.label}
          </option>
        )}
      </For>
    </NativeSelect>
  )
}
