import './default-appearance.css'
import { Theme } from '@wfe/components/theme'
import type { ThemeOptions } from '@wfe/components/theme'
import type { JSX } from '@solidjs/web'

/** Example layout classes around the public default theme. */
export function DefaultAppearance(props: {
  children: JSX.Element
  options?: Pick<
    ThemeOptions,
    'accent' | 'secondaryAccent' | 'layers' | 'depth'
  >
  preset?: ThemeOptions['preset']
  mode?: ThemeOptions['mode']
  class?: string
  style?: JSX.CSSProperties
}) {
  return (
    <Theme
      {...props.options}
      preset={props.preset}
      mode={props.mode}
      class={['default-appearance', 'appearance-scope', props.class]}
      style={props.style}
    >
      {props.children}
    </Theme>
  )
}
