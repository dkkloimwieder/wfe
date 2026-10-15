import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  untrack,
} from 'solid-js'
import { Button, Input, NativeSelect } from '../components/NativeFields'
import { Select } from '../components/Select'
import { nativeEvents } from '../utils/nativeEvents'
import type { TableChoice } from './TableChoiceEditor'

export type TableColumnFilterValue =
  | {
      operator: 'contains' | 'equals' | 'starts-with' | 'not-contains'
      value: string
    }
  | { operator: 'in' | 'not-in' | 'any' | 'all'; values: string[] }
  | { operator: 'between'; min?: number; max?: number }
  | { operator: 'empty' | 'not-empty' }

export type TableColumnFilterConfig =
  | { kind: 'text' | 'number-range'; empty?: boolean }
  | {
      kind: 'select' | 'multi-select' | 'tags'
      choices: ReadonlyArray<TableChoice>
      empty?: boolean
      exclude?: boolean
    }

export type TableColumnFilterProps = {
  label: string
  clearLabel: string
  config: TableColumnFilterConfig
  value: TableColumnFilterValue | undefined
  onValueChange: (value: TableColumnFilterValue | undefined) => void
  disabled?: boolean
}

/** Presentation of filter state. The caller owns choices and matching rules. */
export function TableColumnFilter(props: TableColumnFilterProps) {
  const defaultOperator = () =>
    props.config.kind === 'text'
      ? 'contains'
      : props.config.kind === 'number-range'
        ? 'between'
        : props.config.kind === 'tags'
          ? 'any'
          : 'in'
  const [operator, setOperator] = createSignal<
    TableColumnFilterValue['operator']
  >(untrack(() => props.value?.operator ?? defaultOperator()))
  let control: HTMLElement | undefined
  let valueControl: HTMLElement | undefined
  const choices = () => ('choices' in props.config ? props.config.choices : [])
  const selected = () =>
    props.value && 'values' in props.value ? props.value.values : []
  // Controlled values also reach event and hydration callbacks. Own their memos here.
  const textValue = createMemo(() =>
    props.value && 'value' in props.value ? props.value.value : '',
  )
  const rangeValue = createMemo(() =>
    props.value?.operator === 'between' ? props.value : undefined,
  )
  const selection = () =>
    choices().filter((choice) => selected().includes(choice.value))
  const operations = () => {
    const options =
      props.config.kind === 'text'
        ? [
            ['contains', 'Contains'],
            ['equals', 'Equals'],
            ['starts-with', 'Starts with'],
            ['not-contains', 'Does not contain'],
          ]
        : props.config.kind === 'number-range'
          ? [['between', 'Between']]
          : props.config.kind === 'tags'
            ? [
                ['any', 'Has any'],
                ['all', 'Has all'],
              ]
            : [['in', 'Is']]
    if ('exclude' in props.config && props.config.exclude)
      options.push([
        'not-in',
        props.config.kind === 'tags' ? 'Has none' : 'Is not',
      ])
    if (props.config.empty)
      options.push(['empty', 'Is empty'], ['not-empty', 'Is not empty'])
    return options
  }
  const emit = (value: TableColumnFilterValue | undefined) => {
    untrack(() => {
      if (!props.disabled) props.onValueChange(value)
    })
  }
  createEffect(
    () => props.value?.operator,
    (next) => {
      if (next) setOperator(next)
      else if (
        untrack(() => operator() === 'empty' || operator() === 'not-empty')
      )
        setOperator(untrack(defaultOperator))
    },
  )
  function changeOperator(next: TableColumnFilterValue['operator']) {
    if (props.disabled) return
    setOperator(next)
    if (next === 'empty' || next === 'not-empty') emit({ operator: next })
    else if (
      props.value &&
      'value' in props.value &&
      props.config.kind === 'text'
    )
      emit({
        operator: next as Extract<
          TableColumnFilterValue,
          { value: string }
        >['operator'],
        value: props.value.value,
      })
    else if (
      props.value &&
      'values' in props.value &&
      ['in', 'not-in', 'any', 'all'].includes(next)
    )
      emit({
        operator: next as Extract<
          TableColumnFilterValue,
          { values: string[] }
        >['operator'],
        values: props.value.values,
      })
    else if (props.value?.operator === 'between' && next === 'between')
      emit(props.value)
    else emit(undefined)
  }
  function choose(values: string[]) {
    if (!values.length) emit(undefined)
    else
      emit({
        operator: untrack(operator) as 'in' | 'not-in' | 'any' | 'all',
        values,
      })
  }
  function clear() {
    if (props.disabled) return
    ;(valueControl?.isConnected ? valueControl : control)?.focus({
      preventScroll: true,
    })
    setOperator(defaultOperator())
    emit(undefined)
  }
  return (
    <div
      class="table-filter table-column-filter"
      role="group"
      aria-label={props.label}
    >
      <div class="table-filter-heading">
        <span class="ui-label">{props.label}</span>
        <Button
          type="button"
          aria-label={props.clearLabel}
          disabled={props.disabled || !props.value}
          onClick={clear}
        >
          ×
        </Button>
      </div>
      <NativeSelect
        aria-label={`${props.label} match`}
        data-ui-text="system"
        value={operator()}
        disabled={props.disabled}
        ref={(node) => {
          control = node
        }}
        onValueChange={(value) =>
          changeOperator(value as TableColumnFilterValue['operator'])
        }
      >
        <For each={operations()}>
          {(entry) => <option value={entry[0]}>{entry[1]}</option>}
        </For>
      </NativeSelect>
      <Show when={operator() !== 'empty' && operator() !== 'not-empty'}>
        <Show when={props.config.kind === 'text'}>
          <Input
            aria-label={props.label}
            ref={(node) => {
              valueControl = node
            }}
            placeholder="Enter text…"
            value={textValue()}
            disabled={props.disabled}
            onValueChange={(value) =>
              emit(
                value
                  ? {
                      operator: operator() as Extract<
                        TableColumnFilterValue,
                        { value: string }
                      >['operator'],
                      value,
                    }
                  : undefined,
              )
            }
            onKeyDown={(event) => {
              if (event.key === 'Escape' && !event.isComposing) {
                event.preventDefault()
                event.stopPropagation()
                clear()
              }
            }}
          />
        </Show>
        <Show when={props.config.kind === 'number-range'}>
          <NumberBounds
            label={props.label}
            value={rangeValue()}
            disabled={props.disabled}
            onValueChange={emit}
            controlRef={(node) => {
              valueControl = node
            }}
          />
        </Show>
        <Show
          when={'choices' in props.config ? props.config.kind : undefined}
          keyed
        >
          {(kind) => {
            const selectionProps =
              kind === 'select'
                ? {
                    multiple: false as const,
                    get value() {
                      return selection()[0] ?? null
                    },
                    onChange: (value: TableChoice | null) =>
                      untrack(() => choose(value ? [value.value] : [])),
                  }
                : {
                    multiple: true as const,
                    get value() {
                      return selection()
                    },
                    onChange: (values: TableChoice[]) =>
                      untrack(() => choose(values.map((value) => value.value))),
                  }

            return (
              <Select<TableChoice>
                options={[...choices()]}
                optionValue="value"
                optionTextValue="label"
                optionDisabled="disabled"
                placeholder="Any"
                disabled={props.disabled}
                {...selectionProps}
                itemComponent={(item) => (
                  <Select.Item item={item.item}>
                    <Select.ItemLabel>
                      {item.item.rawValue.label}
                    </Select.ItemLabel>
                    <Select.ItemIndicator>
                      <svg
                        class="ui-check-mark"
                        viewBox="0 0 16 16"
                        aria-hidden="true"
                      >
                        <path d="m2 8 4 4 8-9" />
                      </svg>
                    </Select.ItemIndicator>
                  </Select.Item>
                )}
              >
                <Select.Label class="sr-only">{props.label}</Select.Label>
                <Select.Trigger
                  ref={(node) => {
                    valueControl = node
                  }}
                >
                  <Select.Value<TableChoice>>
                    {(state) =>
                      state
                        .selectedOptions()
                        .map((value) => value.label)
                        .join(', ')
                    }
                  </Select.Value>
                  <Select.Icon aria-hidden="true">
                    <svg class="ui-filter-chevron" viewBox="0 0 10 6">
                      <path d="m1 1 4 4 4-4" />
                    </svg>
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content>
                    <Select.Listbox />
                  </Select.Content>
                </Select.Portal>
              </Select>
            )
          }}
        </Show>
      </Show>
    </div>
  )
}

