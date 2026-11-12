import {
  For,
  createEffect,
  createMemo,
  createUniqueId,
  omit,
  onSettled,
  untrack,
} from 'solid-js'
import type { JSX } from '@solidjs/web'
import {
  createCompoundField,
  createCompoundFieldTarget,
  joinFieldIds,
} from '../internal/compoundField'
import {
  renderAfterRegistration,
  renderCompoundFieldRoot,
} from '../internal/fieldRendering'
import { ControlFrame } from '../internal/controlDecoration'
import type { ControlDecorationProps } from '../internal/controlDecoration'
import { styledClasses } from '../internal/classes'
import { nativeEventProps, ownedElementEvents } from '../internal/events'
import { nativeEvents } from '../utils/nativeEvents'
import { sliderScale } from '../internal/slider'

export type SliderChangeEvent = PointerEvent | KeyboardEvent
export type SliderCommitEvent = SliderChangeEvent | FocusEvent

type SharedSliderProps = Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  'children' | 'id' | 'aria-label' | 'aria-labelledby' | 'aria-describedby'
> &
  ControlDecorationProps & {
    id?: string
    'aria-label'?: string
    'aria-labelledby'?: string
    'aria-describedby'?: string
    min?: number
    max?: number
    step?: number
    name?: string
    disabled?: boolean
    readonly?: boolean
    invalid?: boolean
    orientation?: 'horizontal' | 'vertical'
    direction?: 'ltr' | 'rtl'
    getValueText?: (value: number, index: number) => string
  }
export type SliderProps = SharedSliderProps & {
  value: number
  onValueChange: (value: number, event: SliderChangeEvent) => void
  onValueCommit?: (value: number, event: SliderCommitEvent) => void
}
export type RangeSliderProps = SharedSliderProps & {
  value: readonly [number, number]
  thumbLabels: readonly [string, string]
  onValueChange: (value: [number, number], event: SliderChangeEvent) => void
  onValueCommit?: (value: [number, number], event: SliderCommitEvent) => void
}

type SliderControlProps = SharedSliderProps & {
  values: readonly number[]
  thumbLabels?: readonly string[]
  onValuesChange: (values: number[], event: SliderChangeEvent) => void
  onValuesCommit?: (values: number[], event: SliderCommitEvent) => void
}

export function Slider(props: SliderProps) {
  return (
    <SliderControl
      {...omit(props, 'value', 'onValueChange', 'onValueCommit')}
      values={[props.value]}
      onValuesChange={(values, event) => props.onValueChange(values[0]!, event)}
      onValuesCommit={(values, event) =>
        props.onValueCommit?.(values[0]!, event)
      }
    />
  )
}
export function RangeSlider(props: RangeSliderProps) {
  return (
    <SliderControl
      {...omit(props, 'value', 'onValueChange', 'onValueCommit')}
      values={props.value}
      onValuesChange={(values, event) =>
        props.onValueChange([values[0]!, values[1]!], event)
      }
      onValuesCommit={(values, event) =>
        props.onValueCommit?.([values[0]!, values[1]!], event)
      }
    />
  )
}

