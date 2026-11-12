# Charts

The owned chart API supports SVG line, area, bar, scatter, interval, heatmap, and polar charts.
It uses source captured from TanStack Charts 1.4.0, with one scene engine and one SVG renderer.
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

## Grammar and derived data

A mark is a geometric layer, such as a line.
A channel maps a record field to a visual position or appearance.
A transform prepares records before rendering.
Each mark can receive a different record array.
Declaration order determines the layer order.

| Purpose                              | Public helpers                                                                                                        |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Interval and categorical rectangles  | `rect`, `cell`                                                                                                        |
| Reference lines and labels           | `ruleX`, `ruleY`, `text`                                                                                              |
| Visual layers without input targets  | `decorative`                                                                                                          |
| Grouping and numeric bins            | `groupBy`, `binX`, `binY`                                                                                             |
| Stacked endpoints                    | `stackRowsX`, `stackRowsY`                                                                                            |
| Derived values and selected records  | `rollingWindow`, `normalize`, `select`                                                                                |
| Polar container and slice allocation | `polar`, `pie`                                                                                                        |
| Polar marks                          | `radialArc`, `radialLine`, `radialArea`, `radialDot`, `radialText`, `radialRule`, `radialBarRadius`, `radialBarAngle` |
| Polar guides                         | `radialGrid`, `angleGrid`                                                                                             |

Wrap Cartesian annotations with `decorative` when they must not add keyboard or pointer targets.
The wrapper preserves the painted geometry and scale contributions.
Rule marks do not add data targets.
Use guide builders for polar labels that do not need targets.

Source lineage links a derived row to its input records.
Derived rows expose `source` and `sourceIndexes` for the immediate input of that transform.
Composed transforms can contain nested lineage.
Applications resolve those records to their own domain.
`select` returns the chosen input records with their original identity.

Grouping and rolling windows accept named count, sum, mean, minimum, and maximum reductions, or explicit reducer callbacks.
Transform outputs cannot replace reserved lineage fields.
Numeric bins omit missing values and include the final upper endpoint.
Applications choose thresholds, windows, grouping fields, and normalization rules.
Helpers do not fetch records or choose business summaries.

`pie` allocates nonnegative values into angle intervals, with source references and fractions.
Angles use radians.
Pass those rows to `radialArc` inside `polar`.
Set `innerRadius` for a donut.
`curveLinearClosed` closes radar paths.
Use explicit color domains when record order changes to keep series colors stable.

The gallery routes `?gallery=chart-layers`, `?gallery=chart-data`, and `?gallery=chart-polar` demonstrate these helpers.
The [shared recipe](../examples/shared/charts/Grammar.tsx) also runs in the chart rendering and hydration example.
It includes controlled rejection, source inspection, retained notes, alternate orientations, and accessible source tables.

The released `pointerEvent` option can request `pointerrawupdate` for chart focus.
It falls back to normal pointer events when the browser does not support raw updates.
The default remains `pointermove`.

## Operational time-series recipes

The gallery route `?gallery=chart-time-series` provides ten practical views from the same operational records.
The [shared example](../examples/shared/charts/TimeSeries.tsx) also runs in the chart rendering and hydration suite.

| View                     | Use                                                                      |
| ------------------------ | ------------------------------------------------------------------------ |
| Stacked columns          | Compare interval totals and their service breakdown.                     |
| 100% stacked columns     | Compare each service's share over time.                                  |
| Grouped columns          | Compare services from a common baseline.                                 |
| Stacked area             | Follow volume and composition across ordered intervals.                  |
| Multi-series lines       | Compare independent trends, with explicit gaps for missing observations. |
| Columns and total line   | Compare the service breakdown and total on the same request axis.        |
| Latency percentile band  | Inspect P50 and P95 latency from pooled samples.                         |
| Service/time heatmap     | Compare many service intervals in a compact matrix.                      |
| Request-change waterfall | Inspect changes between consecutive interval totals.                     |
| Indexed service trends   | Compare relative changes from each service's initial value of 100.       |

The example contains 30 days of simulated hourly records for three services.
The 24-hour, seven-day, and 30-day windows use one-hour, six-hour, and daily intervals respectively.
Each window displays at most 30 intervals.
Dates and bucket boundaries use UTC, including the November daylight-saving transition.
Request counts and errors add across source records.
Latency percentiles use pooled samples, rather than averages of hourly percentiles.
An absent interval stays unknown and leaves a gap.

Hover reveals a comparison for the interval.
Click a mark or press Enter to pin its details.
Pinned details include all visible services, counts, shares, errors, latency, and change from the previous interval.
The annotation and refresh controls retain their state during an accepted data refresh inside the popup.
The source action exposes original hourly records.
Escape, Close, and an outside click dismiss the pinned popup.
The interval table provides exact values without pointer interaction.

## Other chart families

The public marks also compose horizontal rankings, bubble scatterplots, lollipops, dumbbell comparisons, error bars, candlesticks, and aligned small multiples.
These compositions do not imply that WFE supplies a named preset for each family.
The gallery now supplies candlestick, OHLC, dumbbell, slope, bubble, and aligned regional comparison recipes at `?gallery=chart-financial`.
Each recipe uses shared marks and preserves its application source records.

Statistical recipes at `?gallery=chart-statistics` include box summaries, empirical cumulative distributions, histogram density, and observed ranges with means.
The [statistical assessment](chart-statistics.md) separates these compositions from released upstream APIs that WFE does not capture.

