import './default-appearance.css'
import { Theme } from '@wfe/components/theme'
import type { JSX } from '@solidjs/web'

/** Example layout classes around the public default theme. */
export function DefaultAppearance(props: {
  children: JSX.Element
  class?: string
  style?: JSX.CSSProperties
}) {
  return (
    <Theme
      class={['default-appearance', 'appearance-scope', props.class]}
      style={props.style}
    >
      {props.children}
    </Theme>
  )
}
