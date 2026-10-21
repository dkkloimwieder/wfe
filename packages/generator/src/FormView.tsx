import { RepeatedField } from './repeatedField'
import type {
  RuntimeRow,
  RuntimeRepeatedField,
  RuntimeRepeatedBinding,
} from './repeatedField'
import { ScalarField } from './scalarField'
import type { RuntimeCustomField, RuntimeScalarField } from './scalarField'
import { preserveReorderFocus } from './reorderFocus'
import { For, Show, createMemo, createUniqueId, untrack } from 'solid-js'
import { Button, FormGrid, FieldGroup } from '@wfe/components'
import { nativeEvents } from '@wfe/components/events'
import type { Accessor, Component } from 'solid-js'
import type {
  FormContract,
  FormScalar,
  FormShape,
  FormRowErrors,
} from '@wfe/form'
import type {
  CustomFieldProps,
  FormChoice,
  FormDescription,
  FormFieldDescription,
  FormViewBindings,
  ViewStatus,
} from './types'
import {
  ActionsView,
  descriptionLabel,
  StatusView,
  requireValue,
  uniqueIds,
  validateActions,
  keyPart,
  ownProperty,
} from './shared'
import type { Actions } from './shared'

type RuntimeBindings<T extends object & FormShape<T>> = {
  form: FormContract<T>
  choices?: Partial<
    Record<keyof T, Accessor<readonly FormChoice<FormScalar>[]>>
  >
  fields?: Partial<Record<keyof T, Component<CustomFieldProps<T, keyof T>>>>
  repeated?: Partial<Record<keyof T, RuntimeRepeatedBinding>>
  actions?: Actions
  disabled?: (field: Extract<keyof T, string>) => boolean
  readOnly?: (field: Extract<keyof T, string>) => boolean
  status?: Accessor<ViewStatus>
}

export function FormView<
  T extends object & FormShape<T>,
  D extends FormDescription<T>,
