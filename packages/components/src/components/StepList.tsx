import { For, Show, createMemo, createUniqueId, omit } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { styledClasses } from '../internal/classes'
import { nativeEventProps, ownedElementEvents } from '../internal/events'
import { resolveMessages } from '../internal/messages'
import { Icon } from './Icon'
import { Button } from './NativeFields'

export type StepListItem = Readonly<{
  id: string
  label: string
  /** Defaults to true for steps before the current step. */
  complete?: boolean
  /** Defaults to true for completed steps and steps up to the current step. */
  reachable?: boolean
}>
export interface StepListMessages {
  navigationLabel: string
  complete: string
}
export const stepListMessages: Readonly<StepListMessages> = {
  navigationLabel: 'Steps',
  complete: 'Complete',
}
export type StepListProps = Omit<
  JSX.HTMLAttributes<HTMLElement>,
  'children'
> & {
  steps: readonly StepListItem[]
  current: string
  onStepChange: (id: string) => void
  messages?: Partial<StepListMessages>
}

/** Navigation for a controlled, ordered flow. Callers decide which steps to accept. */
export function StepList(props: StepListProps) {
  const attributes = omit(
    props,
    'steps',
    'current',
    'onStepChange',
    'messages',
    'ref',
    ...nativeEventProps,
  )
  const events = ownedElementEvents(props)
  const messages = resolveMessages(stepListMessages, () => props.messages)
  const completeId = `step-list-complete-${createUniqueId()}`
  const currentIndex = createMemo(() =>
    props.steps.findIndex((step) => step.id === props.current),
  )
  return (
    <nav
      {...attributes}
      aria-label={props['aria-label'] ?? messages.navigationLabel}
      class={styledClasses('ui-step-list', props.class)}
      data-ui=""
      ref={[props.ref, events]}
    >
      <span id={completeId} hidden>
        {messages.complete}
      </span>
      <ol role="list">
        <For each={props.steps}>
          {(step, index) => {
            const current = () => step.id === props.current
            const complete = () => step.complete ?? index() < currentIndex()
            const reachable = () =>
              current() ||
              (step.reachable ?? (complete() || index() < currentIndex()))
            return (
              <li>
                <Button
                  class="ui-step-list-button"
                  variant={current() ? 'filled' : 'outline'}
                  tone={current() ? 'primary' : undefined}
                  aria-current={current() ? 'step' : undefined}
                  aria-describedby={complete() ? completeId : undefined}
                  data-complete={complete() ? '' : undefined}
                  disabled={!reachable()}
                  onClick={() => {
                    if (reachable() && !current()) props.onStepChange(step.id)
                  }}
                >
                  <span class="ui-step-list-marker" aria-hidden="true">
                    <Show when={complete()} fallback={index() + 1}>
                      <Icon name="check" />
                    </Show>
                  </span>
                  <span>{step.label}</span>
                </Button>
              </li>
            )
          }}
        </For>
      </ol>
    </nav>
  )
}
