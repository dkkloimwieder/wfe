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
  Field,
  FieldGroup,
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
import { themeTokens } from '../shared/appearance/appearance'
import {
  defaults,
  galleryThemeOptions,
  layersForPreset,
  schemeForPreset,
} from '../shared/appearance/galleryConfig'
import type { GalleryConfig } from '../shared/appearance/galleryConfig'
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
const modeName = (scheme: number) =>
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
  const names = createMemo(() =>
    Object.keys({
      ...themeTokens({
        ...galleryThemeOptions(config()),
        preset: config().preset,
        mode: modeName(config().scheme),
      }),
      ...active(),
    }).filter((name) => name.startsWith('--')),
  )
  const groups = createMemo(() => groupTokens(names()))
  const css = () => overridesAsCss(preset(), active())

  // Read values after the theme root receives its new inline declarations.
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
        contextLabel="Theme tokens"
        contextToggleLabel="Tokens"
        contextCloseLabel="Close tokens"
        style={{ '--ui-context-width': '24rem' }}
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
        context={() => (
          <section
            class="example-stack gallery-sidebar-options"
            aria-label="Token editor"
            data-token-panel={config().preset}
          >
            <div class="example-actions">
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
            </div>
            <output aria-live="polite" data-copy-status>
              {copyStatus()}
            </output>
            <Field>
              <Label>Changed tokens as CSS</Label>
              <Textarea readonly value={css()} rows={4} />
            </Field>
            <For each={groups()}>
              {(entry) => (
                <FieldGroup title={entry.group} data-token-group={entry.group}>
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
                      </Field>
                    )}
                  </For>
                </FieldGroup>
              )}
            </For>
          </section>
        )}
      >
        <section
          class="gallery-stage"
          aria-label="Preview components"
          ref={(node) => {
            probe = node
          }}
        >
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
              <section aria-label="Table">
                <TableExample />
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
