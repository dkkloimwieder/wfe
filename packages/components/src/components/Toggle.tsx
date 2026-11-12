import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  omit,
  onCleanup,
  onSettled,
  untrack,
} from 'solid-js'
import type { JSX } from '@solidjs/web'
import { Button } from './NativeFields'
import type { ButtonProps, ButtonTone, ButtonVariant } from './NativeFields'
import {
  createCompoundField,
  createCompoundFieldTarget,
} from '../internal/compoundField'
import {
  renderAfterRegistration,
  renderCompoundFieldRoot,
} from '../internal/fieldRendering'
import {
  callHandler,
  nativeEventProps,
  ownedElementEvents,
} from '../internal/events'
import { nativeEvents } from '../utils/nativeEvents'
import { styledClasses } from '../internal/classes'

export type ToggleProps = Omit<
  ButtonProps,
  'type' | 'name' | 'value' | 'aria-pressed' | 'disabled'
> & {
  pressed: boolean
  disabled?: boolean
  onPressedChange: (pressed: boolean, event: MouseEvent) => void
  readonly?: boolean
  pressedVariant?: ButtonVariant
  name?: string
  value?: string
}

/** Controlled toggle behavior delegates rendering and event lifetime to Button. */
export function Toggle(props: ToggleProps) {
  const state = createCompoundField(props)
  const attributes = omit(
    props,
    'pressed',
    'onPressedChange',
    'readonly',
    'pressedVariant',
    'name',
    'value',
  )
  return (
    <>
      <Button
        {...attributes}
        type="button"
        disabled={state.disabled()}
        aria-pressed={props.pressed ? 'true' : 'false'}
        aria-disabled={state.readonly() ? 'true' : props['aria-disabled']}
        data-readonly={state.readonly() ? '' : undefined}
        variant={
          props.pressed ? (props.pressedVariant ?? 'filled') : props.variant
        }
        class={styledClasses('ui-toggle-button', props.class)}
        onClick={(event) => {
          if (state.disabled() || state.readonly()) {
            event.preventDefault()
            return
          }
          callHandler(event, props.onClick)
          if (!event.defaultPrevented)
            props.onPressedChange(!props.pressed, event)
        }}
      />
      <Show when={props.name && props.pressed}>
        <input
          type="hidden"
          name={props.name}
          value={props.value ?? 'on'}
          form={props.form}
          disabled={state.disabled()}
        />
      </Show>
    </>
  )
}

export type ToggleGroupItem = {
  value: string
  label: JSX.Element
  disabled?: boolean
  'aria-label'?: string
}
type GroupPresentation = Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  'children' | 'id' | 'aria-label' | 'aria-labelledby' | 'aria-describedby'
> & {
  id?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  items: readonly ToggleGroupItem[]
  name?: string
  disabled?: boolean
  readonly?: boolean
  invalid?: boolean
  allowEmpty?: boolean
  orientation?: 'horizontal' | 'vertical'
  direction?: 'ltr' | 'rtl'
  loop?: boolean
  tone?: ButtonTone
  variant?: ButtonVariant
  pressedVariant?: ButtonVariant
}
export type ToggleGroupProps = GroupPresentation &
  (
    | {
        multiple?: false
        value?: string
        onValueChange: (value: string | undefined, event: MouseEvent) => void
      }
    | {
        multiple: true
        value: readonly string[]
        onValueChange: (value: string[], event: MouseEvent) => void
      }
  )

