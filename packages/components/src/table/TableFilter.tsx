import { Show, createUniqueId, untrack } from 'solid-js'
import { Button, Input } from '../components/NativeFields'
import { SelectField } from '../components/Select'
import { Checkbox } from '../components/Checkbox'
import { nativeEvents } from '../utils/nativeEvents'

export type TableFilterProps = {
  label: string
  clearLabel: string
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  kind?: 'text' | 'boolean'
  search?: boolean
  placeholder?: string
  hideLabel?: boolean
  choices?: ReadonlyArray<{ value: string; label: string; disabled?: boolean }>
  inputRef?: (node: HTMLInputElement) => void
  controlRef?: (node: HTMLInputElement | HTMLButtonElement) => void
  onEscape?: () => void
}

export function TableFilter(props: TableFilterProps) {
  const id = createUniqueId()
  const choices = () => props.choices
  const stateLabel = () =>
    props.value === 'true' ? 'Yes' : props.value === 'false' ? 'No' : 'Either'
  const stateHelp = createUniqueId()
  let control!: HTMLInputElement | HTMLButtonElement
  function clear() {
    if (props.disabled) return
    control.focus({ preventScroll: true })
    props.onValueChange('')
  }
  return (
    <div class="table-filter">
      <label for={id} class={props.hideLabel ? 'sr-only' : undefined}>
        {props.label}
      </label>
      <div class="filter-input">
        <Show
          when={props.kind !== 'boolean'}
          fallback={
            <Checkbox
              class="table-boolean-filter"
              checked={props.value === 'true'}
              indeterminate={!props.value}
              disabled={props.disabled}
              onChange={() => {
                if (!props.disabled) {
                  const value = untrack(() => props.value)
                  props.onValueChange(
                    value === '' ? 'true' : value === 'true' ? 'false' : '',
                  )
                }
              }}
            >
              <Checkbox.Input
                id={id}
                aria-label={props.label}
                aria-describedby={stateHelp}
                aria-checked={
                  !props.value
                    ? 'mixed'
                    : props.value === 'true'
                      ? 'true'
                      : 'false'
                }
                ref={(node) => {
                  control = node
                  props.inputRef?.(node)
                  props.controlRef?.(node)
                }}
              />
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <span id={stateHelp} class="sr-only">
                {stateLabel()}. Press Space to cycle Yes, No, and Either.
              </span>
            </Checkbox>
          }
        >
          <Show
            when={choices()}
            fallback={
              <Input
                id={id}
                type={props.search ? 'search' : 'text'}
                placeholder={
                  props.placeholder ??
                  (props.search ? 'Search values…' : 'Contains…')
                }
                value={props.value}
                disabled={props.disabled}
                ref={[
                  (node) => {
                    control = node
                    props.inputRef?.(node)
                    props.controlRef?.(node)
                  },
                  nativeEvents<HTMLInputElement>({
                    input: (event) => {
                      if (!props.disabled && !event.isComposing)
                        props.onValueChange(event.currentTarget.value)
                    },
                    compositionend: (event) => {
                      if (!props.disabled)
                        props.onValueChange(event.currentTarget.value)
                    },
                    keydown: (event) => {
                      if (event.key === 'Escape' && !event.isComposing) {
                        event.preventDefault()
                        event.stopPropagation()
                        if (props.onEscape) props.onEscape()
                        else clear()
                      }
                    },
                  }),
                ]}
              />
            }
          >
            {(choices) => (
              <SelectField
                id={id}
                label={props.label}
                value={props.value}
                choices={[
                  { value: '', label: 'All' },
                  ...choices().filter((choice) => choice.value !== ''),
                ]}
                disabled={props.disabled}
                ref={(node) => {
                  control = node
                  props.controlRef?.(node)
                }}
                onValueChange={props.onValueChange}
              />
            )}
          </Show>
        </Show>
        <Show when={props.kind !== 'boolean'}>
          <Button
            type="button"
            class="clear-input"
            aria-label={props.clearLabel}
            title={props.clearLabel}
            disabled={props.disabled || !props.value}
            ref={nativeEvents({ click: clear })}
          >
            ×
          </Button>
        </Show>
      </div>
    </div>
  )
}
