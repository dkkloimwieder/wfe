import { styledClasses, type ClassValue } from './classes'
import { createContext, useContext } from 'solid-js'
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
  },
) {
  const compound = useContext(CompoundControl)
  if (compound) return props.children
  return (
    <span
      class={styledClasses('ui-control-frame', props.frameClass)}
      style={props.frameStyle}
      hidden={props.hidden}
      data-ui-control-surface=""
      data-ui-control-decoration={
        props.decoration === false ? 'none' : props.decoration
      }
    >
      {props.children}
    </span>
  )
}