function NumberBounds(props: {
  label: string
  value: Extract<TableColumnFilterValue, { operator: 'between' }> | undefined
  disabled?: boolean
  onValueChange: (value: TableColumnFilterValue | undefined) => void
  controlRef?: (node: HTMLInputElement) => void
}) {
  const [invalid, setInvalid] = createSignal({ min: false, max: false })
  const errorId = createUniqueId()
  const inputs: Partial<Record<'min' | 'max', HTMLInputElement>> = {}
  createEffect(
    () =>
      props.value ? { min: props.value.min, max: props.value.max } : undefined,
    (value) => {
      setInvalid({ min: false, max: false })
      for (const key of ['min', 'max'] as const) {
        const node = inputs[key]
        if (node) node.value = String(value?.[key] ?? '')
      }
    },
  )
  function change(boundary: 'min' | 'max', input: HTMLInputElement) {
    if (props.disabled) return
    const bad =
      input.validity.badInput ||
      (input.value !== '' && !Number.isFinite(input.valueAsNumber))
    setInvalid((old) => ({ ...old, [boundary]: bad }))
    if (bad) return
    const next = {
      operator: 'between' as const,
      ...props.value,
      [boundary]: input.value === '' ? undefined : input.valueAsNumber,
    }
    props.onValueChange(
      next.min !== undefined || next.max !== undefined ? next : undefined,
    )
  }
  return (
    <div class="table-number-bounds">
      <For each={['min', 'max'] as const}>
        {(boundary) => (
          <label>
            {boundary === 'min' ? 'Minimum' : 'Maximum'}
            <Input
              type="number"
              step="any"
              aria-label={`${props.label} ${boundary === 'min' ? 'minimum' : 'maximum'}`}
              aria-invalid={invalid()[boundary] ? 'true' : undefined}
              aria-describedby={invalid()[boundary] ? errorId : undefined}
              value={props.value?.[boundary] ?? ''}
              disabled={props.disabled}
              ref={[
                (node) => {
                  inputs[boundary] = node
                  if (boundary === 'min') props.controlRef?.(node)
                },
                nativeEvents<HTMLInputElement>({
                  input: (event) => change(boundary, event.currentTarget),
                  keydown: (event) => {
                    if (event.key === 'Escape' && !event.isComposing) {
                      event.preventDefault()
                      event.stopPropagation()
                      event.currentTarget.value = String(
                        props.value?.[boundary] ?? '',
                      )
                      setInvalid((old) => ({ ...old, [boundary]: false }))
                    }
                  },
                }),
              ]}
            />
          </label>
        )}
      </For>
      <Show when={invalid().min || invalid().max}>
        <span id={errorId} class="ui-field-error">
          Enter a valid number.
        </span>
      </Show>
    </div>
  )
}
