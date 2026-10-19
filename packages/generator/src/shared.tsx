import { For, Show } from 'solid-js'
import { Button, InlineAlert } from '@wfe/components'
import type { Accessor } from 'solid-js'
import type { ActionBinding, ActionDescription, ViewStatus } from './types'

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
