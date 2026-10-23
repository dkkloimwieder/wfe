import { resolveGeneratorMessages } from './messages'
import type { GeneratorMessageProps } from './messages'
import { preserveReorderFocus } from './reorderFocus'
import { For, Show, createMemo, createUniqueId, untrack } from 'solid-js'
import {
  DashboardShell,
  DashboardGrid,
  DashboardPanel,
} from '@wfe/components/layout'
import type { DashboardShellProps } from '@wfe/components/layout'
import type {
  LayoutDescription,
  LayoutViewBindings,
  PanelDescription,
} from './types'
import { ActionsView, requireValue, uniqueIds, validateActions } from './shared'
import type { Actions } from './shared'

function panelEntries(value: LayoutDescription) {
  return (
    [
      ['main', value.panels],
      ['navigation', value.navigation ?? []],
      ['context', value.context ?? []],
      ['footer', value.footer ?? []],
    ] as const
  ).flatMap(([region, panels]) => panels.map((panel) => ({ region, panel })))
}

export function LayoutView<D extends LayoutDescription>(
  props: GeneratorMessageProps & {
    description: D
    bindings: LayoutViewBindings<D>
    style?: DashboardShellProps['style']
  },
) {
  const messages = resolveGeneratorMessages(() => props.messages)
  const identity = untrack(() => props.description.id)
  const domId = `generated-layout-${createUniqueId()}`
  let regions = new Map<string, string>()
  const description = createMemo(() => {
    const value = props.description
    requireValue(
      value.id === identity,
      'remount the layout view to replace its identity',
    )
    uniqueIds([value.id], 'layout')
    uniqueIds(
      panelEntries(value).map(({ panel }) => panel.id),
      'panel',
    )
    requireValue(
      value.columns === undefined || value.columns === 1 || value.columns === 2,
      'unsupported layout column count',
    )
    requireValue(
      value.scroll === undefined ||
        value.scroll === 'main' ||
        value.scroll === 'content',
      'unsupported layout scroll mode',
    )
    validateActions(
      value.actions ?? [],
      (props.bindings as { actions?: Actions }).actions,
    )
    for (const { panel } of panelEntries(value))
      requireValue(
        Object.hasOwn(props.bindings.views, panel.view) &&
          typeof props.bindings.views[
            panel.view as keyof typeof props.bindings.views
          ] === 'function',
        `missing view binding "${panel.view}"`,
      )
    const nextRegions = new Map(
      panelEntries(value).map(({ region, panel }) => [panel.id, region]),
    )
    for (const [id, region] of nextRegions)
      requireValue(
        !regions.has(id) || regions.get(id) === region,
        `use a new identity to move panel "${id}" between regions`,
      )
    regions = nextRegions
    return value
  })
  preserveReorderFocus(domId, () =>
    panelEntries(description()).map(({ panel }) => panel.id),
  )
  function PanelView(panelProps: { panel: PanelDescription; main?: boolean }) {
    const view = untrack(() => panelProps.panel.view)
    const View = untrack(
      () => props.bindings.views[view as keyof typeof props.bindings.views],
    )
    const checked = createMemo(() => {
      requireValue(
        panelProps.panel.view === view &&
          props.bindings.views[view as keyof typeof props.bindings.views] ===
            View,
        `remount panel "${panelProps.panel.id}" to replace its view`,
      )
      return panelProps.panel
    })
    const content = () => (
      <>
        <Show when={checked().title}>
          <h2 data-ui-text="system">{checked().title}</h2>
        </Show>
        <View />
      </>
    )
    return (
      <Show
        when={panelProps.main}
        fallback={
          <div
            class="ui-dashboard-region-panel"
            data-generator-panel={checked().id}
          >
            {content()}
          </div>
        }
      >
        <DashboardPanel
          data-generator-panel={checked().id}
          fill={checked().fill}
          style={{ contain: checked().fill ? 'size' : undefined }}
        >
          {content()}
        </DashboardPanel>
      </Show>
    )
  }

  const fillsMain = createMemo(() =>
    description().panels.some((panel) => panel.fill),
  )
  const hasNavigation = createMemo(() =>
    Boolean(description().navigation?.length),
  )
  const navigation = () => (
    <For each={description().navigation} keyed={(panel) => panel.id}>
      {(panel) => <PanelView panel={panel()} />}
    </For>
  )
  const hasContext = createMemo(() => Boolean(description().context?.length))
  const hasFooter = createMemo(() => description().footer !== undefined)
  const context = () => (
    <For each={description().context} keyed={(panel) => panel.id}>
      {(panel) => <PanelView panel={panel()} />}
    </For>
  )
  function Footer() {
    return (
      <For each={description().footer} keyed={(panel) => panel.id}>
        {(panel) => <PanelView panel={panel()} />}
      </For>
    )
  }
  return (
    <DashboardShell
      id={domId}
      style={props.style}
      navigationLabel={
        description().navigationLabel ?? messages.navigationLabel
      }
      toggleLabel={messages.toggleLabel}
      closeLabel={messages.closeLabel}
      contextLabel={description().contextLabel ?? messages.contextLabel}
      contextToggleLabel={messages.contextToggleLabel}
      contextCloseLabel={messages.contextCloseLabel}
      footerLabel={description().footerLabel}
      context={hasContext() ? context : undefined}
      footer={hasFooter() ? <Footer /> : undefined}
      scroll={description().scroll}
      header={
        <>
          <span data-ui-text="system">{description().title}</span>
          <div class="ui-dashboard-header-actions">
            <ActionsView
              descriptions={description().actions ?? []}
              bindings={(props.bindings as { actions?: Actions }).actions}
            />
          </div>
        </>
      }
      navigation={hasNavigation() ? navigation : undefined}
    >
      <DashboardGrid
        style={{
          flex: fillsMain() ? 1 : undefined,
          'min-height': fillsMain() ? 0 : undefined,
          '--ui-panel-min-width':
            description().columns === 1
              ? '100%'
              : description().columns === 2
                ? 'max(18rem, calc(50% - var(--ui-gap, 6px) / 2))'
                : undefined,
        }}
      >
        <For each={description().panels} keyed={(panel) => panel.id}>
          {(panel) => <PanelView panel={panel()} main />}
        </For>
      </DashboardGrid>
    </DashboardShell>
  )
}
