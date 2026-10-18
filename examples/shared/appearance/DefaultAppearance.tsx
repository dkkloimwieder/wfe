import './default-appearance.css'
import type { JSX } from '@solidjs/web'
import { uiScope } from '@wfe/components'
import { accents, appearanceStyle, schemes } from './appearance'

/** One appearance scope for client rendering and server hydration. */
export function DefaultAppearance(props: {
  children: JSX.Element
  class?: string
  style?: JSX.CSSProperties
}) {
  const scope = uiScope()
  return (
    <div
      {...scope}
      class={['default-appearance', 'appearance-scope', props.class]}
      data-ui-portal-root=""
      style={{
        ...scope.style,
        ...appearanceStyle(schemes[1]!, accents[1]!, 2, {
          canvas: 1,
          pane: 0,
          content: 0,
        }),
        '--ui-button-color': 'var(--ui-accent)',
        '--ui-button-on-color': 'var(--ui-on-accent)',
        ...props.style,
      }}
    >
      {props.children}
    </div>
  )
}
