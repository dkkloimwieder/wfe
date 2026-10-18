import type { JSX } from '@solidjs/web'
import { uiScope } from '@wfe/components'
import {
  accents,
  appearanceStyle,
  schemes,
} from '../shared/appearance/appearance'

/** One appearance scope for client rendering and server hydration. */
export function ExampleAppearance(props: { children: JSX.Element }) {
  const scope = uiScope()
  return (
    <div
      {...scope}
      class="generator-example appearance-scope"
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
      }}
    >
      {props.children}
    </div>
  )
}
