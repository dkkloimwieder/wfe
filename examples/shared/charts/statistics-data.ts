export type Sample = Readonly<{ id: string; group: string; value: number }>
export type Distribution = Readonly<{
  id: string
  position: number
  source: readonly Sample[]
  excluded: number
  q1: number
  median: number
  q3: number
  low: number
  high: number
  minimum: number
  maximum: number
  mean: number
  outliers: readonly Sample[]
}>
export type DistributionPoint = Readonly<{
  id: string
  group: string
  x: number
  y: number
  source: readonly Sample[]
}>

/** Linear interpolation at (n - 1) p; never mutates the input. */
export function quantile(values: readonly number[], p: number): number | null {
  if (!Number.isFinite(p) || p < 0 || p > 1)
    throw new RangeError('Quantile fraction must be between zero and one')
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (!sorted.length) return null
  const index = (sorted.length - 1) * p
  const a = sorted[Math.floor(index)]!
  const b = sorted[Math.ceil(index)]!
  return a * (1 - (index % 1)) + b * (index % 1)
}

/** Example policy: omit nonfinite measurements, report exclusions, retain rows. */
export function summarizeSamples(
  rows: readonly Sample[],
): readonly Distribution[] {
  const groups = [...new Set(rows.map((row) => row.group))]
  return groups.flatMap((id, position) => {
    const all = rows.filter((row) => row.group === id)
    const source = all.filter((row) => Number.isFinite(row.value))
    if (!source.length) return []
    const values = source.map((row) => row.value)
    const q1 = quantile(values, 0.25)!
    const median = quantile(values, 0.5)!
    const q3 = quantile(values, 0.75)!
    const iqr = q3 - q1
    const inside = source.filter(
      (row) => row.value >= q1 - 1.5 * iqr && row.value <= q3 + 1.5 * iqr,
    )
    const minimum = Math.min(...values)
    const maximum = Math.max(...values)
    return [
      {
        id,
        position,
        source,
        excluded: all.length - source.length,
        q1,
        median,
        q3,
        low: Math.min(...inside.map((row) => row.value)),
        high: Math.max(...inside.map((row) => row.value)),
        minimum,
        maximum,
        mean: values.reduce((sum, value) => sum + value / values.length, 0),
        outliers: source.filter((row) => !inside.includes(row)),
      },
    ]
  })
}

/** Explicit vertical jumps and horizontal runs: P(X <= x), ties pooled. */
export function empiricalCdf(
  summary: Distribution,
): readonly DistributionPoint[] {
  const values = [...new Set(summary.source.map((row) => row.value))].sort(
    (a, b) => a - b,
  )
  let count = 0
  return values.flatMap((x, index) => {
    const before = count / summary.source.length
    count += summary.source.filter((row) => row.value === x).length
    const source = summary.source.filter((row) => row.value <= x)
    return [
      {
        id: `${summary.id}:${index}:before`,
        group: summary.id,
        x,
        y: before,
        source,
      },
      {
        id: `${summary.id}:${index}:after`,
        group: summary.id,
        x,
        y: count / summary.source.length,
        source,
      },
    ]
  })
}

/** Equal-width empirical density. Final bin includes the maximum. */
export function histogramDensity(summary: Distribution, bins = 8) {
  if (!Number.isInteger(bins) || bins < 1 || bins > 100)
    throw new RangeError('Bin count must be an integer from one to 100')
  const start =
    summary.minimum === summary.maximum
      ? summary.minimum - 0.5
      : summary.minimum
  const end =
    summary.minimum === summary.maximum
      ? summary.maximum + 0.5
      : summary.maximum
  const width = (end - start) / bins
  return Array.from({ length: bins }, (_, index) => {
    const x1 = start + index * width
    const x2 = start + (index + 1) * width
    const source = summary.source.filter((row) => {
      const bin = Math.min(bins - 1, Math.floor((row.value - start) / width))
      return bin === index
    })
    return {
      id: `${summary.id}:${index}`,
      group: summary.id,
      x1,
      x2,
      density: source.length / (summary.source.length * width),
      source,
    }
  })
}

export function createSamples(revision = 0): readonly Sample[] {
  return ['API', 'Workers', 'Storage'].flatMap((group, series) =>
    [12, 16, 19, 19, 22, 25, 28, 31, 34, 38, 40, 95].map((value, index) => ({
      id: `${group}:${index}`,
      group,
      value: value + series * 12 + revision * (series + 1),
    })),
  )
}
