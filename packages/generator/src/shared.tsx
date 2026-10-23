import { resolveGeneratorMessages } from './messages'
import type { GeneratorMessageProps } from './messages'
import { For, Show, createMemo } from 'solid-js'
import {
  Button,
  InlineAlert,
  isValueFormat,
  isButtonVariant,
  isButtonTone,
} from '@wfe/components'
import type { Accessor, Component } from 'solid-js'
import type {
  ActionBinding,
  ActionDescription,
  ColumnPresentation,
  ViewStatus,
} from './types'

export function requireValue(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(`Generator: ${message}`)
}

export function uniqueIds(ids: readonly string[], kind: string) {
  const seen = new Set<string>()
  for (const id of ids) {
    requireValue(
      typeof id === 'string' && id.trim(),
      `${kind} identity is empty`,
    )
    requireValue(!seen.has(id), `duplicate ${kind} identity "${id}"`)
    seen.add(id)
  }
}

export function descriptionLabel(
  label: string | undefined,
  key: string,
): string {
  requireValue(
    label === undefined ||
      (typeof label === 'string' && label.trim().length > 0),
    `invalid label for "${key}"`,
  )
  return label ?? key
}

/** Reject runtime metadata that cannot belong to display configuration. */
export function validatePresentation(
  value: Pick<ColumnPresentation, 'format' | 'formatOptions'>,
  subject: string,
) {
  requireValue(
    value.format === undefined || isValueFormat(value.format),
    `unsupported format for ${subject}`,
  )
  const options = value.formatOptions
  if (options === undefined) return
  requireValue(
    typeof options === 'object' && options !== null && !Array.isArray(options),
    `invalid format options for ${subject}`,
  )
  const allowed = ['locale', 'dateFormat', 'timeFormat', 'timeZone']
  for (const key of Reflect.ownKeys(options)) {
    requireValue(
      typeof key === 'string' && allowed.includes(key),
      `unknown format option for ${subject}`,
    )
    const option = Reflect.get(options, key)
    requireValue(
      option === undefined || typeof option === 'string',
      `invalid format option "${key}" for ${subject}`,
    )
  }
}

export type Actions = Readonly<Record<string, ActionBinding>>
export function validateActions(
  descriptions: readonly ActionDescription[],
  bindings: Actions | undefined,
  submit?: ActionDescription,
) {
  uniqueIds(
    [
      ...descriptions.map((action) => action.id),
      ...(submit ? [submit.id] : []),
    ],
    'action',
  )
  for (const action of [...descriptions, ...(submit ? [submit] : [])]) {
    descriptionLabel(action.label, action.id)
    requireValue(
      action.variant === undefined || isButtonVariant(action.variant),
      `unsupported variant for action "${action.id}"`,
    )
    requireValue(
      action.tone === undefined || isButtonTone(action.tone),
      `unsupported tone for action "${action.id}"`,
    )
    requireValue(
      action.iconOnly === undefined || typeof action.iconOnly === 'boolean',
      `invalid iconOnly for action "${action.id}"`,
    )
    if (action === submit) continue
    requireValue(
      Object.hasOwn(bindings ?? {}, action.id) &&
        typeof bindings?.[action.id]?.run === 'function',
      `missing action binding "${action.id}"`,
    )
  }
}

export function ActionButton(props: {
  description: ActionDescription
  icon?: Component
  disabled?: boolean
  type?: 'button' | 'submit'
  onClick?: () => void
  actionId?: string
}) {
  const icon = createMemo(() => {
    const value = props.icon
    requireValue(
      value === undefined || typeof value === 'function',
      `invalid icon component for action "${props.description.id}"`,
    )
    return value
  })
  const label = () =>
    descriptionLabel(props.description.label, props.description.id)
  const iconOnly = () => !!props.description.iconOnly && !!icon()
  return (
    <Button
      data-generator-action={props.actionId}
      type={props.type ?? 'button'}
      variant={props.description.variant}
      tone={props.description.tone}
      disabled={props.disabled}
      class={iconOnly() ? 'ui-icon-button' : undefined}
      aria-label={iconOnly() ? label() : undefined}
      title={iconOnly() ? label() : undefined}
      onClick={props.onClick}
    >
      <Show when={icon()} keyed>
        {(Glyph) => (
          <span aria-hidden="true" inert>
            <Glyph />
          </span>
        )}
      </Show>
      <Show when={!iconOnly()}>{label()}</Show>
    </Button>
  )
}

export function ActionsView(props: {
  descriptions: readonly ActionDescription[]
  bindings?: Actions
}) {
  return (
    <For each={props.descriptions} keyed={(action) => action.id}>
      {(action) => (
        <ActionButton
          actionId={action().id}
          description={action()}
          icon={props.bindings?.[action().id]?.icon}
          disabled={props.bindings?.[action().id]?.disabled?.()}
          onClick={() => props.bindings?.[action().id]?.run()}
        />
      )}
    </For>
  )
}

export function StatusView(
  props: GeneratorMessageProps & { status?: Accessor<ViewStatus> },
) {
  const messages = resolveGeneratorMessages(() => props.messages)
  return (
    <>
      <Show when={props.status?.().loading}>
        <p role="status" data-ui-text="system">
          {messages.loading}
        </p>
      </Show>
      <Show when={props.status?.().error}>
        {(error) => (
          <InlineAlert announce="assertive" tone="error">
            {error()}
          </InlineAlert>
        )}
      </Show>
    </>
  )
}

/** Hex codepoints preserve arbitrary keys, including isolated UTF-16 surrogates. */
export function keyPart(id: string): string {
  return Array.from(id, (part) => part.codePointAt(0)!.toString(16)).join('-')
}

/** Bindings and errors use declared own keys rather than object prototypes. */
export function ownProperty<Value extends object, Key extends keyof Value>(
  record: Value | undefined,
  key: Key,
): Value[Key] | undefined {
  return record && Object.hasOwn(record, key) ? record[key] : undefined
}
