import {
  For,
  Show,
  createMemo,
  createSignal,
  onSettled,
  untrack,
} from 'solid-js'
import {
  Button,
  Checkbox,
  CollapsibleSection,
  Field,
  HelpText,
  Icon,
  IconButton,
  Input,
  InputGroup,
  Label,
  SelectField,
  Sheet,
  Switch,
  Textarea,
} from '@wfe/components'
import { DashboardShell } from '@wfe/components/layout'
import { DefaultAppearance } from '../shared/appearance/DefaultAppearance'
import {
  themeTokenBlocks,
  themeTokenSources,
  themeTokens,
} from '../shared/appearance/appearance'
import {
  defaults,
  galleryThemeOptions,
  layersForPreset,
  schemeForPreset,
} from '../shared/appearance/galleryConfig'
import type { GalleryConfig } from '../shared/appearance/galleryConfig'
import type { ThemeMode } from '@wfe/components/theme'
import {
  Buttons,
  Dialogs,
  Fields,
  TableExample,
} from '../shared/controls/Recipes'
import { EverythingForm } from '../shared/controls/EverythingForm'
import { TabsControls } from '../shared/controls/TabsControls'
import {
  appliedOverrides,
  groupTokens,
  isColor,
  overridesAsCss,
  type Preset,
} from './tokens'
import '../shared/appearance/style.css'
import '../shared/appearance/gallery-layout.css'

const presets: readonly { value: Preset; label: string }[] = [
  { value: 'default', label: 'Sketchy' },
  { value: 'vanilla', label: 'Vanilla' },
  { value: 'laser', label: 'Laser' },
]
const modes = [
  { value: '1', label: 'Light' },
  { value: '2', label: 'Dark' },
  { value: '0', label: 'Black and white' },
]
const modeName = (scheme: number): ThemeMode =>
  scheme === 2 ? 'dark' : scheme === 0 ? 'monochrome' : 'light'

