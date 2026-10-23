import type { GeneratorControlMessageProps } from './controlMessages'
import type { GeneratorMessageProps } from './messages'
import { For, Show, createMemo, createUniqueId, untrack } from 'solid-js'
import { Field, Label, HelpText, FieldValue, FormGrid } from '@wfe/components'
import type { DetailDescription, DetailViewBindings } from './types'
import {
  ActionsView,
  StatusView,
  descriptionLabel,
  keyPart,
  requireValue,
  uniqueIds,
  validateActions,
  validatePresentation,
} from './shared'
import type { Actions } from './shared'

export function DetailView<T extends object, D extends DetailDescription<T>>(
  props: GeneratorMessageProps &
    GeneratorControlMessageProps & {
      description: D
      bindings: DetailViewBindings<T, D>
    },
) {
  const identity = untrack(() => props.description.id)
  const domId = `generated-detail-${createUniqueId()}`
  const description = createMemo(() => {
    const value = props.description
    requireValue(
      value.id === identity,
      'remount the detail view to replace its identity',
    )
    uniqueIds([value.id], 'detail')
    uniqueIds(
      value.fields.map((field) => field.field),
      'detail field',
    )
    descriptionLabel(value.title, value.id)
    const columns = value.columns ?? 1
    requireValue(
      columns === 1 || columns === 2 || columns === 3,
      'unsupported detail column count',
    )
    for (const field of value.fields) {
      descriptionLabel(field.label, field.field)
      validatePresentation(field, `detail field "${field.field}"`)
      requireValue(
        field.span === undefined ||
          field.span === 'full' ||
          (Number.isInteger(field.span) &&
            Number(field.span) >= 1 &&
            Number(field.span) <= columns),
        'unsupported detail field span',
      )
    }
    validateActions(
      value.actions ?? [],
      (props.bindings as { actions?: Actions }).actions,
    )
    return value
  })
  const record = createMemo(() => {
    const value = props.bindings.record()
    requireValue(
      typeof value === 'object' && value !== null && !Array.isArray(value),
      'detail view requires one record',
    )
    return value
  })
  function checkedId() {
    record()
    return description().id
  }
  return (
    <section
      id={domId}
      class="ui-form"
      data-ui=""
      data-generator-detail={checkedId()}
      aria-label={descriptionLabel(description().title, identity)}
    >
      <Show when={description().title}>
        <h2 data-ui-text="system">{description().title}</h2>
      </Show>
      <StatusView messages={props.messages} status={props.bindings.status} />
      <FormGrid columns={description().columns}>
        <For each={description().fields} keyed={(field) => field.field}>
          {(field) => (
            <Field
              controlId={`${domId}-${keyPart(field().field)}`}
              readonly
              data-form-span={field().span ?? 1}
              data-generator-field={field().field}
            >
              <Label>{descriptionLabel(field().label, field().field)}</Label>
              <FieldValue
                messages={props.controlMessages?.valueDisplay}
                id={`${domId}-${keyPart(field().field)}`}
                value={record()[field().field]}
                format={field().format}
                locale={field().formatOptions?.locale}
                dateFormat={field().formatOptions?.dateFormat}
                timeFormat={field().formatOptions?.timeFormat}
                timeZone={field().formatOptions?.timeZone}
              />
              <Show when={field().help}>
                <HelpText>{field().help}</HelpText>
              </Show>
            </Field>
          )}
        </For>
      </FormGrid>
      <div class="ui-form-actions">
        <ActionsView
          descriptions={description().actions ?? []}
          bindings={(props.bindings as { actions?: Actions }).actions}
        />
      </div>
    </section>
  )
}
