# Statistical chart recipes

The statistical gallery uses the existing public chart marks.
The application calculates summaries and retains the original source records.
These recipes add no vendor files or dependencies.
They do not expose the separate upstream statistical APIs.

The source reference is TanStack Charts 1.4.0 at commit `cee368233c84395eda8c80d87eb91d6e574baa2d`.
The captured source identity is recorded in [the provenance manifest](../packages/components/src/vendor/charts/provenance.json).
The release [package exports](https://github.com/TanStack/charts/blob/cee368233c84395eda8c80d87eb91d6e574baa2d/packages/charts-core/package.json) establish the public upstream subpaths.
This assessment uses that commit, rather than documentation from the current default branch.

| Family                             | Exact release evidence                                                                                                                                                                                                                                                                                                                                     | WFE capture and recipe                                                                                                  |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Box plots                          | [`box.ts`](https://github.com/TanStack/charts/blob/cee368233c84395eda8c80d87eb91d6e574baa2d/packages/charts-core/src/box.ts) exports `boxRows`, `boxX`, and `boxY`. Blob `b28956d1c0c3847844775db0604a6ec91e9e2aa1`.                                                                                                                                       | Uncaptured. The box summary recipe uses `rect`, `lineY`, and `dot`.                                                     |
| Violin plots                       | [`violin.ts`](https://github.com/TanStack/charts/blob/cee368233c84395eda8c80d87eb91d6e574baa2d/packages/charts-core/src/violin.ts) exports `violinX` and `violinY`. Blob `55c27fb5c942d3fbb58f79644c6875f8ce1179e6`.                                                                                                                                       | Uncaptured. No violin API or kernel density estimator is added. The gallery includes histogram density.                 |
| Cumulative distribution            | [`transform-cumulative.ts`](https://github.com/TanStack/charts/blob/cee368233c84395eda8c80d87eb91d6e574baa2d/packages/charts-core/src/transform-cumulative.ts) exports `cumulative`.                                                                                                                                                                       | Uncaptured. The empirical CDF recipe prepares explicit steps for `lineY`.                                               |
| Error bars and interval composites | The release exports [`link`](https://github.com/TanStack/charts/blob/cee368233c84395eda8c80d87eb91d6e574baa2d/packages/charts-core/src/link.ts), [`tickX`, and `tickY`](https://github.com/TanStack/charts/blob/cee368233c84395eda8c80d87eb91d6e574baa2d/packages/charts-core/src/tick.ts). No dedicated error-bar export appears in that release package. | These subpaths are uncaptured. The observed-range recipe uses `lineY` and `dot`. It makes no confidence-interval claim. |

[Statistics.tsx](../examples/shared/charts/Statistics.tsx) contains the four recipes.
[statistics-data.ts](../examples/shared/charts/statistics-data.ts) contains the application policies.
The component uses the shared `Chart`, `Button`, `Checkbox`, `ToggleGroup`, and `Collapsible` controls.
The chart engine still owns SVG rendering, interaction, measurement, and cleanup.

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

[The numerical tests](../tests/unit/statistics-data.test.ts) cover interpolation, ties, exclusions, negatives, singleton and constant populations, probability conservation, and source identity.
[The browser review](../examples/shared/charts/statistics-review.mjs) covers every recipe, keyboard selection, refresh identity, empty recovery, and narrow containment.
[The dedicated gallery cases](../examples/components/gallery/statistics-cases.mjs) run across three presets and both color schemes.
Source and package delivery, server rendering, and hydration use the existing shared chart qualification routes.
These files define the expected checks. The parent task records the executed results.