/** The gallery defaults and theme wiring, with live token overrides on top. */
export function ThemeExplorer() {
  const [config, setConfig] = createSignal<GalleryConfig>({ ...defaults })
  const [overrides, setOverrides] = createSignal<
    Record<Preset, Record<string, string>>
  >({ default: {}, vanilla: {}, laser: {} })
  const [computed, setComputed] = createSignal<Record<string, string>>({})
  const [copyStatus, setCopyStatus] = createSignal('')
  let probe: HTMLElement | undefined
  let frame: number | undefined
  let alive = true

  const preset = () => config().preset
  const active = () => overrides()[preset()]
  const options = () => ({
    ...galleryThemeOptions(config()),
    preset: config().preset,
    mode: modeName(config().scheme),
  })
  const [overridesOnly, setOverridesOnly] = createSignal(false)
  // Each token shows the tokens.css block that sets it for the current choices.
  const sources = createMemo(() => themeTokenSources(options()))
  const base = themeTokenBlocks[0]!.title
  const names = createMemo(() =>
    Object.keys({ ...themeTokens(options()), ...active() }).filter(
      (name) =>
        name.startsWith('--') &&
        (!overridesOnly() || (sources()[name] ?? base) !== base),
    ),
  )
  const summary = createMemo(() => {
    const all = Object.values(sources())
    const fromBase = all.filter((title) => title === base).length
    return `${fromBase} tokens from the base block, ${all.length - fromBase} from mode, density, preset and choice blocks.`
  })
  const groups = createMemo(() => groupTokens(names()))
  const css = () => overridesAsCss(preset(), active())

  // Read values after the theme root receives its new choices and overrides.
  function refresh() {
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      frame = undefined
      const root = probe?.closest<HTMLElement>('.ui-theme')
      if (!alive || !root) return
      const style = getComputedStyle(root)
      setComputed(
        Object.fromEntries(
          untrack(names).map((name) => [
            name,
            style.getPropertyValue(name).trim(),
          ]),
        ),
      )
    })
  }
  onSettled(() => {
    refresh()
    return () => {
      alive = false
      if (frame !== undefined) cancelAnimationFrame(frame)
    }
  })
  function choosePreset(value: string) {
    const next: Preset =
      value === 'vanilla' || value === 'laser' ? value : 'default'
    setConfig((current) => ({
      ...current,
      preset: next,
      scheme:
        schemeForPreset(next) !== 1 ? schemeForPreset(next) : current.scheme,
      layers: layersForPreset(next),
    }))
    setCopyStatus('')
    refresh()
  }
  function chooseMode(value: string) {
    setConfig((current) => ({ ...current, scheme: Number(value) }))
    refresh()
  }
  function edit(name: string, value: string | undefined) {
    const key = untrack(preset)
    setOverrides((current) => {
      const next = { ...current[key] }
      if (value === undefined) delete next[name]
      else next[name] = value
      return { ...current, [key]: next }
    })
    setCopyStatus('')
    refresh()
  }
  function resetAll() {
    const key = untrack(preset)
    setOverrides((current) => ({ ...current, [key]: {} }))
    setCopyStatus('')
    refresh()
  }
  async function copy() {
    const text = untrack(css)
    try {
      await navigator.clipboard.writeText(text)
      if (alive) setCopyStatus('Copied the changed tokens.')
    } catch {
      if (alive) setCopyStatus('Copy failed. Select the CSS text instead.')
    }
  }

  return (
    <DefaultAppearance
      class="gallery-shell"
      options={galleryThemeOptions(config())}
      preset={config().preset}
      mode={modeName(config().scheme)}
      style={appliedOverrides(active())}
    >
      <DashboardShell
        class="gallery-dashboard"
        scroll="content"
        mainLabel="Theme preview"
        navigationLabel="Theme tokens"
        toggleLabel="Tokens"
        closeLabel="Close tokens"
        style={{ '--ui-navigation-width': '24rem' }}
        header={
          <>
            <h1 data-ui-text="system">Theme explorer</h1>
            <div class="example-actions">
              <Field>
                <Label>Preset</Label>
                <SelectField
                  label="Preset"
                  value={config().preset}
                  choices={presets}
                  onValueChange={choosePreset}
                />
              </Field>
              <Field>
                <Label>Mode</Label>
                <SelectField
                  label="Mode"
                  value={String(config().scheme)}
                  choices={modes}
                  onValueChange={chooseMode}
                />
              </Field>
            </div>
          </>
        }
        // The sidebar holds the library sections that the gallery sidebar and
        // the table filter pane use. The explorer adds no styling of its own.
        navigation={() => (
          <>
            <CollapsibleSection
              title="Changes"
              count={`${Object.keys(active()).length} edited`}
              defaultOpen
            >
              <div class="example-actions" data-token-panel={config().preset}>
                <Button
                  tone="accent"
                  disabled={!css()}
                  onClick={() => void copy()}
                >
                  Copy changes as CSS
                </Button>
                <Button disabled={!css()} onClick={resetAll}>
                  Reset all
                </Button>
                <output aria-live="polite" data-copy-status>
                  {copyStatus()}
                </output>
              </div>
              <HelpText data-token-summary>{summary()}</HelpText>
              <Checkbox
                checked={overridesOnly()}
                onChange={(value) => {
                  setOverridesOnly(value)
                  refresh()
                }}
              >
                <Checkbox.Input />
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <Checkbox.Label>
                  Show only tokens that a block overrides
                </Checkbox.Label>
              </Checkbox>
              <Field>
                <Label>Changed tokens as CSS</Label>
                <Textarea readonly value={css()} rows={4} />
              </Field>
            </CollapsibleSection>
            <For each={groups()}>
              {(entry) => (
                <CollapsibleSection
                  title={entry.group}
                  count={`${entry.names.length} tokens`}
                  defaultOpen
                >
                  <For each={entry.names}>
                    {(name) => (
                      <Field data-token={name}>
                        <Label data-ui-text="value">{name}</Label>
                        <InputGroup>
                          <Show when={isColor(computed()[name] ?? '')}>
                            <span
                              class="surface-sample"
                              aria-hidden="true"
                              style={{ background: `var(${name})` }}
                            />
                          </Show>
                          <Input
                            data-ui-text="value"
                            value={active()[name] ?? computed()[name] ?? ''}
                            onValueChange={(value) => edit(name, value)}
                          />
                          <IconButton
                            aria-label={`Reset ${name}`}
                            disabled={active()[name] === undefined}
                            onClick={() => edit(name, undefined)}
                          >
                            <Icon name="refresh" />
                          </IconButton>
                        </InputGroup>
                        <HelpText data-token-source>
                          {active()[name] === undefined
                            ? (sources()[name] ?? 'Inherited')
                            : 'Edited in the explorer'}
                        </HelpText>
                      </Field>
                    )}
                  </For>
                </CollapsibleSection>
              )}
            </For>
          </>
        )}
      >
        <section
          class="gallery-stage"
          aria-label="Preview components"
          ref={(node) => {
            probe = node
          }}
        >
          {/* The table sits flush in the stage, as in the gallery, so no canvas
              gap appears above its title band. */}
          <section aria-label="Table" class="gallery-example-unframed">
            <TableExample />
          </section>
          <div class="gallery-preview">
            <div class="example-stack">
              <section class="gallery-example-panel" aria-label="Buttons">
                <Buttons state="normal" />
              </section>
              <section
                class="gallery-example-panel"
                data-gallery-group="Forms"
                aria-label="Inputs and select"
              >
                <Fields state="normal" />
              </section>
              <section
                class="gallery-example-panel"
                data-gallery-group="Forms"
                aria-label="Checkbox and switch"
              >
                <div class="example-stack">
                  <Checkbox defaultChecked>
                    <Checkbox.Input />
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    <Checkbox.Label>Send notifications</Checkbox.Label>
                  </Checkbox>
                  <Switch defaultChecked>
                    <Switch.Input />
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                    <Switch.Label>Active</Switch.Label>
                  </Switch>
                </div>
              </section>
              <section class="gallery-example-panel" aria-label="Tabs">
                <TabsControls />
              </section>
              <section class="gallery-example-panel" aria-label="Overlays">
                <div class="example-actions">
                  <Dialogs />
                  <Sheet>
                    <Sheet.Trigger as={Button}>Open sheet</Sheet.Trigger>
                    <Sheet.Portal>
                      <Sheet.Overlay />
                      <Sheet.Content side="right">
                        <Sheet.Title>Display details</Sheet.Title>
                        <Sheet.Description>
                          Sheet uses Dialog behavior.
                        </Sheet.Description>
                        <Input aria-label="Sheet name" />
                        <Sheet.CloseButton as={Button}>
                          Close sheet
                        </Sheet.CloseButton>
                      </Sheet.Content>
                    </Sheet.Portal>
                  </Sheet>
                </div>
              </section>
              <section
                class="gallery-example-panel"
                data-gallery-group="Forms"
                aria-label="Form"
              >
                <EverythingForm />
              </section>
            </div>
          </div>
        </section>
      </DashboardShell>
    </DefaultAppearance>
  )
}
