# Charts

The owned chart API supports SVG line, area, bar, and scatter charts.
It uses source captured from TanStack Charts 1.1.0, with one scene engine and one SVG renderer.
The Solid adapter owns the host, lifecycle, and custom tooltip content.
The engine owns measurement, keyboard and pointer interaction, and the SVG subtree.

Import chart code through `@wfe/components/chart`.
Import generated views through `@wfe/generator/chart`.
Normal component and generator imports do not load the chart engine.
Import `@wfe/components/styles.css` once in the application.

```tsx
import { createMemo } from 'solid-js'
import {
  Chart,
  defineChart,
  lineY,
  scaleLinear,
  tooltip,
  tooltipPortal,
} from '@wfe/components/chart'
import '@wfe/components/styles.css'

type Record = { id: string; day: number; count: number | null }

export function Requests(props: { rows: readonly Record[] }) {
  const definition = createMemo(() =>
    defineChart({
      marks: [
        lineY(props.rows, {
          id: 'requests',
          key: (row) => row.id,
          x: (row) => row.day,
          y: (row) => row.count,
        }),
      ],
      scales: {
        x: { scale: scaleLinear },
        y: { scale: scaleLinear },
      },
      tooltip: { use: tooltip, portal: tooltipPortal },
    }),
  )
  return (
    <Chart definition={definition()} ariaLabel="Requests by day" height={280} />
  )
}
```

A chart fills its container width unless the application supplies `width`.
Supply `height` or a finite positive `aspectRatio` for responsive height.
Without either value, the host uses a height of 320 pixels.
Updates preserve the SVG and matching mark nodes.
Stable mark IDs and record keys preserve identity across accepted data changes.
Supply the same initial records and dimensions for server rendering and hydration.
The engine measures the visible host after hydration.

## Data and interaction

Applications own queries, sorting, aggregation, paging, caching, permissions, and persistence.
The chart receives records that the application already prepares for display.
It does not request records or reduce a large query to a summary.
SVG charts do not virtualize data.
Applications must limit or aggregate large results before passing them to a chart.

Mark accessors read the original records.
Callbacks receive the original record through `point.datum`.
Display formatters do not replace those records or values.
Use immutable record arrays and definitions when replacing accepted state.
Null or undefined channel values represent missing points.
Use numbers for numeric scales and valid `Date` objects for date scales.
`scaleUtc` uses UTC and `scaleTime` uses the host timezone.
For deterministic server output, use UTC and pass explicit locale and timezone choices to date formatters.

Give each chart an accessible label.
The SVG receives keyboard focus and supports arrow navigation between points.
Enter selects a point and pins its tooltip. Escape dismisses the tooltip.
Applications supply `onSelect` and `onFocusChange` when they need those events.
Applications own empty, loading, and failure messages around the chart.

The owned `ChartLegend` uses the shared Button component.
Applications supply item IDs, labels, colors, visible state, and the visibility callback.
The callback requests a change. The application accepts it and changes the chart definition.
A rejected request leaves the legend unchanged.
Optional line styles distinguish series without a second accent color.

## Appearance and tooltips

Charts use the shared `--ui-focus-width` property, with a 1px default.
Custom widths also apply in forced-color mode, which retains the system highlight color.

The default theme reads shared text, divider, surface, and accent tokens.
An authored definition theme takes precedence over these defaults.
Multiple series use the same accent until the application supplies another theme or mark appearance.
Use line styles, opacity, or explicit labels to distinguish series within that accent.
The gallery uses Surface 1 components, a Surface 2 background, Blue accent, outline buttons, and no shadows.

Use the owned `tooltipPortal` with the `tooltip` extension.
It keeps fallback content within the current UI scope and respects native popup hosts.
Native popovers retain their inherited theme.
An explicit `mount` overrides the fallback parent. The application must give that mount the intended UI scope and tokens.
The shared tooltip uses square corners and the same typography, spacing, borders, and shadow roles as other components.
Forced colors use system colors.

`renderTooltipBody` receives reactive context properties and `defaultBody`.
Read those properties in JSX to follow the current point and pinned state.
The adapter creates one custom content owner per tooltip element and renderer function.
Point changes retain that owner and its controls.
Replacing the renderer or disposing the chart releases the old owner.
Use `context.dismiss()` for an explicit close action.

## Generated views

`ChartDescription` is serializable metadata.
`ChartViewBindings` supplies records, formatter functions, optional theme, status, and callbacks.
The generated view uses the same Chart component and engine.

```tsx
import { ChartView } from '@wfe/generator/chart'
import type { ChartDescription } from '@wfe/generator/chart'

type Record = { id: string; category: string; amount: number }
const description = {
  id: 'amounts',
  title: 'AMOUNTS',
  ariaLabel: 'Amounts by category',
  kind: 'bar',
  key: 'id',
  x: { field: 'category', scale: 'band', label: 'CATEGORY' },
  y: { field: 'amount', label: 'AMOUNT', formatter: 'count' },
  height: 280,
} satisfies ChartDescription<Record>

export function Amounts(props: { rows: readonly Record[] }) {
  return (
    <ChartView
      description={description}
      bindings={{
        rows: () => props.rows,
        formatters: { count: (value) => String(value) },
      }}
    />
  )
}
```

The initial description supports one mark, a numeric y axis, and a linear, band, point, or UTC x axis.
Bar descriptions require a band x scale.
Use the full component API for multiple marks, horizontal bars, or host-local time scales.
Formatter IDs resolve only through own properties in the supplied formatter map.
The view rejects unknown metadata properties, unsupported kinds or scales, invalid dimensions, invalid values, and duplicate record keys.
A requested field must exist on at least one record when records are present.
Sparse records can omit other values, and normal property access supports class getters.
Empty records cannot prove field names. The application owns its schema and wire-data parsing.
The view identity stays fixed for its lifetime. Remount the view when its ID changes.
Status changes retain the chart and its SVG.

## Supported scope and maintenance

The initial API excludes Canvas, animation, geographic plots, network plots, pie charts, zoom controls, and a dashboard query layer.
Captured internal code does not make every upstream feature a supported public API.
The upstream native interactive legend is private. Use the owned controlled legend.

The [vendor record](../packages/components/src/vendor/charts/README.md) identifies the source capture and local repairs.
D3 scale and shape remain external mathematical dependencies.
Solid and Solid Primitives remain external dependencies.
The library does not depend on a TanStack chart package at runtime.

Before replacing captured source, compare the pinned upstream revision and the selected import graph.
Preserve the exact license and original hashes.
Record each local repair and its resulting hash in `provenance.json`.
Run `pnpm test:integrity`, `pnpm check`, and the chart browser matrix before accepting an update.
See the [chart example](../examples/charts/README.md) for the preview and test commands.
