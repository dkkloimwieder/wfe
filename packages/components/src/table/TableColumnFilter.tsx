import type { DatePickerMessages } from '../components/dateMessages'
import { resolveTableMessages, type TableMessages } from './messages'
import { restoreTextValue } from '../internal/controlledText'
import { TableFilter } from './TableFilter'
import { TableDateFilter } from './TableDateFilter'
import type { TableDateRange } from './TableDateFilter'
import { Icon } from '../components/Icon'
import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  untrack,
} from 'solid-js'
import { Button, Input } from '../components/NativeFields'
import { Select, SelectField } from '../components/Select'
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

export type TableFilterValue = TableColumnFilterValue | boolean | TableDateRange

export type TableColumnFilterConfig =
  | { kind: 'boolean' | 'date-range' }
  | { kind: 'text' | 'number-range'; empty?: boolean }
  | {
      kind: 'select' | 'multi-select' | 'tags'
      choices: ReadonlyArray<TableChoice>
      empty?: boolean
      exclude?: boolean
    }

type ColumnFilterControlProps = {
  messages?: Partial<TableMessages>
  datePickerMessages?: Partial<DatePickerMessages>
  label: string
  clearLabel?: string
  config: TableColumnFilterConfig
  value: TableFilterValue | undefined
  onValueChange: (value: TableFilterValue | undefined) => void
  disabled?: boolean
  onEscape?: () => void
}

type BaseFilterProps = Omit<
  ColumnFilterControlProps,
  'config' | 'value' | 'onValueChange'
>
/** The default retains the original structured criterion contract. */
export type TableColumnFilterProps<
  C extends TableColumnFilterConfig = Exclude<
    TableColumnFilterConfig,
    { kind: 'boolean' | 'date-range' }
  >,
> = ConfiguredTableColumnFilterProps<C>

type FilterValueForKind<K> = K extends 'boolean'
  ? boolean
  : K extends 'date-range'
    ? TableDateRange
    : TableColumnFilterValue

/** Infer callback payloads from configuration, never from the callback itself. */
export type ConfiguredTableColumnFilterProps<
  C extends TableColumnFilterConfig,
> = BaseFilterProps & {
  config: C
  value: FilterValueForKind<NoInfer<C['kind']>> | undefined
  onValueChange: (
    value: FilterValueForKind<NoInfer<C['kind']>> | undefined,
  ) => void
}

/** Presentation of filter state. The caller owns choices and matching rules. */
export function TableColumnFilter<const C extends TableColumnFilterConfig>(
  input: ConfiguredTableColumnFilterProps<C>,
) {
  const props = input as ColumnFilterControlProps
  return (
    <Show
      when={props.config.kind !== 'boolean'}
      fallback={
        <TableFilter
          messages={props.messages}
          label={props.label}
          clearLabel={props.clearLabel}
          kind="boolean"
          value={typeof props.value === 'boolean' ? String(props.value) : ''}
          disabled={props.disabled}
          onValueChange={(value) =>
            props.onValueChange(value === '' ? undefined : value === 'true')
          }
        />
      }
    >
      <Show
        when={props.config.kind !== 'date-range'}
        fallback={
          <TableDateFilter
            datePickerMessages={props.datePickerMessages}
            messages={props.messages}
            label={props.label}
            value={
              typeof props.value === 'object' && !('operator' in props.value)
                ? props.value
                : undefined
            }
            disabled={props.disabled}
            onValueChange={props.onValueChange}
          />
        }
      >
        <OperatorFilter
          {...props}
          value={
            typeof props.value === 'object' && 'operator' in props.value
              ? props.value
              : undefined
          }
        />
      </Show>
    </Show>
  )
}

