import { For, Show, createMemo, createUniqueId, untrack } from 'solid-js'
import {
  DashboardShell,
  DashboardGrid,
  DashboardPanel,
} from '@wfe/components/layout'
import type {
  LayoutDescription,
  LayoutViewBindings,
  PanelDescription,
} from './types'
import { ActionsView, requireValue, uniqueIds, validateActions } from './shared'
import type { Actions } from './shared'

export function LayoutView<D extends LayoutDescription>(props: {
  description: D
  bindings: LayoutViewBindings<D>
}) {
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
      [...value.panels, ...(value.navigation ?? [])].map((panel) => panel.id),
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
    for (const panel of [...value.panels, ...(value.navigation ?? [])])
      requireValue(
        Object.hasOwn(props.bindings.views, panel.view) &&
          typeof props.bindings.views[
            panel.view as keyof typeof props.bindings.views
          ] === 'function',
        `missing view binding "${panel.view}"`,
      )
    const nextRegions = new Map([
      ...value.panels.map((panel) => [panel.id, 'main'] as const),
      ...(value.navigation ?? []).map(
        (panel) => [panel.id, 'navigation'] as const,
      ),
    ])
    for (const [id, region] of nextRegions)
      requireValue(
        !regions.has(id) || regions.get(id) === region,
        `use a new identity to move panel "${id}" between regions`,
      )
    regions = nextRegions
    return value
  })
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
    return (
      <DashboardPanel
        data-generator-panel={checked().id}
        fill={checked().fill}
        style={{
          contain: panelProps.main && checked().fill ? 'size' : undefined,
        }}
      >
        <Show when={checked().title}>
          <h2 data-ui-text="system">{checked().title}</h2>
        </Show>
        <View />
      </DashboardPanel>
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
  return (
    <DashboardShell
      id={domId}
      navigationLabel={description().navigationLabel}
      scroll={description().scroll}
      header={
        <>
          <span data-ui-text="system">{description().title}</span>
          <ActionsView
            descriptions={description().actions ?? []}
            bindings={(props.bindings as { actions?: Actions }).actions}
          />
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
