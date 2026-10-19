import { For, Show } from 'solid-js'
import { Button, InlineAlert, isValueFormat } from '@wfe/components'
import type { Accessor } from 'solid-js'
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
      action.variant === undefined ||
        ['outline', 'filled', 'inverted', 'ghost'].includes(action.variant),
      `unsupported variant for action "${action.id}"`,
    )
    requireValue(
      action.tone === undefined || ['neutral', 'accent'].includes(action.tone),
      `unsupported tone for action "${action.id}"`,
    )
    if (action === submit) continue
    requireValue(
      Object.hasOwn(bindings ?? {}, action.id) &&
        typeof bindings?.[action.id]?.run === 'function',
      `missing action binding "${action.id}"`,
    )
  }
}

export function ActionsView(props: {
  descriptions: readonly ActionDescription[]
  bindings?: Actions
}) {
  return (
    <For each={props.descriptions} keyed={(action) => action.id}>
      {(action) => (
        <Button
          data-generator-action={action().id}
          variant={action().variant}
          tone={action().tone}
          disabled={props.bindings?.[action().id]?.disabled?.()}
          onClick={() => props.bindings?.[action().id]?.run()}
        >
          {descriptionLabel(action().label, action().id)}
        </Button>
      )}
    </For>
  )
}

export function StatusView(props: { status?: Accessor<ViewStatus> }) {
  return (
    <>
      <Show when={props.status?.().loading}>
        <p role="status" data-ui-text="system">
          Loading
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
