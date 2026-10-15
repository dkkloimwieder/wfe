import { For } from 'solid-js'
import { Button } from '@wfe/components'
import { schemes, accents, accentColor } from './appearance'
import type { Accent, SurfaceScheme } from './appearance'

const roles = [
  { name: 'Surface 1', source: 'surfaces', index: 0, shadow: 0 },
  { name: 'Surface 2', source: 'surfaces', index: 1, shadow: 1 },
  { name: 'Surface 3', source: 'surfaces', index: 2, shadow: 2 },
  { name: 'Surface 4', source: 'surfaces', index: 3, shadow: 3 },
  { name: 'Text 1', source: 'text', index: 0, shadow: 0 },
  { name: 'Text 2', source: 'text', index: 1, shadow: 0 },
] as const

/** Temporary application-owned review. Nothing is persisted. */
export function AppearanceReview(props: {
  scheme: SurfaceScheme
  accent: Accent
  depth: boolean
  onSchemeChange: (scheme: SurfaceScheme) => void
  onAccentChange: (accent: Accent) => void
  onDepthChange: (depth: boolean) => void
}) {
  return (
    <section class="appearance-review" aria-label="Appearance review">
      <div class="appearance-pickers">
        <div
          class="appearance-options"
          role="group"
          aria-label="Neutral surfaces"
        >
          <span data-ui-text="system">Surfaces</span>
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
        <div class="appearance-options" role="group" aria-label="Accent colors">
          <span data-ui-text="system">Accent</span>
          <For each={accents}>
            {(accent) => (
              <Button
                class="accent-swatch"
                aria-label={`${accent.name} accent`}
                title={accent.name}
                aria-pressed={props.accent === accent ? 'true' : 'false'}
                onClick={() => props.onAccentChange(accent)}
              >
                <span
                  aria-hidden="true"
                  style={{ background: accentColor(accent, props.scheme) }}
                />
              </Button>
            )}
          </For>
        </div>
        <Button
          aria-label="Layered shadows"
          aria-pressed={props.depth ? 'true' : 'false'}
          onClick={() => props.onDepthChange(!props.depth)}
        >
          Depth
        </Button>
        <a href="https://open-props.style/#color" data-ui-text="system">
          Open Props
        </a>
      </div>
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
                style={{
                  background: props.scheme[role.source][role.index],
                  'box-shadow':
                    props.depth && role.shadow
                      ? `var(--review-shadow-${role.shadow})`
                      : 'none',
                }}
              />
              <span>
                <span data-ui-text="system">{role.name}</span>
                <code>{props.scheme[role.source][role.index]}</code>
              </span>
            </div>
          )}
        </For>
      </div>
    </section>
  )
}
