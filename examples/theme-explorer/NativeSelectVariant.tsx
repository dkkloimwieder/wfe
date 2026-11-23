import { NativeSelect } from '@wfe/components'
import { For, Show } from 'solid-js'

/** Review the compatibility control with its native option elements. */
export function NativeSelectVariant(props: {
  choices: readonly { value: string; label: string; disabled?: boolean }[]
  selected: boolean
  multiple?: boolean
}) {
  return (
    <NativeSelect
      multiple={props.multiple}
      size={props.multiple ? 3 : undefined}
      value={
        props.multiple
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
