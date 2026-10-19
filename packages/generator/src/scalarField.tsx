import { Show, createMemo, untrack, onCleanup } from 'solid-js'
import {
  FieldValue,
  DatePicker,
  DateTimePicker,
  Checkbox,
  Field,
  FieldError,
  HelpText,
  Input,
  NumberInput,
  Label,
  SelectField,
  Switch,
  Textarea,
} from '@wfe/components'
import type { Accessor, Component } from 'solid-js'
import type { FormScalar } from '@wfe/form'
import type {
  CustomFieldProps,
  DateControlDescription,
  DateTimeControlDescription,
  NumberControlDescription,
  FormChoice,
  FieldPresentation,
} from './types'
import { descriptionLabel, requireValue, validatePresentation } from './shared'

export type RuntimeScalarField = FieldPresentation & { field: string } & (
    | {
        control:
          'text' | 'textarea' | 'select' | 'checkbox' | 'switch' | 'custom'
      }
    | DateControlDescription
    | DateTimeControlDescription
    | (NumberControlDescription & { empty?: 'reject' | 'null' | 'undefined' })
  )
export type RuntimeCustomField = Component<
  CustomFieldProps<Record<string, FormScalar>, string>
>
export type ScalarFieldAdapter = {
  value: Accessor<FormScalar>
  error: Accessor<string | undefined>
  setValue: (value: FormScalar) => void
  choices: Accessor<readonly FormChoice<FormScalar>[] | undefined>
  custom: Accessor<RuntimeCustomField | undefined>
  disabled: Accessor<boolean>
  readOnly: Accessor<boolean>
}
export function validateScalarDescription(field: RuntimeScalarField) {
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
  if (control === 'number')
    requireValue(
      field.empty === undefined ||
        ['reject', 'null', 'undefined'].includes(field.empty),
      `incompatible numeric field "${field.field}"`,
    )
}
export function validateScalarField(
  field: RuntimeScalarField,
  adapter: ScalarFieldAdapter,
) {
  validateScalarDescription(field)
  const control = field.control
  if (control === 'custom') {
    requireValue(
      typeof adapter.custom() === 'function',
      `missing custom field "${field.field}"`,
    )
    return
  }
  const current = adapter.value()
  if (control === 'number') {
    const empty = field.empty ?? 'reject'
    requireValue(
      ['reject', 'null', 'undefined'].includes(empty) &&
        ((typeof current === 'number' && Number.isFinite(current)) ||
          (empty === 'null' && current === null) ||
          (empty === 'undefined' && current === undefined)),
      `incompatible numeric field "${field.field}"`,
    )
  } else if (control === 'select') {
    requireValue(
      adapter.choices() !== undefined && typeof current === 'string',
      `missing choices or incompatible select field "${field.field}"`,
    )
  } else
    requireValue(
      typeof current ===
        (['text', 'textarea', 'date', 'datetime'].includes(control)
          ? 'string'
          : 'boolean'),
      `incompatible control for field "${field.field}"`,
    )
}

export function ScalarField(props: {
  field: RuntimeScalarField
  id: string
  adapter: ScalarFieldAdapter
}) {
  const field = () => props.field
  const key = untrack(() => field().field)
  const control = untrack(() => field().control)
  const Custom = untrack(() => props.adapter.custom())
  const checkedField = createMemo(() => {
    requireValue(
      field().control === control && props.adapter.custom() === Custom,
      `remount field "${key}" to replace its control or custom component`,
    )
    validateScalarField(field(), props.adapter)
    return field()
  })
  const dateDescription = () => {
    const value = checkedField()
    requireValue(
      value.control === 'date' || value.control === 'datetime',
      'Date controls require a date description',
    )
    return value as RuntimeScalarField &
      (DateControlDescription | DateTimeControlDescription)
  }
  const datetimeDescription = () => {
    const value = dateDescription()
    requireValue(
      value.control === 'datetime',
      'Datetime controls require a datetime description',
    )
    return value as RuntimeScalarField & DateTimeControlDescription
  }
  const numberDescription = () => {
    const value = checkedField()
    requireValue(
      value.control === 'number',
      'Numeric controls require a number description',
    )
    return value as RuntimeScalarField &
      NumberControlDescription & { empty?: 'reject' | 'null' | 'undefined' }
  }
  const label = () => descriptionLabel(checkedField().label, key)
  const booleanControl = control === 'checkbox' || control === 'switch'
  const id = untrack(() => props.id)
  const disabled = () => props.adapter.disabled()
  const readOnly = () => props.adapter.readOnly()
  const formatted = () =>
    readOnly() && control !== 'custom' && checkedField().format !== undefined
  const separateLabel = () => !booleanControl || formatted()
  let alive = true
  onCleanup(() => {
    alive = false
  })
  const set = (value: FormScalar) => {
    if (alive && !disabled() && !readOnly()) props.adapter.setValue(value)
  }
  const choices = () => {
    const current = props.adapter.choices() ?? []
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
      invalid={Boolean(props.adapter.error())}
    >
      <Show when={separateLabel()}>
        <Label data-ui-text="system">{label()}</Label>
      </Show>
      <Show
        when={formatted()}
        fallback={
          control === 'text' ? (
            <Input value={String(props.adapter.value())} onValueChange={set} />
          ) : control === 'textarea' ? (
            <Textarea
              value={String(props.adapter.value())}
              onValueChange={set}
            />
          ) : control === 'number' ? (
            <NumberInput
              value={
                (props.adapter.value() as number | null | undefined) ??
                undefined
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
              value={String(props.adapter.value()) || undefined}
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
              value={String(props.adapter.value()) || undefined}
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
              value={String(props.adapter.value())}
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
              checked={props.adapter.value() === true}
              disabled={disabled()}
              readOnly={readOnly()}
              required={checkedField().required}
              validationState={props.adapter.error() ? 'invalid' : undefined}
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
                {props.adapter.error()}
              </Checkbox.ErrorMessage>
            </Checkbox>
          ) : control === 'switch' ? (
            <Switch
              id={`${id}-toggle`}
              checked={props.adapter.value() === true}
              disabled={disabled()}
              readOnly={readOnly()}
              required={checkedField().required}
              validationState={props.adapter.error() ? 'invalid' : undefined}
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
              <Switch.ErrorMessage>{props.adapter.error()}</Switch.ErrorMessage>
            </Switch>
          ) : Custom ? (
            <Custom
              id={id}
              field={key}
              value={props.adapter.value()}
              onValueChange={set}
              disabled={disabled()}
              readOnly={readOnly()}
            />
          ) : null
        }
      >
        <FieldValue
          value={props.adapter.value()}
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
        <FieldError>{props.adapter.error()}</FieldError>
      </Show>
    </Field>
  )
}
