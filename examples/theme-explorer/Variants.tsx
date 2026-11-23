import { createSignal, flush, For, onSettled } from 'solid-js'
import { Button } from '@wfe/components'
import { DefaultAppearance } from '../shared/appearance/DefaultAppearance'
import {
  defaults,
  galleryThemeOptions,
  layersForPreset,
} from '../shared/appearance/galleryConfig'
import { forceState, installForcedStateRules } from './force-states'
import groups from './variant-groups.json'
import type { Specimen, State } from './variant-types'
import './variants.css'

const presets = (
  [
    { value: 'default', label: 'Sketchy' },
    { value: 'vanilla', label: 'Vanilla' },
    { value: 'laser', label: 'Laser' },
  ] as const
).map(({ value, label }) => ({
  value,
  label,
  options: galleryThemeOptions({
    ...defaults,
    preset: value,
    layers: layersForPreset(value),
  }),
}))

type Group = keyof typeof groups

const loadGroup = {
  buttons: () => import('./variant-buttons'),
  inputs: () => import('./variant-fields'),
  icons: () => import('./variant-icons'),
  surfaces: () => import('./variant-surfaces'),
} satisfies Record<Group, () => Promise<{ specimens: Specimen[] }>>

export async function loadVariantGroup(value: string | null) {
  const group =
    value && Object.hasOwn(loadGroup, value) ? (value as Group) : 'buttons'
  const { specimens } = await loadGroup[group]()
  return { group, specimens }
}

function VariantSample(props: {
  specimen: Specimen
  state: State
  preset: string
}) {
  return (
    <div
      class="variant-sample"
      data-variant={`${props.specimen.id}/${props.state}`}
      data-preset={props.preset}
      data-variant-state={props.state}
      data-variant-baseline={props.specimen.baseline}
      data-variant-open-trigger={
        props.state === 'open' ? props.specimen.openTrigger : undefined
      }
      data-ui-portal-root=""
    >
      <span class="variant-state">{props.state}</span>
      <div class="variant-content">{props.specimen.render(props.state)}</div>
    </div>
  )
}

export function Variants(props: { group: Group; specimens: Specimen[] }) {
  const params = new URLSearchParams(location.search)
  const [mode, setMode] = createSignal<'light' | 'dark'>(
    params.get('mode') === 'dark' ? 'dark' : 'light',
  )
  let main!: HTMLElement
  function toggleMode() {
    const next = mode() === 'light' ? 'dark' : 'light'
    setMode(next)
    params.set('mode', next)
    history.replaceState(null, '', `?${params}`)
  }
  function groupHref(group: string) {
    const next = new URLSearchParams(params)
    next.set('variants', group)
    next.set('mode', mode())
    return `?${next}`
  }

  onSettled(() => {
    const disposeRules = installForcedStateRules(document)
    // Keep composite examples open when another sample or the mode control
    // receives focus. These events come from the shared dismissable layer.
    const keepOpen = (event: Event) => event.preventDefault()
    const outsideEvents = [
      'interactOutside.focusOutside',
      'interactOutside.pointerDownOutside',
    ]
    for (const name of outsideEvents)
      main.addEventListener(name, keepOpen, true)

    // Open the snapshots after field registration. Suppress autofocus while
    // they mount so the page starts at its header.
    main.inert = true
    let readyTimer: number | undefined
    const frame = requestAnimationFrame(() => {
      for (const sample of main.querySelectorAll<HTMLElement>(
        '.variant-sample',
      )) {
        const selector = sample.dataset.variantOpenTrigger
        if (!selector) continue
        const trigger = sample.querySelector<HTMLButtonElement>(selector)
        if (trigger?.getAttribute('aria-haspopup') === 'listbox') {
          trigger.dispatchEvent(
            new PointerEvent('pointerdown', {
              bubbles: true,
              cancelable: true,
              pointerType: 'mouse',
              button: 0,
            }),
          )
        } else trigger?.click()
      }
      // Mount the portals and let their autofocus callbacks run before
      // restoring interaction.
      flush()
      for (const sample of main.querySelectorAll<HTMLElement>(
        '.variant-sample',
      )) {
        const state = sample.dataset.variantState
        if (state === 'hover' || state === 'focus' || state === 'pressed')
          forceState(sample, state, params.has('audit-all-focus'))
      }
      readyTimer = window.setTimeout(() => {
        main.inert = false
        main.dataset.variantsReady = ''
      }, 0)
    })
    return () => {
      cancelAnimationFrame(frame)
      if (readyTimer !== undefined) window.clearTimeout(readyTimer)
      main.inert = false
      for (const name of outsideEvents)
        main.removeEventListener(name, keepOpen, true)
      disposeRules()
    }
  })

  return (
    <DefaultAppearance options={galleryThemeOptions(defaults)} mode={mode()}>
      <main data-variants-page ref={main} id="variants">
        <header class="variants-header">
          <a href="./">Theme explorer</a>
          <h1>Variants</h1>
          <Button
            aria-pressed={mode() === 'dark' ? 'true' : 'false'}
            onClick={toggleMode}
          >
            Dark mode
          </Button>
        </header>
        <nav class="variants-groups" aria-label="Variant groups">
          <For each={Object.entries(groups)}>
            {([group, label]) => (
              <a
                href={groupHref(group)}
                aria-current={group === props.group ? 'page' : undefined}
              >
                {label}
              </a>
            )}
          </For>
        </nav>
        <table class="variants-grid" aria-label="Component variants">
          <colgroup>
            <col class="variants-labels" />
            <For each={presets}>{() => <col class="variants-column" />}</For>
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Component and variant</th>
              <For each={presets}>
                {(preset) => (
                  <th scope="col" class="variants-preset">
                    <DefaultAppearance
                      options={preset.options}
                      preset={preset.value}
                      mode={mode()}
                    >
                      <h2>{preset.label}</h2>
                    </DefaultAppearance>
                  </th>
                )}
              </For>
            </tr>
          </thead>
          <tbody>
            <For each={props.specimens}>
              {(entry) => (
                <tr
                  data-variant-row={entry.id}
                  data-variant-states={entry.states.join(' ')}
                >
                  <th scope="row">{entry.label}</th>
                  <For each={presets}>
                    {(preset) => (
                      <td>
                        <DefaultAppearance
                          class="variant-states"
                          options={preset.options}
                          preset={preset.value}
                          mode={mode()}
                        >
                          <For each={entry.states}>
                            {(state) => (
                              <VariantSample
                                specimen={entry}
                                state={state}
                                preset={preset.value}
                              />
                            )}
                          </For>
                        </DefaultAppearance>
                      </td>
                    )}
                  </For>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </main>
    </DefaultAppearance>
  )
}
