# Chart components

Charts render application data through shared plot components. The statistical recipes combine public chart parts to show summaries and distributions.

Contents

- [Charts](#charts)
- [Statistical chart recipes](#statistical-chart-recipes)

## Charts

Chart renders responsive SVG plots with shared interaction and theme styles.

### Import

Import `Chart` and mark builders from `@wfe/components/chart`. Import `ChartView` from `@wfe/generator/chart`.

### Example

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

### Behavior and options

A chart fills its container width unless the application supplies `width`.
Supply `height` or a finite positive `aspectRatio` for responsive height.
Without either value, the host uses a height of 320 pixels.
Updates preserve the SVG and matching mark nodes.
Stable mark IDs and record keys preserve identity across accepted data changes.
Supply the same initial records and dimensions for server rendering and hydration.
The engine measures the visible host after hydration.

#### Data and interaction

SVG charts render the supplied data. Limit or aggregate large results in the application.

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

#### Grammar and derived data

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

The `pointerEvent` option can request `pointerrawupdate` for chart focus.
It falls back to normal pointer events when the browser does not support raw updates.
The default remains `pointermove`.

#### Appearance and tooltips

Charts use the shared `--ui-focus-width` property, with a 1px default.
Custom widths also apply in forced-color mode, which retains the system highlight color.

The default chart theme reads shared text, divider, surface, and primary CSS properties.
Its palette contains one color, `var(--ui-primary)`.
In the gallery, use the appearance controls to change the primary color, color scheme, or theme.
These controls change charts that use the shared properties.

For separate series colors, set `color.domain` and `color.range` in the chart definition.
The domain lists series keys. The range lists their colors in the same order.
For example, pair `domain: ['API', 'Workers']` with `range: ['var(--ui-primary)', 'var(--ui-text)']`.
Set the mark's `z` or `color` channel to the record field that contains those keys.
The statistical example assigns API the primary color and Workers the text color. Storage uses a mix of the primary and surface colors.

To replace the default series palette for one chart, set `theme.palette` in its definition.
For example, `theme: { palette: ['#2563eb', '#b45309'] }` supplies two colors.
An explicit `color.range` takes precedence over that palette, and explicit mark fills or strokes can override the series color.
Keep line styles, opacity, or labels so that readers can distinguish series without color alone.

Use the owned `tooltipPortal` with the `tooltip` extension.
It keeps fallback content within the current UI scope and respects native popup hosts.
Native popovers retain their inherited theme.
An explicit `mount` overrides the fallback parent. The application must give that mount the intended UI scope and tokens.
The shared tooltip uses the theme popup radius, typography, spacing, border, and shadow roles.
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

#### Generated views

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

Descriptions support single line, area, bar, or scatter marks, ordered Cartesian layers, and pie or donut charts. Cartesian charts use a numeric y axis and a linear, band, point, or UTC x axis. Bars require a band x scale. Use the component API for horizontal bars or host-local time scales.
Formatter IDs resolve only through own properties in the supplied formatter map.
The view rejects unknown metadata properties, unsupported kinds or scales, invalid dimensions, invalid values, and duplicate record keys.
A requested field must exist on at least one record when records are present.
Sparse records can omit other values, and normal property access supports class getters.
Empty records cannot prove field names. The application owns its schema and wire-data parsing.
The view identity stays fixed for its lifetime. Remount the view when its ID changes.
Status changes retain the chart and its SVG.

The Solid adapter owns the host and custom tooltip content. The shared engine owns measurement, SVG, and keyboard and pointer interaction. D3 remains external. The [vendor record](../packages/components/src/vendor/charts/README.md) lists the capture, license, and repairs.

### Application ownership

Supply records, stable keys, labels, and callbacks. Choose aggregation, series colors, visibility, formatters, and empty or failure content. Own data requests and persistence.

### Gallery

Open `?gallery=chart-layers`, `?gallery=chart-data`, or `?gallery=chart-polar` for chart composition. Open `?gallery=chart-descriptions` for generated views. The gallery also shows `?gallery=chart-time-series`, `?gallery=chart-financial`, `?gallery=chart-focus-context`, and [statistical recipes](#statistical-chart-recipes).

## Statistical chart recipes

The statistical recipes draw box summaries, cumulative distributions, histograms, and observed ranges.

### Import

Import `Chart`, `defineChart`, and marks such as `lineY`, `dot`, and `rect` from `@wfe/components/chart`.

### Example

```jsx
import { Chart, defineChart, lineY, scaleLinear } from '@wfe/components/chart'

export function ObservedRange() {
  const definition = defineChart({
    marks: [
      lineY(
        [
          { x: 1, y: 3 },
          { x: 1, y: 9 },
        ],
        {
          id: 'range',
          x: (point) => point.x,
          y: (point) => point.y,
        },
      ),
    ],
    scales: { x: { scale: scaleLinear }, y: { scale: scaleLinear } },
  })
  return <Chart definition={definition} ariaLabel="Observed range" />
}
```

### Behavior and options

A quartile is a value that divides sorted observations into quarters.
The box policy uses linear interpolation at `(n - 1) * p` for Q1, median, and Q3.
The interquartile range is Q3 minus Q1.
Whiskers end at observed values within 1.5 times that range from the box.
Separate dots retain the original outlier records.

The empirical cumulative distribution function, or CDF, shows the fraction at or below a value.
Equal measurements contribute one jump with their combined count.
Explicit points encode the vertical jumps and horizontal runs without smoothing.
Each point retains references to contributing source rows.

Histogram density is probability divided by bin width.
The recipe uses eight equal bins per service.
Each service has total bar area one.
The final bin includes the maximum observation.
A constant population uses a one-unit interval centered on its value.

The range recipe shows the minimum, maximum, and arithmetic mean.
Its endpoints describe the observed samples.
They do not estimate uncertainty or population coverage.
Applications must choose and label any confidence interval separately.

Nonfinite measurements are excluded before calculation.
The summary reports the excluded count.
An empty population has no summary and displays the empty state.
A singleton or constant population retains equal quartiles and whiskers.
The numerical helpers do not change the source arrays.
Stable sample IDs survive refresh while new values replace the accepted data.

### Application ownership

Calculate summaries and retain original observations in application data. Choose interpolation, bin widths, and any confidence interval. Label the observed range separately from an estimate of uncertainty.

### Gallery

Open `?gallery=chart-statistics` for the four [recipe implementations](../examples/shared/charts/Statistics.tsx).
