import { For, Show, createMemo, createSignal } from 'solid-js'
import { paletteColorName, resolveThemeTokens } from '@wfe/components/theme'
import type { ThemeOptions } from '@wfe/components/theme'
import type { ButtonTone } from '@wfe/components'
import { Button, Input, Field, Label } from '@wfe/components'
import {
  schemes,
  accentColors,
  primaryColors,
  secondaryColors,
  decorationColors,
  schemeMode,
  primaryOption,
} from './appearance'
import type {
  Decorations,
  PaletteColor,
  SurfaceScheme,
  SurfaceLayers,
  SurfaceLevel,
  TableDividers,
} from './appearance'

const roles = [
  { name: 'Surface 1', source: 'surfaces', index: 0 },
  { name: 'Surface 2', source: 'surfaces', index: 1 },
  { name: 'Surface 3', source: 'surfaces', index: 2 },
  { name: 'Surface 4', source: 'surfaces', index: 3 },
  { name: 'Text 1', source: 'text', index: 0 },
  { name: 'Text 2', source: 'text', index: 1 },
] as const

function PaletteRow(props: {
  label: 'Primary' | 'Secondary' | 'Accent'
  colors: readonly PaletteColor[]
  selected: PaletteColor
  sample: (color: PaletteColor) => string | undefined
  onChange: (color: PaletteColor) => void
}) {
  return (
    <div
      class="appearance-options"
      role="group"
      aria-label={`${props.label} colors`}
    >
      <span data-ui-text="system">{props.label}</span>
      <For each={props.colors}>
        {(color) => (
          <Button
            class="palette-swatch"
            aria-label={`${color.name} ${props.label.toLowerCase()}`}
            title={color.name}
            aria-pressed={props.selected === color ? 'true' : 'false'}
            onClick={() => props.onChange(color)}
          >
            <span
              aria-hidden="true"
              style={{ background: props.sample(color) }}
            />
          </Button>
        )}
      </For>
    </div>
  )
}

