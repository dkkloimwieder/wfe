import { BUTTON_TONES } from '@wfe/components'
import type { ButtonVariant } from '@wfe/components'
import { actionStates, specimen } from './variant-types'
import type { Specimen } from './variant-types'

const tones = ['default', ...BUTTON_TONES] as const
const treatments = [
  'outline',
  'filled',
  'inverted',
  'ghost',
] as const satisfies readonly ButtonVariant[]

const labels = {
  text: 'Button',
  icon: 'IconButton',
  'icon-text': 'Button with icon',
  link: 'ButtonLink',
}

export function buttonVariants(
  form: keyof typeof labels,
  render: (
    appearance: {
      tone?: (typeof BUTTON_TONES)[number]
      variant: ButtonVariant
    },
    disabled: boolean,
  ) => ReturnType<Specimen['render']>,
) {
  return tones.flatMap((tone) =>
    treatments.map((variant) =>
      specimen(
        `button/${form}/${tone}/${variant}`,
        `${labels[form]} / ${tone} / ${variant}`,
        actionStates,
        (state) =>
          render(
            { tone: tone === 'default' ? undefined : tone, variant },
            state === 'disabled',
          ),
      ),
    ),
  )
}
