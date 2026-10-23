import { isFormColumnCount, isFormSpan } from './guards'
import type { GeneratorControlMessageProps } from './controlMessages'
import { resolveGeneratorMessages } from './messages'
import type { GeneratorMessageProps } from './messages'
import { For, Show, createMemo, onCleanup, untrack } from 'solid-js'
import { Button, FieldError, FieldGroup, FormActions } from '@wfe/components'
import type { Accessor } from 'solid-js'
import type { FormScalar, FormRowErrors } from '@wfe/form'
import type { FormChoice, RepeatedFieldDescription } from './types'
import { ScalarField, validateScalarDescription } from './scalarField'
import type { RuntimeScalarField, RuntimeCustomField } from './scalarField'
import {
  descriptionLabel,
  keyPart,
  ownProperty,
  requireValue,
  uniqueIds,
} from './shared'

export type RuntimeRow = Readonly<Record<string, FormScalar>>
export type RuntimeRepeatedField = Omit<
  RepeatedFieldDescription<Record<string, FormScalar>>,
  'fields'
> & { fields: readonly RuntimeScalarField[] }
export type RuntimeRepeatedBinding = {
  rowKey: (row: RuntimeRow) => string
  createRow: () => RuntimeRow
  choices?: Readonly<
    Record<string, Accessor<readonly FormChoice<FormScalar>[]>>
  >
  fields?: Readonly<Record<string, RuntimeCustomField>>
}
export type RepeatedFieldAdapter = {
  rows: Accessor<readonly RuntimeRow[]>
  errors: Accessor<
    Readonly<Record<string, FormRowErrors<RuntimeRow>>> | undefined
  >
  error: Accessor<string | undefined>
  binding: Accessor<RuntimeRepeatedBinding | undefined>
  request: (rows: readonly RuntimeRow[]) => void
  disabled: Accessor<boolean>
  readOnly: Accessor<boolean>
}
export function validateRepeatedDescription(field: RuntimeRepeatedField) {
  descriptionLabel(field.label, field.field)
  requireValue(
    field.columns === undefined || isFormColumnCount(field.columns),
    `unsupported repeated column count "${field.field}"`,
  )
  uniqueIds(
    field.fields.map((child) => child.field),
    'repeated field',
  )
  for (const child of field.fields) {
    validateScalarDescription(child)
    requireValue(
      isFormSpan(child.span, field.columns ?? 1),
      `unsupported span for field "${child.field}"`,
    )
  }
}

