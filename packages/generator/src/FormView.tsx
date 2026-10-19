import { preserveReorderFocus } from './reorderFocus'
import { For, Show, createMemo, createUniqueId, untrack } from 'solid-js'
import {
  FieldValue,
  Button,
  DatePicker,
  DateTimePicker,
  Checkbox,
  Field,
  FieldError,
  FormGrid,
  FieldGroup,
  HelpText,
  Input,
  NumberInput,
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
  DateControlDescription,
  DateTimeControlDescription,
  NumberControlDescription,
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
  validatePresentation,
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
    for (const field of value.fields) {
      descriptionLabel(field.label, field.field)
      validatePresentation(field, `field "${field.field}"`)
      const control = field.control
      requireValue(
        [
          'text',
          'textarea',
          'date',
          'datetime',
          'number',
          'select',
          'checkbox',
          'switch',
          'custom',
        ].includes(control),
        `unsupported control "${control}"`,
      )
      if (control === 'custom')
        requireValue(
          Object.hasOwn(bindings().fields ?? {}, field.field) &&
            typeof bindings().fields?.[field.field] === 'function',
          `missing custom field "${field.field}"`,
        )
      else if (control === 'number') {
        const current = form.values[field.field]
        const numeric = field as FormFieldDescription<T> &
          NumberControlDescription & { empty?: 'reject' | 'null' | 'undefined' }
        const empty = numeric.empty === undefined ? 'reject' : numeric.empty
        requireValue(
          ['reject', 'null', 'undefined'].includes(empty) &&
            ((typeof current === 'number' && Number.isFinite(current)) ||
              (empty === 'null' && current === null) ||
              (empty === 'undefined' && current === undefined)),
          `incompatible numeric field "${field.field}"`,
        )
      } else if (control === 'select')
        requireValue(
          Object.hasOwn(bindings().choices ?? {}, field.field) &&
            typeof bindings().choices?.[field.field] === 'function' &&
            typeof form.values[field.field] === 'string',
          `missing choices or incompatible select field "${field.field}"`,
        )
      else
        requireValue(
          typeof form.values[field.field] ===
            (['text', 'textarea', 'date', 'datetime'].includes(control)
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
    const dateDescription = () => {
      const value = checkedField()
      requireValue(
        value.control === 'date' || value.control === 'datetime',
        'Date controls require a date description',
      )
      return value as FormFieldDescription<T> &
        (DateControlDescription | DateTimeControlDescription)
    }
    const datetimeDescription = () => {
      const value = dateDescription()
      requireValue(
        value.control === 'datetime',
        'Datetime controls require a datetime description',
      )
      return value as FormFieldDescription<T> & DateTimeControlDescription
    }
    const numberDescription = () => {
      const value = checkedField()
      requireValue(
        value.control === 'number',
        'Numeric controls require a number description',
      )
      return value as FormFieldDescription<T> &
        NumberControlDescription & { empty?: 'reject' | 'null' | 'undefined' }
    }
    const label = () => descriptionLabel(checkedField().label, key)
    const booleanControl = control === 'checkbox' || control === 'switch'
    const id = `${domId}-${encodeURIComponent(key)}`
    const disabled = () => Boolean(bindings().disabled?.(key))
    const readOnly = () => Boolean(bindings().readOnly?.(key))
    const formatted = () =>
      readOnly() && control !== 'custom' && checkedField().format !== undefined
    const separateLabel = () => !booleanControl || formatted()
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
        data-form-span={checkedField().span ?? 1}
        data-generator-field={key}
        required={checkedField().required}
        disabled={disabled()}
        readonly={readOnly()}
        invalid={Boolean(form.errors.fields?.[key])}
      >
        <Show when={separateLabel()}>
          <Label data-ui-text="system">{label()}</Label>
        </Show>
        <Show
          when={formatted()}
          fallback={
            control === 'text' ? (
              <Input value={String(form.values[key])} onValueChange={set} />
            ) : control === 'textarea' ? (
              <Textarea value={String(form.values[key])} onValueChange={set} />
            ) : control === 'number' ? (
              <NumberInput
                value={
                  (form.values[key] as number | null | undefined) ?? undefined
                }
                min={numberDescription().min}
                max={numberDescription().max}
                allowEmpty={
                  numberDescription().empty === 'null' ||
                  numberDescription().empty === 'undefined'
                }
                onValueChange={(value) => {
                  if (value !== undefined) set(value)
                  else if (numberDescription().empty === 'null') set(null)
                  else if (numberDescription().empty === 'undefined')
                    set(undefined)
                }}
              />
            ) : control === 'date' ? (
              <DatePicker
                label={label()}
                value={String(form.values[key]) || undefined}
                dateFormat={dateDescription().dateFormat}
                locale={dateDescription().locale}
                min={dateDescription().min}
                max={dateDescription().max}
                startOfWeek={dateDescription().startOfWeek}
                onValueChange={(value) => set(value ?? '')}
              />
            ) : control === 'datetime' ? (
              <DateTimePicker
                label={label()}
                value={String(form.values[key]) || undefined}
                dateFormat={datetimeDescription().dateFormat}
                timeFormat={datetimeDescription().timeFormat}
                locale={datetimeDescription().locale}
                timeZone={datetimeDescription().timeZone}
                disambiguation={datetimeDescription().disambiguation}
                min={datetimeDescription().min}
                max={datetimeDescription().max}
                startOfWeek={datetimeDescription().startOfWeek}
                onValueChange={(value) => set(value ?? '')}
              />
            ) : control === 'select' ? (
              <SelectField
                label={label()}
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
                validationState={
                  form.errors.fields?.[key] ? 'invalid' : undefined
                }
                onChange={set}
              >
                <Checkbox.Input id={id} />
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <Checkbox.Label data-ui-text="system">{label()}</Checkbox.Label>
                <Show when={checkedField().help}>
                  <Checkbox.Description>
                    {checkedField().help}
                  </Checkbox.Description>
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
                validationState={
                  form.errors.fields?.[key] ? 'invalid' : undefined
                }
                onChange={set}
              >
                <Switch.Input id={id} />
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                <Switch.Label data-ui-text="system">{label()}</Switch.Label>
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
            ) : null
          }
        >
          <FieldValue
            value={form.values[key]}
            format={checkedField().format}
            locale={checkedField().formatOptions?.locale}
            dateFormat={checkedField().formatOptions?.dateFormat}
            timeFormat={checkedField().formatOptions?.timeFormat}
            timeZone={checkedField().formatOptions?.timeZone}
          />
        </Show>
        <Show when={separateLabel() && checkedField().help}>
          <HelpText>{checkedField().help}</HelpText>
        </Show>
        <Show when={separateLabel()}>
          <FieldError>{form.errors.fields?.[key]}</FieldError>
        </Show>
      </Field>
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
    return (
      current.layout?.groups?.flatMap((group) => [
        `group:${group.id}`,
        ...group.fields.map((key) => `field:${key}`),
      ]) ?? current.fields.map((field) => `field:${field.field}`)
    )
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
    </form>
  )
}