>(props: { description: D; bindings: FormViewBindings<T, D> }) {
  // Runtime dispatch erases each field's value type. Descriptions and guards select its control.
  const bindings = () => props.bindings as unknown as RuntimeBindings<T>
  const form = untrack(() => bindings().form)
  const identity = untrack(() => props.description.id)
  const domId = `generated-form-${createUniqueId()}`
  let regions = new Map<string, string | undefined>()
  const description = createMemo(() => {
    const value = props.description
    requireValue(
      value.id === identity && bindings().form === form,
      'remount the form view to replace its identity or form instance',
    )
    uniqueIds([value.id], 'form')
    uniqueIds(
      value.fields.map((field) => field.field),
      'field',
    )
    const columns = value.layout?.columns ?? 1
    const validColumns = (count: unknown) =>
      count === 1 || count === 2 || count === 3
    const validSpan = (span: unknown, count: number) =>
      span === undefined ||
      span === 'full' ||
      (typeof span === 'number' &&
        Number.isInteger(span) &&
        span >= 1 &&
        span <= count)
    requireValue(validColumns(columns), 'unsupported form column count')
    const groups = value.layout?.groups
    const nextRegions = new Map<string, string | undefined>()
    if (groups !== undefined) {
      uniqueIds(
        groups.map((group) => group.id),
        'form group',
      )
      const references = groups.flatMap((group) => group.fields)
      uniqueIds(references, 'grouped field')
      requireValue(
        references.length === value.fields.length &&
          references.every((key) =>
            value.fields.some((field) => field.field === key),
          ),
        'form groups must reference every described field exactly once',
      )
      for (const group of groups) {
        requireValue(
          typeof group.title === 'string' && Boolean(group.title.trim()),
          'form groups require a title',
        )
        requireValue(
          validColumns(group.columns ?? 1),
          'unsupported group column count',
        )
        requireValue(
          validSpan(group.span, columns),
          'unsupported form group span',
        )
        for (const key of group.fields) nextRegions.set(key, group.id)
      }
    } else
      for (const field of value.fields) nextRegions.set(field.field, undefined)
    for (const field of value.fields) {
      const groupId = nextRegions.get(field.field)
      const groupColumns =
        groups === undefined
          ? columns
          : (groups.find((group) => group.id === groupId)?.columns ?? 1)
      requireValue(
        validSpan(field.span, groupColumns),
        `unsupported span for field "${field.field}"`,
      )
      requireValue(
        !regions.has(field.field) || regions.get(field.field) === groupId,
        `remount the form view to move field "${field.field}" between groups`,
      )
    }
    regions = nextRegions
    validateActions(value.actions ?? [], bindings().actions, value.submit)
    return value
  })
  const fieldError = (key: keyof T) =>
    form.errors.fields && Object.hasOwn(form.errors.fields, key)
      ? form.errors.fields[key]
      : undefined
  function FieldView(fieldProps: { field: FormFieldDescription<T> }) {
    const field = () =>
      fieldProps.field as unknown as RuntimeScalarField | RuntimeRepeatedField
    const key = untrack(() => field().field) as Extract<keyof T, string>
    const control = untrack(() => field().control)
    const checked = createMemo(() => {
      requireValue(
        field().control === control,
        `remount field "${key}" to replace its control`,
      )
      return field()
    })
    const id = `${domId}-field-${keyPart(key)}`
    const disabled = () => Boolean(bindings().disabled?.(key))
    const readOnly = () => Boolean(bindings().readOnly?.(key))
    return control === 'repeat' ? (
      <RepeatedField
        field={checked() as RuntimeRepeatedField}
        id={id}
        adapter={{
          rows: () => form.values[key] as readonly RuntimeRow[],
          error: () => fieldError(key),
          errors: () => {
            const rows = form.errors.rows as
              | Readonly<
                  Record<
                    string,
                    Readonly<Record<string, FormRowErrors<RuntimeRow>>>
                  >
                >
              | undefined
            return rows && Object.hasOwn(rows, key) ? rows[key] : undefined
          },
          binding: () => ownProperty(bindings().repeated, key),
          request: (rows) => form.setValue(key, rows as T[typeof key]),
          disabled,
          readOnly,
        }}
      />
    ) : (
      <ScalarField
        field={checked() as RuntimeScalarField}
        id={id}
        adapter={{
          value: () => form.values[key] as FormScalar,
          error: () => fieldError(key),
          setValue: (value) => form.setValue(key, value as T[typeof key]),
          custom: () =>
            ownProperty(bindings().fields, key) as
              RuntimeCustomField | undefined,
          choices: () => {
            const choices = ownProperty(bindings().choices, key)
            return typeof choices === 'function' ? choices() : undefined
          },
          disabled,
          readOnly,
        }}
      />
    )
  }
  const groupedFields = createMemo(
    () =>
      new Map(
        description().fields.map((field) => [field.field as string, field]),
      ),
  )
  preserveReorderFocus(domId, () => {
    const current = description()
    const keys =
      current.layout?.groups?.flatMap((group) => group.fields) ??
      current.fields.map((field) => field.field)
    return keys.flatMap((key) => {
      const field = groupedFields().get(key)! as unknown as
        RuntimeScalarField | RuntimeRepeatedField
      const order = [JSON.stringify(['field', key])]
      if (field.control !== 'repeat') return order
      const rows = form.values[key as keyof T]
      const binding = ownProperty(bindings().repeated, key as keyof T)
      if (!Array.isArray(rows) || typeof binding?.rowKey !== 'function')
        return order
      const group = field as RuntimeRepeatedField
      return [
        ...order,
        ...rows.flatMap((row) =>
          group.fields.map((child) =>
            JSON.stringify(['row', key, binding.rowKey(row), child.field]),
          ),
        ),
      ]
    })
  })
  return (
    <form
      data-ui=""
      class="ui-form"
      id={domId}
      data-generator-view={description().id}
      aria-label={description().title ?? description().id}
      aria-busy={
        form.pending || bindings().status?.().loading ? 'true' : 'false'
      }
      novalidate
      ref={nativeEvents<HTMLFormElement>({
        submit: (event) => {
          event.preventDefault()
          const invalid = [
            ...event.currentTarget.querySelectorAll<HTMLInputElement>(
              'input[data-ui-invalid-input]',
            ),
          ].find(
            (input) =>
              input.isConnected &&
              !input.matches(':disabled') &&
              !input.readOnly &&
              input.form === event.currentTarget,
          )
          if (invalid) {
            invalid.focus()
            return
          }
          if (description().submit) void form.submit()
        },
      })}
    >
      <Show when={description().title}>
        <h2 data-ui-text="system">{description().title}</h2>
      </Show>
      <Show
        when={description().layout?.groups !== undefined}
        fallback={
          <FormGrid columns={description().layout?.columns}>
            <For each={description().fields} keyed={(field) => field.field}>
              {(field) => <FieldView field={field()} />}
            </For>
          </FormGrid>
        }
      >
        <FormGrid columns={description().layout?.columns}>
          <For
            each={description().layout?.groups ?? []}
            keyed={(group) => group.id}
          >
            {(group) => (
              <FieldGroup
                data-generator-group={group().id}
                title={group().title}
                help={group().help}
                columns={group().columns}
                span={group().span}
              >
                <For each={group().fields}>
                  {(key) => <FieldView field={groupedFields().get(key)!} />}
                </For>
              </FieldGroup>
            )}
          </For>
        </FormGrid>
      </Show>
      <Show when={form.errors.form}>
        <p role="alert">{form.errors.form}</p>
      </Show>
      <Show when={form.phase === 'error'}>
        <p role="alert">The form action failed.</p>
      </Show>
      <StatusView status={bindings().status} />
      <Show when={description().submit || description().actions?.length}>
        <div class="ui-form-actions">
          <Show when={description().submit}>
            {(submit) => (
              <Button
                variant={submit().variant}
                tone={submit().tone}
                disabled={form.pending}
                type="submit"
              >
                {descriptionLabel(submit().label, submit().id)}
              </Button>
            )}
          </Show>
          <ActionsView
            descriptions={description().actions ?? []}
            bindings={bindings().actions}
          />
        </div>
      </Show>
    </form>
  )
}