/** Temporary application-owned review. Nothing is persisted. */
export function AppearanceReview(props: {
  themeOptions?: ThemeOptions
  showDecorationControls?: boolean
  decorations?: Decorations
  onDecorationsChange?: (value: Decorations, commit: boolean) => void
  placement?: 'left' | 'top' | 'right'
  onPlacementChange?: (placement: 'left' | 'top' | 'right') => void
  scheme: SurfaceScheme
  primary: PaletteColor
  accent?: PaletteColor
  dividers?: TableDividers
  onDividersChange?: (dividers: TableDividers) => void
  layers: SurfaceLayers
  onLayersChange: (layers: SurfaceLayers) => void
  onSchemeChange: (scheme: SurfaceScheme) => void
  onPrimaryChange: (color: PaletteColor) => void
  onAccentChange?: (color: PaletteColor) => void
}) {
  // The review samples the same token blocks that the theme style sheet applies.
  const options = (): ThemeOptions =>
    props.themeOptions ?? {
      mode: schemeMode(props.scheme),
      primary: primaryOption(props.primary),
      layers: props.layers,
      dividers: props.dividers,
    }
  const active = createMemo(() => resolveThemeTokens(options()))
  const sampleColor = (
    role: 'primary' | 'secondary' | 'accent',
    color: PaletteColor,
  ) =>
    resolveThemeTokens({ ...options(), [role]: paletteColorName(color) })[
      `--ui-${role}`
    ]
  const dividerSample = (key: keyof TableDividers, level: 0 | 1 | 2 | 3) => {
    const tokens = resolveThemeTokens({
      ...options(),
      dividers: { ...options().dividers, [key]: level },
    })
    return {
      background:
        tokens[`--ui-table-${key === 'rows' ? 'row' : 'column'}-divider`],
    }
  }
  const swatches = createMemo(() => {
    const tokens = active()
    return {
      surfaces: [1, 2, 3, 4].map((level) => tokens[`--ui-surface-${level}`]!),
      text: [tokens['--ui-text']!, tokens['--ui-muted-text']!],
    }
  })
  const [buttonTone, setButtonTone] = createSignal<ButtonTone>('primary')
  const primaryRow = () => (
    <PaletteRow
      label="Primary"
      colors={primaryColors}
      selected={props.primary}
      sample={(color) => sampleColor('primary', color)}
      onChange={props.onPrimaryChange}
    />
  )
  return (
    <section class="appearance-review" aria-label="Appearance review">
      <Show when={props.accent}>
        {(accent) => (
          <div class="appearance-palettes">
            <div class="appearance-pickers">{primaryRow()}</div>
            <Show when={props.decorations}>
              {(decoration) => (
                <div class="appearance-pickers">
                  <PaletteRow
                    label="Secondary"
                    colors={secondaryColors}
                    selected={secondaryColors[decoration().secondary]!}
                    sample={(color) => sampleColor('secondary', color)}
                    onChange={(color) =>
                      props.onDecorationsChange?.(
                        {
                          ...decoration(),
                          secondary: secondaryColors.indexOf(color),
                        },
                        true,
                      )
                    }
                  />
                </div>
              )}
            </Show>
            <div class="appearance-pickers">
              <PaletteRow
                label="Accent"
                colors={accentColors}
                selected={accent()}
                sample={(color) => sampleColor('accent', color)}
                onChange={(color) => props.onAccentChange?.(color)}
              />
            </div>
          </div>
        )}
      </Show>
      <div class="appearance-pickers">
        <div
          class="appearance-options"
          role="group"
          aria-label="Neutral surfaces"
        >
          <span data-ui-text="system">
            {props.accent ? 'Neutral surfaces' : 'Surfaces'}
          </span>
          <For each={schemes}>
            {(scheme) => (
              <Button
                aria-label={`${scheme.name} surfaces`}
                aria-pressed={props.scheme === scheme ? 'true' : 'false'}
                onClick={() => props.onSchemeChange(scheme)}
              >
                {scheme.name}
              </Button>
            )}
          </For>
        </div>
        <Show when={!props.accent}>{primaryRow()}</Show>
        <div class="appearance-options" role="group" aria-label="Button tone">
          <span data-ui-text="system">Tone</span>
          <For each={decorationColors}>
            {(tone) => (
              <Button
                aria-pressed={buttonTone() === tone ? 'true' : 'false'}
                onClick={() => setButtonTone(tone)}
              >
                {tone}
              </Button>
            )}
          </For>
        </div>
        <div
          class="appearance-options"
          role="group"
          aria-label="Button variants"
        >
          <span data-ui-text="system">Buttons</span>
          <For each={['outline', 'filled', 'inverted', 'ghost'] as const}>
            {(variant) => (
              <Button
                variant={variant}
                tone={buttonTone()}
                title={`${variant} button sample`}
              >
                {variant}
              </Button>
            )}
          </For>
        </div>
        <a href="https://open-props.style/#color" data-ui-text="system">
          Open Props
        </a>
      </div>
      <div class="appearance-layers">
        <Show when={props.onPlacementChange}>
          <div
            class="appearance-options"
            role="group"
            aria-label="Controls placement"
          >
            <span data-ui-text="system">Controls</span>
            <For each={['left', 'top', 'right'] as const}>
              {(placement) => (
                <Button
                  aria-label={`${placement} controls pane`}
                  aria-pressed={
                    props.placement === placement ? 'true' : 'false'
                  }
                  onClick={() => props.onPlacementChange?.(placement)}
                >
                  {placement}
                </Button>
              )}
            </For>
          </div>
        </Show>
        <For
          each={
            [
              { key: 'canvas', name: 'Base' },
              { key: 'pane', name: 'Panes' },
              { key: 'content', name: 'Content' },
            ] as const
          }
        >
          {(layer) => (
            <div
              class="appearance-options"
              role="group"
              aria-label={`${layer.name} surface`}
            >
              <span data-ui-text="system">{layer.name}</span>
              <For each={[0, 1, 2] as const}>
                {(level: SurfaceLevel) => (
                  <Button
                    aria-label={`${layer.name} Surface ${level + 1}`}
                    aria-pressed={
                      props.layers[layer.key] === level ? 'true' : 'false'
                    }
                    onClick={() =>
                      props.onLayersChange({
                        ...props.layers,
                        [layer.key]: level,
                      })
                    }
                  >
                    {level + 1}
                  </Button>
                )}
              </For>
            </div>
          )}
        </For>
        <Show when={props.dividers}>
          <For
            each={
              [
                { key: 'rows', name: 'Row lines' },
                { key: 'columns', name: 'Column lines' },
              ] as const
            }
          >
            {(divider) => (
              <div
                class="appearance-options"
                role="group"
                aria-label={divider.name}
              >
                <span data-ui-text="system">{divider.name}</span>
                <For each={[0, 1, 2, 3] as const}>
                  {(level) => (
                    <Button
                      aria-label={`${divider.name} Surface ${level + 1}`}
                      aria-pressed={
                        props.dividers?.[divider.key] === level
                          ? 'true'
                          : 'false'
                      }
                      onClick={() =>
                        props.onDividersChange?.({
                          rows: 0,
                          columns: 0,
                          ...props.dividers,
                          [divider.key]: level,
                        })
                      }
                    >
                      <span
                        class="divider-sample"
                        aria-hidden="true"
                        style={dividerSample(divider.key, level)}
                      />
                      {level + 1}
                    </Button>
                  )}
                </For>
              </div>
            )}
          </For>
        </Show>
      </div>
      <Show when={props.decorations}>
        <div class="appearance-decorations">
          <Show when={props.showDecorationControls !== false}>
            <For each={['dotColor', 'borderColor'] as const}>
              {(key) => (
                <div
                  class="appearance-options"
                  role="group"
                  aria-label={
                    key === 'dotColor' ? 'Dot color' : 'Decorative border color'
                  }
                >
                  <span data-ui-text="system">
                    {key === 'dotColor' ? 'Dots' : 'Decorative border'}
                  </span>
                  <For each={decorationColors}>
                    {(color) => (
                      <Button
                        aria-pressed={
                          props.decorations![key] === color ? 'true' : 'false'
                        }
                        onClick={() =>
                          props.onDecorationsChange?.(
                            { ...props.decorations!, [key]: color },
                            true,
                          )
                        }
                      >
                        {color}
                      </Button>
                    )}
                  </For>
                </div>
              )}
            </For>
            <For
              each={
                [
                  { key: 'dots', label: 'Dot opacity' },
                  { key: 'border', label: 'Decorative border opacity' },
                  { key: 'inside', label: 'Dots inside buttons' },
                ] as const
              }
            >
              {(item) => (
                <Field class="appearance-opacity">
                  <Label>
                    {item.label} · {props.decorations![item.key]}%
                  </Label>
                  <Input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={props.decorations![item.key]}
                    onValueChange={(value) =>
                      props.onDecorationsChange?.(
                        { ...props.decorations!, [item.key]: Number(value) },
                        false,
                      )
                    }
                    onChange={(event) =>
                      props.onDecorationsChange?.(
                        {
                          ...props.decorations!,
                          [item.key]: Number(event.currentTarget.value),
                        },
                        true,
                      )
                    }
                  />
                </Field>
              )}
            </For>
          </Show>
        </div>
      </Show>
      <div
        class="surface-swatches"
        role="group"
        aria-label="Surface and text swatches"
      >
        <For each={roles}>
          {(role) => (
            <div class="surface-swatch" data-swatch={role.name}>
              <span
                class="surface-sample"
                aria-hidden="true"
                style={{ background: swatches()[role.source][role.index] }}
              />
              <span>
                <span data-ui-text="system">{role.name}</span>
                <code>{swatches()[role.source][role.index]}</code>
              </span>
            </div>
          )}
        </For>
      </div>
    </section>
  )
}
