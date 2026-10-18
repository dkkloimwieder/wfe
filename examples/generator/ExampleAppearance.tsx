import type { JSX } from '@solidjs/web'
import { DefaultAppearance } from '../shared/appearance/DefaultAppearance'

export function ExampleAppearance(props: { children: JSX.Element }) {
  return (
    <DefaultAppearance class="generator-example">
      {props.children}
    </DefaultAppearance>
  )
}
