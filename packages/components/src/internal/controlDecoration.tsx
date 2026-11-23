import { styledClasses, type ClassValue } from './classes'
import { createContext, createEffect, useContext } from 'solid-js'
import type { JSX } from '@solidjs/web'
import type { DecorationColor } from '../theme/appearance'

export type ControlDecoration = false | DecorationColor
export type ControlDecorationProps = { decoration?: ControlDecoration }
export type NativeControlFrameProps = ControlDecorationProps & {
  frameClass?: ClassValue
  frameStyle?: JSX.CSSProperties
}

export const CompoundControl = createContext(false)

/** One decoration around a compound control, with no inner input frames. */
export function ControlSurface(
  props: ControlDecorationProps & {
    class?: string
    children?: JSX.Element
  },
) {
  return (
    <CompoundControl value={true}>
      <div
        class={props.class}
        data-ui-control-surface=""
        data-ui-control-decoration={
          props.decoration === false ? 'none' : props.decoration
        }
      >
        {props.children}
      </div>
    </CompoundControl>
  )
}

/** Native elements retain their attributes, events, and references. */
export function ControlFrame(
  props: NativeControlFrameProps & {
    children: JSX.Element
    hidden?: boolean
    scrollable?: boolean
  },
) {
  const compound = useContext(CompoundControl)
  // Read children inside JSX: a direct read in the body is untracked.
  if (compound && props.scrollable === undefined) return <>{props.children}</>

  const framed = () => !compound || props.scrollable
  let frame: HTMLSpanElement | undefined
  createEffect(
    () => Boolean(props.scrollable),
    (scrollable) => {
      if (!scrollable || !frame || typeof ResizeObserver === 'undefined') return
      const node = frame
      // CSS cannot use the used radius of an intrinsically sized native field.
      const observer = new ResizeObserver(([entry]) => {
        const size = entry?.borderBoxSize?.[0]
        if (!size) return
        node.style.setProperty(
          '--_ui-scroll-radius-limit',
          `${Math.min(size.inlineSize, size.blockSize) / 2}px`,
        )
      })
      observer.observe(node, { box: 'border-box' })
      return () => observer.disconnect()
    },
  )
  return (
    <span
      class={styledClasses(
        'ui-control-frame',
        framed() ? props.frameClass : undefined,
      )}
      style={framed() ? props.frameStyle : undefined}
      ref={(node) => {
        frame = node
      }}
      data-scroll-field={props.scrollable ? '' : undefined}
      hidden={Boolean(framed() && props.hidden)}
      data-ui-control-surface={framed() ? '' : undefined}
      data-ui-control-decoration={
        framed()
          ? props.decoration === false
            ? 'none'
            : props.decoration
          : undefined
      }
    >
      {props.children}
    </span>
  )
}