function SliderControl(props: SliderControlProps) {
  const field = createCompoundField(props)
  const target = createCompoundFieldTarget(props, false)
  const generated = createUniqueId()
  const id = () => target.id ?? props.id ?? `slider-${generated}`
  const scale = createMemo(() => sliderScale(props.min, props.max, props.step))
  const values = createMemo(() => {
    if (
      !props.values.length ||
      props.values.some(
        (value, index, all) =>
          !Number.isFinite(value) || (index > 0 && value < all[index - 1]!),
      )
    )
      throw new RangeError('Slider values must be finite and ordered')
    return props.values.map((value) => scale().snap(value))
  })
  const count = createMemo(() => values().length)
  const indices = createMemo(() =>
    Array.from({ length: count() }, (_, index) => index),
  )
  const vertical = () => props.orientation === 'vertical'
  const rtl = () => props.direction === 'rtl'
  const blocked = () => field.disabled() || field.readonly()
  const thumbs: HTMLElement[] = []
  let host: HTMLDivElement | undefined
  let track: HTMLDivElement | undefined
  type Gesture = { index: number; start: number[] } & (
    | { kind: 'key' }
    | {
        kind: 'pointer'
        pointer: number
        rect: DOMRect
        vertical: boolean
        rtl: boolean
        offset: number
      }
  )
  let gesture: Gesture | undefined
  const same = (left: readonly number[], right: readonly number[]) =>
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  function finish(event?: SliderCommitEvent, commit = false) {
    const previous = gesture
    gesture = undefined
    if (
      previous?.kind === 'pointer' &&
      host?.hasPointerCapture?.(previous.pointer)
    )
      host.releasePointerCapture(previous.pointer)
    if (previous && event && commit && !same(previous.start, values()))
      props.onValuesCommit?.([...values()], event)
  }
  onSettled(() => () => finish())
  createEffect(
    () => [
      blocked(),
      props.min,
      props.max,
      props.step,
      props.orientation,
      props.direction,
      count(),
    ],
    () => finish(),
  )
  function propose(index: number, value: number, event: SliderChangeEvent) {
    if (blocked()) return
    const current = values()
    const next = [...current]
    next[index] = scale().snap(value, current[index - 1], current[index + 1])
    if (!same(next, current)) props.onValuesChange(next, event)
  }
  function pointerValue(
    event: PointerEvent,
    active: Extract<Gesture, { kind: 'pointer' }>,
  ) {
    const fraction = active.vertical
      ? 1 - (event.clientY - active.rect.top) / active.rect.height
      : (event.clientX - active.rect.left) / active.rect.width
    const logical = !active.vertical && active.rtl ? 1 - fraction : fraction
    return scale().min + logical * (scale().max - scale().min) + active.offset
  }
  const thumbIndex = (element: EventTarget | null) => {
    const thumb =
      element instanceof Element
        ? element.closest<HTMLElement>('[data-slider-thumb]')
        : null
    return thumb && host?.contains(thumb)
      ? Number(thumb.dataset.sliderThumb)
      : undefined
  }
  const caller = ownedElementEvents(props)
  const events = nativeEvents<HTMLDivElement>({
    pointerdown: (event) =>
      untrack(() => {
        if (
          event.defaultPrevented ||
          blocked() ||
          event.button !== 0 ||
          event.isPrimary === false ||
          gesture?.kind === 'pointer'
        )
          return
        finish(event, true)
        const rect = track!.getBoundingClientRect()
        if (!(vertical() ? rect.height : rect.width)) return
        const active: Extract<Gesture, { kind: 'pointer' }> = {
          kind: 'pointer',
          index: 0,
          start: [...values()],
          pointer: event.pointerId,
          rect,
          vertical: vertical(),
          rtl: rtl(),
          offset: 0,
        }
        const value = pointerValue(event, active)
        const grabbed = thumbIndex(event.target)
        active.index =
          grabbed ??
          values().reduce((best, current, index, all) => {
            const distance = Math.abs(current - value)
            const previous = Math.abs(all[best]! - value)
            return distance < previous ||
              (distance === previous && value >= current)
              ? index
              : best
          }, 0)
        if (grabbed !== undefined) active.offset = values()[grabbed]! - value
        event.preventDefault()
        thumbs[active.index]?.focus()
        gesture = active
        host?.setPointerCapture?.(event.pointerId)
        propose(active.index, pointerValue(event, active), event)
      }),
    pointermove: (event) =>
      untrack(() => {
        if (gesture?.kind !== 'pointer' || event.pointerId !== gesture.pointer)
          return
        event.preventDefault()
        propose(gesture.index, pointerValue(event, gesture), event)
      }),
    pointerup: (event) =>
      untrack(() => {
        if (gesture?.kind === 'pointer' && event.pointerId === gesture.pointer)
          finish(event, true)
      }),
    pointercancel: (event) => {
      if (gesture?.kind === 'pointer' && event.pointerId === gesture.pointer)
        finish()
    },
    lostpointercapture: (event) => {
      if (gesture?.kind === 'pointer' && event.pointerId === gesture.pointer)
        finish()
    },
    keydown: (event) =>
      untrack(() => {
        if (event.defaultPrevented || event.isComposing || blocked()) return
        if (event.key === 'Escape' && gesture?.kind === 'pointer') {
          const start = gesture.start
          event.preventDefault()
          event.stopPropagation()
          finish()
          if (!same(start, values())) props.onValuesChange(start, event)
          return
        }
        const index = thumbIndex(event.target)
        if (
          index === undefined ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey
        )
          return
        const { min, max, step } = scale()
        const current = values()[index]!
        let next: number
        switch (event.key) {
          case 'ArrowRight':
            next = current + (rtl() && !vertical() ? -step : step)
            break
          case 'ArrowLeft':
            next = current + (rtl() && !vertical() ? step : -step)
            break
          case 'ArrowUp':
            next = current + step
            break
          case 'ArrowDown':
            next = current - step
            break
          case 'PageUp':
            next = current + step * 10
            break
          case 'PageDown':
            next = current - step * 10
            break
          case 'Home':
            next = min
            break
          case 'End':
            next = max
            break
          default:
            return
        }
        event.preventDefault()
        if (gesture?.kind !== 'key' || gesture.index !== index) {
          finish(event, true)
          gesture = { kind: 'key', index, start: [...values()] }
        }
        propose(index, next, event)
      }),
    keyup: (event) =>
      untrack(() => {
        if (
          gesture?.kind === 'key' &&
          /^(Arrow|Page|Home$|End$)/.test(event.key)
        )
          finish(event, true)
      }),
    focusout: (event) =>
      untrack(() => {
        if (gesture?.kind === 'key') finish(event, true)
      }),
  })
  const attributes = omit(
    props,
    'ref',
    'min',
    'max',
    'step',
    'name',
    'values',
    'thumbLabels',
    'onValuesChange',
    'onValuesCommit',
    'disabled',
    'readonly',
    'invalid',
    'orientation',
    'direction',
    'getValueText',
    'decoration',
    ...nativeEventProps,
  )
  const position = (value: number) => {
    const fraction = scale().fraction(value)
    return (vertical() || rtl() ? 1 - fraction : fraction) * 100
  }
  const fill = () => {
    const begin = position(values().length === 1 ? scale().min : values()[0]!)
    const end = position(values().at(-1)!)
    return vertical()
      ? { top: `${Math.min(begin, end)}%`, height: `${Math.abs(end - begin)}%` }
      : { left: `${Math.min(begin, end)}%`, width: `${Math.abs(end - begin)}%` }
  }
  return renderCompoundFieldRoot(() =>
    renderAfterRegistration(() => (
      <div
        {...attributes}
        {...target}
        id={id()}
        role="group"
        data-ui=""
        class={styledClasses('ui-slider', props.class)}
        dir={props.direction ?? 'ltr'}
        data-orientation={vertical() ? 'vertical' : 'horizontal'}
        data-disabled={field.disabled() ? '' : undefined}
        data-readonly={field.readonly() ? '' : undefined}
        data-invalid={field.validationState() === 'invalid' ? '' : undefined}
        ref={[
          untrack(() => props.ref),
          (node) => {
            host = node
          },
          caller,
          events,
        ]}
      >
        <div
          class="ui-slider-track"
          ref={(node) => {
            track = node
          }}
        >
          <div class="ui-slider-rail" />
          <div class="ui-slider-fill" style={fill()} />
          <For each={indices()}>
            {(index) => (
              <>
                <span id={`${id()}-label-${index}`} class="sr-only">
                  {props.thumbLabels?.[index]}
                </span>
                <div
                  class="ui-slider-thumb-slot"
                  style={
                    vertical()
                      ? { top: `${position(values()[index]!)}%` }
                      : { left: `${position(values()[index]!)}%` }
                  }
                >
                  <ControlFrame decoration={props.decoration}>
                    <span
                      role="slider"
                      data-slider-thumb={index}
                      class="ui-slider-thumb"
                      id={`${id()}-thumb-${index}`}
                      tabindex={field.disabled() ? -1 : 0}
                      aria-label={
                        target['aria-labelledby'] || props['aria-labelledby']
                          ? undefined
                          : [props['aria-label'], props.thumbLabels?.[index]]
                              .filter(Boolean)
                              .join(' ') || undefined
                      }
                      aria-labelledby={
                        target['aria-labelledby'] || props['aria-labelledby']
                          ? joinFieldIds(
                              target['aria-labelledby'] ??
                                props['aria-labelledby'],
                              props.thumbLabels?.[index]
                                ? `${id()}-label-${index}`
                                : undefined,
                            )
                          : undefined
                      }
                      aria-describedby={
                        target['aria-describedby'] ?? props['aria-describedby']
                      }
                      aria-valuemin={values()[index - 1] ?? scale().min}
                      aria-valuemax={values()[index + 1] ?? scale().max}
                      aria-valuenow={values()[index]}
                      aria-valuetext={props.getValueText?.(
                        values()[index]!,
                        index,
                      )}
                      aria-orientation={vertical() ? 'vertical' : 'horizontal'}
                      aria-disabled={field.disabled() ? 'true' : undefined}
                      aria-readonly={field.readonly() ? 'true' : undefined}
                      aria-invalid={
                        field.validationState() === 'invalid'
                          ? 'true'
                          : undefined
                      }
                      ref={(node) => {
                        thumbs[index] = node
                      }}
                    />
                  </ControlFrame>
                </div>
                <input
                  type="hidden"
                  name={props.name}
                  value={values()[index]}
                  disabled={field.disabled()}
                />
              </>
            )}
          </For>
        </div>
      </div>
    )),
  )
}
