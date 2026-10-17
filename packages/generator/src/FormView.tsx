import { For, Show, createMemo, createUniqueId, untrack } from 'solid-js'
import {
  Button,
  Checkbox,
  Field,
  FieldError,
  HelpText,
  Input,
  Label,
  SelectField,
  Switch,
  Textarea,
} from '@wfe/components'
import { nativeEvents } from '@wfe/components/events'
import type { Accessor, Component } from 'solid-js'
import type { FormContract, FormScalar } from '@wfe/form'
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
  StatusView,
  requireValue,
  uniqueIds,
  validateActions,
} from './shared'
import type { Actions } from './shared'

type RuntimeBindings<T extends object & { [K in keyof T]: FormScalar }> = {
  form: FormContract<T>
  choices?: Partial<
    Record<keyof T, Accessor<readonly FormChoice<FormScalar>[]>>
  >
  fields?: Partial<Record<keyof T, Component<CustomFieldProps<T, keyof T>>>>
  actions?: Actions
  disabled?: (field: Extract<keyof T, string>) => boolean
  readOnly?: (field: Extract<keyof T, string>) => boolean
  status?: Accessor<ViewStatus>
}

export function FormView<
  T extends object & { [K in keyof T]: FormScalar },
  D extends FormDescription<T>,
>(props: { description: D; bindings: FormViewBindings<T, D> }) {
  // Runtime dispatch erases each field's value type. Descriptions and guards select its control.
  const bindings = () => props.bindings as unknown as RuntimeBindings<T>
  const form = untrack(() => bindings().form)
  const identity = untrack(() => props.description.id)
  const domId = `generated-form-${createUniqueId()}`
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
    validateActions(value.actions ?? [], bindings().actions, value.submit)
    for (const field of value.fields) {
      const control = field.control
      requireValue(
        ['text', 'textarea', 'select', 'checkbox', 'switch', 'custom'].includes(
          control,
        ),
        `unsupported control "${control}"`,
      )
      if (control === 'custom')
        requireValue(
          Object.hasOwn(bindings().fields ?? {}, field.field) &&
            typeof bindings().fields?.[field.field] === 'function',
          `missing custom field "${field.field}"`,
        )
      else if (control === 'select')
        requireValue(
          Object.hasOwn(bindings().choices ?? {}, field.field) &&
            typeof bindings().choices?.[field.field] === 'function' &&
            typeof form.values[field.field] === 'string',
          `missing choices or incompatible select field "${field.field}"`,
        )
      else
        requireValue(
          typeof form.values[field.field] ===
            (control === 'text' || control === 'textarea'
              ? 'string'
              : 'boolean'),
          `incompatible control for field "${field.field}"`,
        )
    }
    return value
  })
  function FieldView(fieldProps: { field: FormFieldDescription<T> }) {
    const field = () => fieldProps.field
    const key: Extract<keyof T, string> = untrack(() => field().field)
    const control = untrack(() => field().control)
    const Custom = untrack(() => bindings().fields?.[key])
    const checkedField = createMemo(() => {
      requireValue(
        field().control === control && bindings().fields?.[key] === Custom,
        `remount field "${key}" to replace its control or custom component`,
      )
      return field()
    })
    const booleanControl = control === 'checkbox' || control === 'switch'
    const id = `${domId}-${encodeURIComponent(key)}`
    const disabled = () => Boolean(bindings().disabled?.(key))
    const readOnly = () => Boolean(bindings().readOnly?.(key))
    const set = (value: FormScalar) => {
      if (!disabled() && !readOnly()) form.setValue(key, value as T[typeof key])
    }
    const choices = () => {
      const current = bindings().choices?.[key]?.() ?? []
      requireValue(
        new Set(current.map((choice) => choice.value)).size === current.length,
        `duplicate choice for field "${key}"`,
      )
      requireValue(
        current.every((choice) => typeof choice.value === 'string'),
        `non-string choice for field "${key}"`,
      )
      return current as readonly FormChoice<string>[]
    }
    return (
      <Field
        controlId={id}
        required={checkedField().required}
        disabled={disabled()}
        readonly={readOnly()}
        invalid={Boolean(form.errors.fields?.[key])}
      >
        <Show when={!booleanControl}>
          <Label data-ui-text="system">{checkedField().label}</Label>
        </Show>
        {control === 'text' ? (
          <Input value={String(form.values[key])} onValueChange={set} />
        ) : control === 'textarea' ? (
          <Textarea value={String(form.values[key])} onValueChange={set} />
        ) : control === 'select' ? (
          <SelectField
            label={checkedField().label}
            choices={choices()}
            value={String(form.values[key])}
            onValueChange={(value) => {
              if (
                choices().some(
                  (choice) => choice.value === value && !choice.disabled,
                )
              )
                set(value)
            }}
          />
        ) : control === 'checkbox' ? (
          <Checkbox
            id={`${id}-toggle`}
            checked={form.values[key] === true}
            disabled={disabled()}
            readOnly={readOnly()}
            required={checkedField().required}
            validationState={form.errors.fields?.[key] ? 'invalid' : undefined}
            onChange={set}
          >
            <Checkbox.Input id={id} />
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Checkbox.Label data-ui-text="system">
              {checkedField().label}
            </Checkbox.Label>
            <Show when={checkedField().help}>
              <Checkbox.Description>{checkedField().help}</Checkbox.Description>
            </Show>
            <Checkbox.ErrorMessage>
              {form.errors.fields?.[key]}
            </Checkbox.ErrorMessage>
          </Checkbox>
        ) : control === 'switch' ? (
          <Switch
            id={`${id}-toggle`}
            checked={form.values[key] === true}
            disabled={disabled()}
            readOnly={readOnly()}
            required={checkedField().required}
            validationState={form.errors.fields?.[key] ? 'invalid' : undefined}
            onChange={set}
          >
            <Switch.Input id={id} />
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <Switch.Label data-ui-text="system">
              {checkedField().label}
            </Switch.Label>
            <Show when={checkedField().help}>
              <Switch.Description>{checkedField().help}</Switch.Description>
            </Show>
            <Switch.ErrorMessage>
              {form.errors.fields?.[key]}
            </Switch.ErrorMessage>
          </Switch>
        ) : Custom ? (
          <Custom
            id={id}
            field={key}
            value={form.values[key]}
            onValueChange={set}
            disabled={disabled()}
            readOnly={readOnly()}
          />
        ) : null}
        <Show when={!booleanControl && checkedField().help}>
          <HelpText>{checkedField().help}</HelpText>
        </Show>
        <Show when={!booleanControl}>
          <FieldError>{form.errors.fields?.[key]}</FieldError>
        </Show>
      </Field>
    )
  }
  return (
    <form
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
          if (description().submit) void form.submit()
        },
      })}
    >
      <Show when={description().title}>
        <h2 data-ui-text="system">{description().title}</h2>
      </Show>
      <For each={description().fields} keyed={(field) => field.field}>
        {(field) => <FieldView field={field()} />}
      </For>
      <Show when={form.errors.form}>
        <p role="alert">{form.errors.form}</p>
      </Show>
      <Show when={form.phase === 'error'}>
        <p role="alert">The form action failed.</p>
      </Show>
      <StatusView status={bindings().status} />
      <Show when={description().submit}>
        {(submit) => (
          <Button
            variant={submit().variant}
            tone={submit().tone}
            disabled={form.pending}
            type="submit"
          >
            {submit().label}
          </Button>
        )}
      </Show>
      <ActionsView
        descriptions={description().actions ?? []}
        bindings={bindings().actions}
      />
    </form>
  )
}
