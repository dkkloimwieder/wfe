import { ThemeReview } from './ThemeReview'
import { GanttExample } from './GanttExample'
import { DragExample } from '../../shared/drag-and-drop/DragExample'
import { BoardExample } from '../../shared/drag-and-drop/BoardExample'
import { DecorationGeometryExample } from './DecorationGeometryExample'
import { InputDecorationExample } from './InputDecorationExample'
import { ColumnControlsApp } from '../../shared/controls/ColumnControlsApp'
import { FormActionsExample } from './FormActionsExample'
import { ContextControls } from '../../shared/controls/ContextControls'
import { PaginationExample } from './PaginationExample'
import { EntryExample } from './EntryExample'
import { SubTables } from '../../shared/controls/SubTables'
import { EverythingForm } from './EverythingForm'
import { createEffect, lazy, Loading, onCleanup, untrack } from 'solid-js'
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
import {
  BreadcrumbControls,
  breadcrumbLifecycle,
} from '../../shared/controls/BreadcrumbControls'
import {
  CollapsibleControls,
  collapsibleLifecycle,
} from '../../shared/controls/CollapsibleControls'
import {
  AccordionControls,
  accordionLifecycle,
} from '../../shared/controls/AccordionControls'
import {
  ResizableControls,
  resizableLifecycle,
} from '../../shared/controls/ResizableControls'
import { MatchingChoices } from './MatchingChoices'
import { BooleanControls } from '../BooleanControls'
import { OverlayControls } from '../OverlayControls'
import { DisplayControls } from '../DisplayControls'
import { Fields, Buttons, Dates, Dialogs, TableExample } from './Recipes'
import { entryFor, readRoute } from './catalog'
import type { GalleryId, GalleryState } from './catalog'
import './gallery.css'

const IconsExample = lazy(() =>
  import('./IconsExample').then((module) => ({ default: module.IconsExample })),
)

const views = {
  themes: ThemeReview,
  gantt: () => (
    <div class="gallery-example-fill">
      <GanttExample />
    </div>
  ),
  kanban: () => (
    <div class="gallery-example-fill">
      <BoardExample />
    </div>
  ),
  'drag-and-drop': DragExample,
  'decoration-geometry': DecorationGeometryExample,
  icons: IconsExample,
  'input-decoration': InputDecorationExample,
  'form-actions': FormActionsExample,
  'column-controls': () => (
    <div class="gallery-table">
      <ColumnControlsApp />
    </div>
  ),
  contexts: ContextControls,
  pagination: PaginationExample,
  entry: EntryExample,
  everything: EverythingForm,
  fields: Fields,
  buttons: Buttons,
  dates: Dates,
  dialogs: Dialogs,
  table: TableExample,
  subtables: SubTables,
  files: FileControls,
  numbers: NumberControls,
  tabs: TabsControls,
  breadcrumbs: BreadcrumbControls,
  collapsible: CollapsibleControls,
  accordion: AccordionControls,
  resizable: ResizableControls,
  choices: MatchingChoices,
  booleans: BooleanControls,
  overlays: OverlayControls,
  display: DisplayControls,
}
export function GalleryExample(props: { id: GalleryId; state: GalleryState }) {
  const entry = entryFor(untrack(() => props.id))
  const lifecycle = (
    {
      files: fileLifecycle,
      numbers: numberLifecycle,
      tabs: tabsLifecycle,
      resizable: resizableLifecycle,
      breadcrumbs: breadcrumbLifecycle,
      collapsible: collapsibleLifecycle,
      accordion: accordionLifecycle,
    } as Partial<Record<GalleryId, object>>
  )[entry.id]
  const previousLifecycle = lifecycle ? { ...lifecycle } : undefined
  const fixtureKey = (
    {
      choices: 'choiceFixture',
      booleans: 'booleanFixture',
      overlays: 'overlayFixture',
      display: 'displayFixture',
    } as Partial<Record<GalleryId, string>>
  )[entry.id]
  const previousFixture = fixtureKey
    ? Reflect.get(window, fixtureKey)
    : undefined
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
  let alive = true
  let revision = 0
  createEffect(
    () => props.state,
    (state) => {
      const current = ++revision
      queueMicrotask(() => {
        if (alive && current === revision) applyState(state)
      })
    },
  )
  onCleanup(() => {
    alive = false
    revision++
    if (lifecycle && previousLifecycle)
      Object.assign(lifecycle, previousLifecycle)
    if (fixtureKey) {
      if (previousFixture === undefined)
        Reflect.deleteProperty(window, fixtureKey)
      else Reflect.set(window, fixtureKey, previousFixture)
    }
  })
  return (
    <div class="gallery-preview">
      <div
        class={
          entry.id === 'gantt' ||
          entry.id === 'kanban' ||
          entry.id === 'entry' ||
          entry.id === 'everything' ||
          entry.id === 'table' ||
          entry.id === 'column-controls' ||
          entry.id === 'pagination' ||
          entry.id === 'subtables'
            ? 'gallery-example-unframed'
            : 'gallery-example-panel'
        }
        data-gallery-group={entry.group}
      >
        <Loading
          fallback={
            <p role="status" aria-label="Example loading">
              LOADING EXAMPLE
            </p>
          }
        >
          <Dynamic component={views[entry.id]} state={props.state} embedded />
        </Loading>
      </div>
    </div>
  )
}

export function GalleryPreview() {
  const route = untrack(() => readRoute(new URL(window.location.href)))
  const oldTitle = document.title
  document.title = `${entryFor(route.id).label} · Component preview`
  onCleanup(() => {
    document.title = oldTitle
  })
  return (
    <DefaultAppearance
      preset={route.preset}
      mode={
        route.scheme === 2
          ? 'dark'
          : route.scheme === 0
            ? 'monochrome'
            : 'light'
      }
      style={
        route.preset === 'default'
          ? appearanceStyle(
              schemes[route.scheme]!,
              accents[route.accent]!,
              route.depth,
              route.layers,
              undefined,
              route.decorations,
            )
          : undefined
      }
    >
      <GalleryExample id={route.id} state={route.state} />
    </DefaultAppearance>
  )
}