export function ToggleGroup(props: ToggleGroupProps) {
  const state = createCompoundField(props)
  const target = createCompoundFieldTarget(props, false)
  const items = createMemo(() => {
    const map = new Map<string, ToggleGroupItem>()
    for (const item of props.items) {
      if (map.has(item.value))
        throw new Error('ToggleGroup item values must be unique')
      map.set(item.value, item)
    }
    return map
  })
  const keys = createMemo(() => [...items().keys()])
  const selected = createMemo(
    () =>
      new Set(
        props.multiple
          ? props.value
          : props.value === undefined
            ? []
            : [props.value],
      ),
  )
  const enabled = createMemo(() =>
    state.disabled() ? [] : keys().filter((key) => !items().get(key)!.disabled),
  )
  const [focused, setFocused] = createSignal<string>()
  const tabValue = createMemo(() =>
    enabled().includes(focused()!)
      ? focused()
      : (enabled().find((key) => selected().has(key)) ?? enabled()[0]),
  )
  const buttons = new Map<string, HTMLButtonElement>()
  let host: HTMLDivElement | undefined
  let hadFocus = false
  onSettled(() => () => buttons.clear())
  createEffect(
    () => [enabled(), tabValue()] as const,
    ([available, entry]) => {
      if (!host || !hadFocus) return
      const active = host.ownerDocument.activeElement
      if (active !== host.ownerDocument.body && !host.contains(active)) return
      const key =
        active instanceof HTMLElement ? active.dataset.toggleValue : undefined
      if (key && available.includes(key)) return
      buttons.get(entry!)?.focus()
    },
  )
  function change(value: string, pressed: boolean, event: MouseEvent) {
    if (state.disabled() || state.readonly() || items().get(value)?.disabled)
      return
    const current = [...selected()]
    if (!pressed && props.allowEmpty === false && current.length === 1) return
    if (props.multiple)
      props.onValueChange(
        pressed ? [...current, value] : current.filter((key) => key !== value),
        event,
      )
    else props.onValueChange(pressed ? value : undefined, event)
  }
  const caller = ownedElementEvents(props)
  const events = nativeEvents<HTMLDivElement>({
    focusin: (event) =>
      untrack(() => {
        const key =
          event.target instanceof HTMLElement
            ? event.target.dataset.toggleValue
            : undefined
        if (key !== undefined) {
          hadFocus = true
          setFocused(key)
        }
      }),
    focusout: (event) => {
      if (
        !(event.relatedTarget instanceof Node) ||
        !host?.contains(event.relatedTarget)
      )
        hadFocus = false
    },
    keydown: (event) =>
      untrack(() => {
        if (
          event.defaultPrevented ||
          event.isComposing ||
          state.disabled() ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey
        )
          return
        const current =
          event.target instanceof HTMLElement
            ? event.target.dataset.toggleValue
            : undefined
        if (current === undefined) return
        const available = enabled()
        if (!available.length) return
        let next: number
        const index = available.indexOf(current)
        const vertical = props.orientation === 'vertical'
        if (event.key === 'Home') next = 0
        else if (event.key === 'End') next = available.length - 1
        else if (vertical && event.key === 'ArrowDown') next = index + 1
        else if (vertical && event.key === 'ArrowUp') next = index - 1
        else if (!vertical && event.key === 'ArrowRight')
          next = index + (props.direction === 'rtl' ? -1 : 1)
        else if (!vertical && event.key === 'ArrowLeft')
          next = index + (props.direction === 'rtl' ? 1 : -1)
        else return
        event.preventDefault()
        next =
          props.loop === false
            ? Math.max(0, Math.min(available.length - 1, next))
            : (next + available.length) % available.length
        buttons.get(available[next]!)?.focus()
      }),
  })
  const attributes = omit(
    props,
    'items',
    'name',
    'disabled',
    'readonly',
    'invalid',
    'allowEmpty',
    'multiple',
    'value',
    'onValueChange',
    'orientation',
    'direction',
    'loop',
    'tone',
    'variant',
    'pressedVariant',
    'ref',
    ...nativeEventProps,
  )
  return renderCompoundFieldRoot(() =>
    renderAfterRegistration(() => (
      <div
        {...attributes}
        {...target}
        data-ui=""
        role="group"
        dir={props.direction ?? 'ltr'}
        data-orientation={props.orientation ?? 'horizontal'}
        class={styledClasses('ui-toggle-group', props.class)}
        aria-invalid={
          state.validationState() === 'invalid' ? 'true' : props['aria-invalid']
        }
        data-disabled={state.disabled() ? '' : undefined}
        data-readonly={state.readonly() ? '' : undefined}
        data-invalid={state.validationState() === 'invalid' ? '' : undefined}
        ref={[
          untrack(() => props.ref),
          (node) => {
            host = node
          },
          caller,
          events,
        ]}
      >
        <For each={keys()}>
          {(key) => {
            const item = () => items().get(key)!
            onCleanup(() => buttons.delete(key))
            return (
              <Toggle
                pressed={selected().has(key)}
                onPressedChange={(pressed, event) =>
                  change(key, pressed, event)
                }
                disabled={Boolean(state.disabled() || item().disabled)}
                readonly={state.readonly()}
                aria-label={item()['aria-label']}
                aria-describedby={
                  target['aria-describedby'] ?? props['aria-describedby']
                }
                data-toggle-value={key}
                tabindex={tabValue() === key ? 0 : -1}
                tone={props.tone}
                variant={props.variant}
                pressedVariant={props.pressedVariant}
                ref={(node) => {
                  buttons.set(key, node)
                }}
              >
                {item().label}
              </Toggle>
            )
          }}
        </For>
        <For each={[...selected()].filter((key) => items().has(key))}>
          {(key) => (
            <input
              type="hidden"
              name={props.name}
              value={key}
              disabled={Boolean(state.disabled() || items().get(key)?.disabled)}
            />
          )}
        </For>
      </div>
    )),
  )
}
