import {
  Button,
  ButtonLink,
  Icon,
  IconButton,
  Toggle,
  ToggleGroup,
} from '@wfe/components'
import type { ButtonTone, ButtonVariant, IconName } from '@wfe/components'
import {
  actionStates,
  editingStates,
  interactiveStates,
  specimen,
  stateProps,
} from './variant-types'

const tones = ['default', 'neutral', 'primary'] as const satisfies readonly (
  ButtonTone | 'default'
)[]
const treatments = [
  'outline',
  'filled',
  'inverted',
  'ghost',
] as const satisfies readonly ButtonVariant[]
const forms = ['text', 'icon', 'icon-text', 'link'] as const

// Record makes additions to the public IconName union a type error here.
const icons: Record<IconName, true> = {
  form: true,
  grid: true,
  navigation: true,
  layout: true,
  check: true,
  view: true,
  people: true,
  key: true,
  minus: true,
  cross: true,
  'chevron-down': true,
  'chevron-right': true,
  'chevron-left': true,
  refresh: true,
  controls: true,
  filter: true,
  calendar: true,
}

function exampleButton(
  form: (typeof forms)[number],
  tone: (typeof tones)[number],
  variant: ButtonVariant,
  disabled: boolean,
) {
  const appearance = { tone: tone === 'default' ? undefined : tone, variant }
  switch (form) {
    case 'icon':
      return (
        <IconButton {...appearance} disabled={disabled} aria-label="Refresh">
          <Icon name="refresh" />
        </IconButton>
      )
    case 'icon-text':
      return (
        <Button {...appearance} disabled={disabled}>
          <Icon name="refresh" /> Refresh
        </Button>
      )
    case 'link':
      return (
        <ButtonLink
          {...appearance}
          href="#variants"
          aria-disabled={disabled ? 'true' : undefined}
          tabindex={disabled ? -1 : undefined}
          onClick={(event) => event.preventDefault()}
        >
          Open
        </ButtonLink>
      )
    default:
      return (
        <Button {...appearance} disabled={disabled}>
          Save
        </Button>
      )
  }
}

export const buttonSpecimens = [
  ...forms.flatMap((form) =>
    tones.flatMap((tone) =>
      treatments.map((treatment) =>
        specimen(
          `button/${form}/${tone}/${treatment}`,
          `${{ text: 'Button', icon: 'IconButton', 'icon-text': 'Button with icon', link: 'ButtonLink' }[form]} / ${tone} / ${treatment}`,
          actionStates,
          (state) => exampleButton(form, tone, treatment, state === 'disabled'),
        ),
      ),
    ),
  ),
  specimen(
    'toggle/outline',
    'Toggle / outline',
    [...actionStates, 'checked', 'read-only'],
    (state) => (
      <Toggle
        {...stateProps(state)}
        pressed={state === 'checked'}
        onPressedChange={() => {}}
      >
        Pin
      </Toggle>
    ),
  ),
  ...(['single', 'multiple'] as const).flatMap((selection) =>
    (['horizontal', 'vertical'] as const).map((orientation) =>
      specimen(
        `toggle-group/${selection}/${orientation}`,
        `ToggleGroup / ${selection} / ${orientation}`,
        [...editingStates, 'selected'],
        (state) => {
          const shared = {
            ...stateProps(state),
            orientation,
            'aria-label': 'Alignment',
            items: [
              { value: 'left', label: 'Left' },
              { value: 'right', label: 'Right' },
            ],
            onValueChange: () => {},
          }
          return selection === 'multiple' ? (
            <ToggleGroup
              {...shared}
              multiple
              value={state === 'selected' ? ['left', 'right'] : []}
            />
          ) : (
            <ToggleGroup
              {...shared}
              value={state === 'selected' ? 'left' : undefined}
            />
          )
        },
      ),
    ),
  ),
  ...(Object.keys(icons) as IconName[]).flatMap((name) => [
    specimen(
      `icon/${name}/standalone`,
      `Icon / ${name} / standalone`,
      ['rest'],
      () => <Icon name={name} />,
    ),
    specimen(
      `icon/${name}/button`,
      `Icon / ${name} / in button`,
      [...interactiveStates, 'disabled'],
      (state) => (
        <IconButton aria-label={name} disabled={state === 'disabled'}>
          <Icon name={name} />
        </IconButton>
      ),
    ),
  ]),
]