The navigation recipe at `?gallery=chart-focus-context` links a monthly overview with a selected detail interval.
Date fields, zoom buttons, and pan buttons request changes from the application.
Two point selections define a range with either a pointer or the keyboard.
A selected day adds a linked marker and reports its original hourly records.
The example keeps at most 30 daily points per chart.
This recipe uses existing marks and callbacks, without a second renderer or native drag-to-brush API.

The generator recipe at `?gallery=chart-descriptions` demonstrates ordered Cartesian layers and pie or donut descriptions.
Existing single-mark descriptions remain supported.
Applications supply records, formatting callbacks, and accepted updates.

The [upstream selection guide](https://tanstack.com/charts/latest/docs/guides/choosing-a-chart) explains the comparison tasks behind these chart choices.
Compare the exact release APIs before adopting a recipe from the moving documentation.

## Appearance and tooltips

Charts use the shared `--ui-focus-width` property, with a 1px default.
Custom widths also apply in forced-color mode, which retains the system highlight color.

The default chart theme reads shared text, divider, surface, and accent CSS properties.
Its palette contains one color, `var(--ui-accent)`.
In the gallery, use the appearance controls to change the accent, color scheme, or theme.
These controls change charts that use the shared properties.
The default gallery appearance uses Surface 1 components, a Surface 2 background, Blue accent, outline buttons, and no shadows.

For separate series colors, set `color.domain` and `color.range` in the chart definition.
The domain lists series keys. The range lists their colors in the same order.
For example, pair `domain: ['API', 'Workers']` with `range: ['var(--ui-accent)', 'var(--ui-text)']`.
Set the mark's `z` or `color` channel to the record field that contains those keys.
The statistical example assigns API the accent, Workers the text color, and Storage a mixture of the accent and surface colors.

To replace the default series palette for one chart, set `theme.palette` in its definition.
For example, `theme: { palette: ['#2563eb', '#b45309'] }` supplies two colors.
An explicit `color.range` takes precedence over that palette, and explicit mark fills or strokes can override the series color.
Keep line styles, opacity, or labels so that readers can distinguish series without color alone.

Use the owned `tooltipPortal` with the `tooltip` extension.
It keeps fallback content within the current UI scope and respects native popup hosts.
Native popovers retain their inherited theme.
An explicit `mount` overrides the fallback parent. The application must give that mount the intended UI scope and tokens.
The shared tooltip uses square corners and the same typography, spacing, borders, and shadow roles as other components.
Forced colors use system colors.
Custom and default content share one opaque surface.
Tooltips fit beside, above, or below the selected marks and scroll when their content exceeds the available space.
For paths that span several observations, placement protects the selected observations.
If no free region exists, the tooltip stays hidden until space becomes available.
Use `--ui-chart-tooltip-padding`, `--ui-chart-tooltip-gap`, and `--ts-chart-tooltip-max-width` to adjust compact spacing and width.

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

### Release assessment: November 5, 2026

The [published release](https://github.com/TanStack/charts/releases/tag/v1.4.0) and npm registry identify version 1.4.0.
The overview documentation follows unreleased main and reports an older published version.
This assessment uses the exact release source at `cee368233c84395eda8c80d87eb91d6e574baa2d`.

Five of the original 74 captured source files changed between releases 1.1.0 and 1.4.0.
They cover scene filtering, renderer pointer handling, tooltip labels, portal overflow, and public types.
The grammar expansion adds 23 source files for annotations, interval marks, polar composition, and explicit data transforms.
The capture keeps every existing strict-type, runtime-theme, and scoped-portal repair.
It also records strict-type repairs for bounded polar and transform indices.

The published Solid adapter requires Solid `^1.8`.
The [compatibility correction](https://github.com/TanStack/charts/releases/tag/v1.2.1) explicitly excludes Solid 2.
WFE therefore keeps its own Solid 2 adapter and the selected framework-independent engine source.
A direct core dependency remains possible, but requires moving the runtime-theme and scoped-portal integration repairs out of the capture.
The capture keeps that behavior stable and makes the repair burden explicit.

D3 Array 3.2.4 becomes a direct dependency for the released binning helper.
The same version already exists through D3 Scale.
D3 Shape declarations become a production dependency because the public curve export needs their types.
Existing D3 Scale, D3 Shape, Solid, TypeScript, compiler, and test-tool pins remain unchanged.
The [capture script](../scripts/capture-charts.mjs) reproduces the selected source and documented repairs from the pinned release.

The supported API excludes Canvas, animation, geographic plots, network plots, native zoom gestures, and a dashboard query layer.
Captured internal code does not make every upstream feature a supported public API.
The upstream native interactive legend is private. Use the owned controlled legend.

The [vendor record](../packages/components/src/vendor/charts/README.md) identifies the source capture and local repairs.
D3 scale, shape, and array remain external mathematical dependencies.
Solid and Solid Primitives remain external dependencies.
The library does not depend on a TanStack chart package at runtime.

Before replacing captured source, compare the pinned upstream revision and the selected import graph.
Preserve the exact license and original hashes.
Record each local repair and its resulting hash in `provenance.json`.
Run `pnpm test:integrity`, `pnpm check`, and the chart browser matrix before accepting an update.
See the [chart example](../examples/charts/README.md) for the preview and test commands.
