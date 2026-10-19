import { EverythingForm } from './EverythingForm'
import { createSignal, onCleanup, onSettled, untrack } from 'solid-js'
import { Dynamic } from '@solidjs/web'
import { DefaultAppearance } from '../../shared/appearance/DefaultAppearance'
import {
  appearanceStyle,
  schemes,
  accents,
} from '../../shared/appearance/appearance'
import { FileControls, fileLifecycle } from '../../shared/controls/FileControls'
import {
  NumberControls,
  numberLifecycle,
} from '../../shared/controls/NumberControls'
import { TabsControls, tabsLifecycle } from '../../shared/controls/TabsControls'
import { BreadcrumbControls } from '../../shared/controls/BreadcrumbControls'
import { CollapsibleControls } from '../../shared/controls/CollapsibleControls'
import { AccordionControls } from '../../shared/controls/AccordionControls'
import {
  ResizableControls,
  resizableLifecycle,
} from '../../shared/controls/ResizableControls'
import { ChoiceControls } from '../ChoiceControls'
import { BooleanControls } from '../BooleanControls'
import { OverlayControls } from '../OverlayControls'
import { DisplayControls } from '../DisplayControls'
import { Fields, Buttons, Dates, Dialogs, TableExample } from './Recipes'
import { entryFor, readConfig, readRoute } from './catalog'
import type { GalleryState } from './catalog'
import { exampleSizing } from '../../shared/appearance/sizing'
import './gallery.css'

const views = {
  everything: EverythingForm,
  fields: Fields,
  buttons: Buttons,
  dates: Dates,
  dialogs: Dialogs,
  table: TableExample,
  files: FileControls,
  numbers: NumberControls,
  tabs: TabsControls,
  breadcrumbs: BreadcrumbControls,
  collapsible: CollapsibleControls,
  accordion: AccordionControls,
  resizable: ResizableControls,
  choices: ChoiceControls,
  booleans: BooleanControls,
  overlays: OverlayControls,
  display: DisplayControls,
}
export function GalleryPreview() {
  const initial = untrack(() => readRoute(new URL(window.location.href)))
  const entry = entryFor(initial.id)
  const [config, setConfig] = createSignal(initial)
  function applyState(state: GalleryState) {
    const disabled = state === 'disabled',
      readonly = state === 'readonly',
      invalid = state === 'invalid'
    switch (entry.id) {
      case 'choices':
        window.choiceFixture.configure({
          disabled,
          readOnly: readonly,
          invalid,
        })
        break
      case 'booleans':
        window.booleanFixture.configure({
          disabled,
          readOnly: readonly,
          invalid,
        })
        break
      case 'files':
        fileLifecycle.configure({ disabled, readonly })
        break
      case 'numbers':
        numberLifecycle.configure({ disabled, readonly })
        break
      case 'tabs':
        tabsLifecycle.configure({ disabled })
        break
      case 'resizable':
        resizableLifecycle.configure({ disabled, resizable: !disabled })
        break
    }
  }
  onSettled(() => {
    let active = true
    let paint: number | undefined
    queueMicrotask(() => {
      if (!active) return
      applyState(untrack(config).state)
      window.parent.postMessage(
        { type: 'wfe-gallery-ready' },
        window.location.origin,
      )
    })
    const receive = (event: MessageEvent) => {
      if (
        event.source !== window.parent ||
        event.origin !== window.location.origin ||
        event.data?.type !== 'wfe-gallery-config'
      )
        return
      const next = readConfig(event.data.config)
      if (!next || !(entry.states as readonly string[]).includes(next.state))
        return
      setConfig({ ...initial, ...next })
      applyState(next.state)
      cancelAnimationFrame(paint ?? 0)
      const version = event.data.version
      void document.fonts.ready.then(() => {
        if (!active) return
        paint = requestAnimationFrame(() => {
          if (active)
            window.parent.postMessage(
              { type: 'wfe-gallery-painted', version },
              window.location.origin,
            )
        })
      })
    }
    window.addEventListener('message', receive)
    return () => {
      active = false
      cancelAnimationFrame(paint ?? 0)
      window.removeEventListener('message', receive)
    }
  })
  const oldTitle = untrack(() => document.title)
  document.title = `${entry.label} · Component preview`
  onCleanup(() => {
    document.title = oldTitle
  })
  return (
    <DefaultAppearance
      class="gallery-preview"
      style={{
        ...exampleSizing,
        ...appearanceStyle(
          schemes[config().scheme]!,
          accents[config().accent]!,
          config().depth,
          config().layers,
        ),
      }}
    >
      <div
        class={
          entry.id === 'everything' || entry.id === 'table'
            ? 'gallery-example-unframed'
            : 'gallery-example-panel'
        }
        data-gallery-group={entry.group}
      >
        <Dynamic component={views[entry.id]} state={config().state} embedded />
      </div>
    </DefaultAppearance>
  )
}
