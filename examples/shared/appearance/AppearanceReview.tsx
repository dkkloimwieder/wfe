import { For, Show } from 'solid-js'
import { Button } from '@wfe/components'
import { schemes, accents, accentColor, dividerSurfaces } from './appearance'
import type {
  Accent,
  SurfaceScheme,
  Depth,
  SurfaceLayers,
  SurfaceLevel,
  TableDividers,
} from './appearance'

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
  placement?: 'left' | 'top' | 'right'
  onPlacementChange?: (placement: 'left' | 'top' | 'right') => void
  scheme: SurfaceScheme
  accent: Accent
  depth: Depth
  dividers?: TableDividers
  onDividersChange?: (dividers: TableDividers) => void
  layers: SurfaceLayers
  onLayersChange: (layers: SurfaceLayers) => void
  onSchemeChange: (scheme: SurfaceScheme) => void
  onAccentChange: (accent: Accent) => void
  onDepthChange: (depth: Depth) => void
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
        <div class="appearance-options" role="group" aria-label="Shadow depth">
          <span data-ui-text="system">Depth</span>
          <For each={[0, 1, 2, 3] as const}>
            {(depth) => (
              <Button
                aria-label={depth ? `Depth ${depth}` : 'No shadows'}
                aria-pressed={props.depth === depth ? 'true' : 'false'}
                onClick={() => props.onDepthChange(depth)}
              >
                {depth || 'Off'}
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
                        style={{
                          background: dividerSurfaces(props.scheme)[level],
                        }}
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
