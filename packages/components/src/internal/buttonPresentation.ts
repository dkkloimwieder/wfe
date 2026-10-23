import { styledClasses } from './classes'
import { merge, omit } from 'solid-js'
import type { JSX } from '@solidjs/web'

export const BUTTON_TONES = ['neutral', 'accent'] as const
export const BUTTON_VARIANTS = [
  'outline',
  'filled',
  'inverted',
  'ghost',
] as const
export type ButtonTone = (typeof BUTTON_TONES)[number]
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number]
export function isButtonTone(value: unknown): value is ButtonTone {
  return BUTTON_TONES.some((tone) => tone === value)
}
export function isButtonVariant(value: unknown): value is ButtonVariant {
  return BUTTON_VARIANTS.some((variant) => variant === value)
}
export type ButtonAppearanceProps = {
  class?: JSX.ButtonHTMLAttributes<HTMLButtonElement>['class']
  variant?: ButtonVariant
  tone?: ButtonTone
}

type PresentationAttributes = ButtonAppearanceProps & {
  'data-variant'?: ButtonVariant
  'data-tone'?: ButtonTone | 'default'
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
      return props.tone ?? props['data-tone'] ?? 'default'
    },
  })
}