function OperatorFilter(
  props: Omit<ColumnFilterControlProps, 'value'> & {
    value: TableColumnFilterValue | undefined
  },
) {
  const messages = resolveTableMessages(() => props.messages)
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
            ['contains', messages.contains],
            ['equals', messages.equals],
            ['starts-with', messages.startsWith],
            ['not-contains', messages.notContains],
          ]
        : props.config.kind === 'number-range'
          ? [['between', messages.between]]
          : props.config.kind === 'tags'
            ? [
                ['any', messages.hasAny],
                ['all', messages.hasAll],
              ]
            : [['in', messages.is]]
    if ('exclude' in props.config && props.config.exclude)
      options.push([
        'not-in',
        props.config.kind === 'tags' ? messages.hasNone : messages.isNot,
      ])
    if ('empty' in props.config && props.config.empty)
      options.push(
        ['empty', messages.isEmpty],
        ['not-empty', messages.isNotEmpty],
      )
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
  let completedComposition: { value: string } | undefined
  function commitText(element: HTMLInputElement) {
    const value = element.value
    emit(
      value
        ? {
            operator: untrack(operator) as Extract<
              TableColumnFilterValue,
              { value: string }
            >['operator'],
            value,
          }
        : undefined,
    )
    restoreTextValue(element, untrack(textValue))
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
          aria-label={props.clearLabel ?? messages.clearFilter(props.label)}
          disabled={props.disabled || !props.value}
          onClick={clear}
        >
          ×
        </Button>
      </div>
      <SelectField
        label={messages.filterMatch(props.label)}
        data-ui-text="system"
        value={operator()}
        disabled={props.disabled}
        ref={(node) => {
          control = node
        }}
        choices={operations().map(([value, label]) => ({
          value: value!,
          label: label!,
        }))}
        onValueChange={(value) =>
          changeOperator(value as TableColumnFilterValue['operator'])
        }
      />
      <Show when={operator() !== 'empty' && operator() !== 'not-empty'}>
        <Show when={props.config.kind === 'text'}>
          <Input
            aria-label={props.label}
            ref={[
              (node) => {
                valueControl = node
              },
              nativeEvents<HTMLInputElement>({
                input: (event) => {
                  if (event.isComposing) return
                  const compositionInput =
                    event.inputType === 'insertCompositionText' ||
                    event.inputType === 'insertFromComposition'
                  const duplicate =
                    compositionInput &&
                    completedComposition?.value === event.currentTarget.value
                  completedComposition = undefined
                  if (duplicate)
                    restoreTextValue(event.currentTarget, untrack(textValue))
                  else commitText(event.currentTarget)
                },
                compositionstart: () => {
                  completedComposition = undefined
                },
                compositionend: (event) => {
                  const completed = { value: event.currentTarget.value }
                  completedComposition = completed
                  // A browser can deliver the marked final input after a microtask.
                  // Plain input and paste remain separate requests, even for equal text.
                  commitText(event.currentTarget)
                },
              }),
            ]}
            placeholder={messages.enterText}
            value={textValue()}
            disabled={props.disabled}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && !event.isComposing) {
                event.preventDefault()
                event.stopPropagation()
                if (props.onEscape) props.onEscape()
                else clear()
              }
            }}
          />
        </Show>
        <Show when={props.config.kind === 'number-range'}>
          <NumberBounds
            messages={props.messages}
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
                placeholder={messages.anyValue}
                disabled={props.disabled}
                {...selectionProps}
                itemComponent={(item) => (
                  <Select.Item item={item.item}>
                    <Select.ItemLabel>
                      {item.item.rawValue.label}
                    </Select.ItemLabel>
                    <Select.ItemIndicator>
                      <Icon class="ui-check-mark" name="check" />
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
  messages?: Partial<TableMessages>
  label: string
  value: Extract<TableColumnFilterValue, { operator: 'between' }> | undefined
  disabled?: boolean
  onValueChange: (value: TableColumnFilterValue | undefined) => void
  controlRef?: (node: HTMLInputElement) => void
}) {
  const messages = resolveTableMessages(() => props.messages)
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
            <span class="ui-label">
              {boundary === 'min' ? messages.minimum : messages.maximum}
            </span>
            <Input
              type="number"
              step="any"
              aria-label={
                boundary === 'min'
                  ? messages.numberMinimum(props.label)
                  : messages.numberMaximum(props.label)
              }
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
          {messages.invalidNumber}
        </span>
      </Show>
    </div>
  )
}