export function RepeatedField(
  props: GeneratorMessageProps &
    GeneratorControlMessageProps & {
      field: RuntimeRepeatedField
      id: string
      adapter: RepeatedFieldAdapter
    },
) {
  const messages = resolveGeneratorMessages(() => props.messages)
  const identity = untrack(() => props.field.field)
  let alive = true,
    focusRequest = 0
  onCleanup(() => {
    alive = false
    focusRequest++
  })
  let addButton: HTMLButtonElement | undefined
  const binding = createMemo(() => {
    const value = props.adapter.binding()
    requireValue(
      value &&
        typeof value.rowKey === 'function' &&
        typeof value.createRow === 'function',
      `missing repeated binding "${identity}"`,
    )
    return value
  })
  const description = createMemo(() => {
    const field = props.field
    requireValue(
      field.field === identity && field.control === 'repeat',
      `remount field "${identity}" to replace its control`,
    )
    validateRepeatedDescription(field)
    for (const child of field.fields) {
      if (child.control === 'custom')
        requireValue(
          Object.hasOwn(binding().fields ?? {}, child.field) &&
            typeof binding().fields?.[child.field] === 'function',
          `missing custom field "${child.field}"`,
        )
      if (child.control === 'select')
        requireValue(
          Object.hasOwn(binding().choices ?? {}, child.field) &&
            typeof binding().choices?.[child.field] === 'function',
          `missing choices for field "${child.field}"`,
        )
    }
    return field
  })
  function items(rows: readonly RuntimeRow[]) {
    requireValue(
      Array.isArray(rows),
      `incompatible repeated field "${identity}"`,
    )
    const result = Array.from(rows, (row) => {
      requireValue(
        row !== null && typeof row === 'object' && !Array.isArray(row),
        `invalid row for field "${identity}"`,
      )
      return { key: binding().rowKey(row), row }
    })
    uniqueIds(
      result.map((item) => item.key),
      'repeated row',
    )
    return result
  }
  const model = createMemo(() => items(props.adapter.rows()))
  const label = () => descriptionLabel(description().label, identity)
  const locked = () => props.adapter.disabled() || props.adapter.readOnly()
  const rowId = (key: string) => `${props.id}-row-${keyPart(key)}`
  function replaceRow(key: string, field: string, value: FormScalar) {
    if (!alive || locked()) return
    const current = untrack(model)
    if (!current.some((item) => item.key === key)) return
    props.adapter.request(
      current.map((item) =>
        item.key === key ? { ...item.row, [field]: value } : item.row,
      ),
    )
  }
  function eligible(
    element: HTMLElement | null | undefined,
  ): element is HTMLElement {
    if (
      !element?.isConnected ||
      !document.getElementById(props.id)?.contains(element) ||
      element.matches(':disabled') ||
      element.closest('[hidden], [inert], [aria-hidden="true"]')
    )
      return false
    for (
      let ancestor: Element | null = element;
      ancestor;
      ancestor = ancestor.parentElement
    ) {
      const style = getComputedStyle(ancestor)
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.visibility === 'collapse'
      )
        return false
    }
    return true
  }
  function add() {
    if (!alive || locked()) return
    const current = untrack(model)
    const row = binding().createRow()
    if (!alive || locked()) return
    const next = items([...current.map((item) => item.row), row])
    const key = next.at(-1)!.key
    const request = ++focusRequest
    props.adapter.request(next.map((item) => item.row))
    if (typeof document === 'undefined') return
    queueMicrotask(() =>
      untrack(() => {
        if (
          !alive ||
          request !== focusRequest ||
          locked() ||
          document.activeElement !== addButton ||
          !model().some((item) => item.key === key)
        )
          return
        const row = document.getElementById(rowId(key))
        const target = row?.querySelector<HTMLElement>(
          'input:not([type="hidden"]):not(:disabled), textarea:not(:disabled), button:not(:disabled)',
        )
        if (eligible(target)) target.focus({ preventScroll: true })
      }),
    )
  }
  function remove(key: string, button: HTMLButtonElement) {
    if (!alive || locked()) return
    const current = untrack(model)
    if (!current.some((item) => item.key === key)) return
    const request = ++focusRequest
    const focused =
      typeof document !== 'undefined' && document.activeElement === button
    props.adapter.request(
      current.filter((item) => item.key !== key).map((item) => item.row),
    )
    if (typeof document === 'undefined') return
    queueMicrotask(() =>
      untrack(() => {
        if (
          !alive ||
          request !== focusRequest ||
          !focused ||
          locked() ||
          model().some((item) => item.key === key) ||
          (document.activeElement !== document.body &&
            document.activeElement !== button) ||
          !eligible(addButton)
        )
          return
        addButton.focus({ preventScroll: true })
      }),
    )
  }
  const groupErrorId = () => `${props.id}-error`
  return (
    <FieldGroup
      id={props.id}
      title={label()}
      help={description().help}
      span={description().span}
      data-generator-field={identity}
      disabled={props.adapter.disabled()}
      aria-invalid={props.adapter.error() ? 'true' : undefined}
      aria-describedby={props.adapter.error() ? groupErrorId() : undefined}
    >
      <For each={model()} keyed={(item) => item.key}>
        {(item, index) => {
          const key = untrack(() => item().key)
          const errors = () => {
            const map = props.adapter.errors()
            return map && Object.hasOwn(map, key) ? map[key] : undefined
          }
          return (
            <FieldGroup
              id={rowId(key)}
              title={messages.repeatedRowTitle(label(), index() + 1)}
              columns={description().columns}
              data-generator-row={key}
              aria-invalid={
                errors()?.row ||
                Object.values(errors()?.fields ?? {}).some(Boolean)
                  ? 'true'
                  : undefined
              }
              aria-describedby={
                errors()?.row ? `${rowId(key)}-error` : undefined
              }
            >
              <For each={description().fields} keyed={(field) => field.field}>
                {(field) => (
                  <ScalarField
                    controlMessages={props.controlMessages}
                    field={field()}
                    id={`${rowId(key)}-field-${keyPart(field().field)}`}
                    adapter={{
                      value: () => item().row[field().field],
                      error: () => {
                        const fields = errors()?.fields
                        return fields && Object.hasOwn(fields, field().field)
                          ? fields[field().field]
                          : undefined
                      },
                      setValue: (value) =>
                        replaceRow(key, field().field, value),
                      choices: () =>
                        ownProperty(binding().choices, field().field)?.(),
                      custom: () =>
                        ownProperty(binding().fields, field().field),
                      disabled: props.adapter.disabled,
                      readOnly: props.adapter.readOnly,
                    }}
                  />
                )}
              </For>
              <Show when={errors()?.row}>
                <FieldError id={`${rowId(key)}-error`} data-form-span="full">
                  {errors()?.row}
                </FieldError>
              </Show>
              <FormActions data-form-span="full">
                <Button
                  aria-label={messages.removeRowLabel(label(), index() + 1)}
                  disabled={locked()}
                  onClick={(event) => remove(key, event.currentTarget)}
                >
                  {messages.removeRow}
                </Button>
              </FormActions>
            </FieldGroup>
          )
        }}
      </For>
      <Show when={props.adapter.error()}>
        <FieldError id={groupErrorId()}>{props.adapter.error()}</FieldError>
      </Show>
      <FormActions>
        <Button
          ref={(node) => {
            addButton = node
          }}
          disabled={locked()}
          onClick={add}
        >
          {messages.addRow}
        </Button>
      </FormActions>
    </FieldGroup>
  )
}
