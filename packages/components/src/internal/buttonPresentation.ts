import { styledClasses } from './classes'
import { merge, omit } from 'solid-js'
import type { JSX } from '@solidjs/web'

export type ButtonTone = 'neutral' | 'accent'
export type ButtonVariant = 'outline' | 'filled' | 'inverted' | 'ghost'
export type ButtonAppearanceProps = {
  class?: JSX.ButtonHTMLAttributes<HTMLButtonElement>['class']
  variant?: ButtonVariant
  tone?: ButtonTone
}

type PresentationAttributes = ButtonAppearanceProps & {
  'data-variant'?: ButtonVariant
  'data-tone'?: ButtonTone
}

export function buttonAttributes<T extends PresentationAttributes>(props: T) {
  // Preserve presentation when an overlay delegates to Button through `as`.
  return merge(omit(props, 'variant', 'tone'), {
    get class() {
      return styledClasses('ui-button', props.class)
    },
    get 'data-variant'() {
      return props.variant ?? props['data-variant'] ?? 'outline'
    },
    get 'data-tone'() {
      return props.tone ?? props['data-tone'] ?? 'neutral'
    },
  })
}
