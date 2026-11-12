export const serviceNames = ['API', 'Workers', 'Storage'] as const
export type Service = (typeof serviceNames)[number]
export type TimeWindow = '24h' | '7d' | '30d'
export const hour = 3_600_000
export const exampleEnd = Date.UTC(2026, 10, 6)
export const windows = {
  '24h': { hours: 24, bucketHours: 1, label: 'Hourly' },
  '7d': { hours: 168, bucketHours: 6, label: 'Six-hour' },
  '30d': { hours: 720, bucketHours: 24, label: 'Daily' },
} as const
export type HourlyRecord = Readonly<{
  id: string
  timestamp: number
  service: Service
  requests: number
  errors: number
  samples: readonly number[]
}>
export type IntervalSummary = Readonly<{
  requests: number
  errors: number
  p50: number | null
  p95: number | null
}>
export type TimeBucket = Readonly<{
  id: string
  start: Date
  end: Date
  time: Date
  source: readonly HourlyRecord[]
  total: IntervalSummary | null
  services: readonly (IntervalSummary & { service: Service })[]
  change: number | null
  previous: number | null
}>
export type TimePoint = Readonly<{
  id: string
  bucketId: string
  service: Service | 'Total'
  start: Date
  end: Date
  time: Date
  requests: number | null
  p50: number | null
  p95: number | null
  fraction: number | null
  indexed: number | null
  y1: number | null
  y2: number | null
  intensity: number
  source: readonly HourlyRecord[]
}>

export function createHourlyRecords(revision = 0): readonly HourlyRecord[] {
  return Array.from({ length: 720 }, (_, index) => {
    const timestamp = exampleEnd - (720 - index) * hour
    const time = new Date(timestamp)
    const business = time.getUTCHours() >= 8 && time.getUTCHours() < 20
    const incident = index >= 620 && index < 633
    return serviceNames.map((service, series) => {
      const wave = Math.sin(index / 11 + series) * 45
      const requests = Math.max(
        1,
        Math.round(
          (business ? 300 : 130) * (1 - series * 0.24) +
            wave +
            (index % 23) * 3 +
            revision * (series + 1) * 7,
        ),
      )
      const errors = Math.round(
        requests * (incident ? 0.08 : 0.004 + series * 0.002),
      )
      return {
        id: `${timestamp}:${service}`,
        timestamp,
        service,
        requests,
        errors,
        samples: Array.from({ length: 8 }, (_, sample) =>
          Math.round(
            35 +
              series * 18 +
              sample * sample * 2 +
              Math.abs(wave) +
              (incident ? 150 : 0),
          ),
        ),
      }
    })
  }).flat()
}

export function percentile(
  values: readonly number[],
  fraction: number,
): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = (sorted.length - 1) * fraction
  const lower = Math.floor(index)
  const a = sorted[lower]!
  return a + (sorted[Math.ceil(index)]! - a) * (index - lower)
}

function summarize(rows: readonly HourlyRecord[]): IntervalSummary {
  const samples = rows.flatMap((row) => row.samples)
  return {
    requests: rows.reduce((sum, row) => sum + row.requests, 0),
    errors: rows.reduce((sum, row) => sum + row.errors, 0),
    p50: percentile(samples, 0.5),
    p95: percentile(samples, 0.95),
  }
}

/** Application-owned UTC buckets. An absent interval stays unknown, not zero. */
export function prepareTimeSeries(
  rows: readonly HourlyRecord[],
  window: TimeWindow,
  visible: readonly Service[] = serviceNames,
  missing = false,
): {
  buckets: readonly TimeBucket[]
  points: readonly TimePoint[]
  totals: readonly TimePoint[]
} {
  const config = windows[window]
  const duration = config.bucketHours * hour
  const start = exampleEnd - config.hours * hour
  const count = config.hours / config.bucketHours
  const grouped = new Map<number, HourlyRecord[]>()
  for (const row of rows) {
    if (
      row.timestamp < start ||
      row.timestamp >= exampleEnd ||
      !visible.includes(row.service)
    )
      continue
    const index = Math.floor((row.timestamp - start) / duration)
    if (missing && index === Math.floor(count / 2)) continue
    const group = grouped.get(index) ?? []
    group.push(row)
    grouped.set(index, group)
  }
  let previous: number | null = null
  const buckets: TimeBucket[] = Array.from({ length: count }, (_, index) => {
    const source = grouped.get(index) ?? []
    const total = source.length ? summarize(source) : null
    const services = visible.flatMap((service) => {
      const records = source.filter((row) => row.service === service)
      return records.length ? [{ service, ...summarize(records) }] : []
    })
    const intervalStart = new Date(start + index * duration)
    const intervalEnd = new Date(start + (index + 1) * duration)
    const bucket = {
      id: `${intervalStart.toISOString()}/${intervalEnd.toISOString()}`,
      start: intervalStart,
      end: intervalEnd,
      time: new Date(start + (index + 0.5) * duration),
      source,
      total,
      services,
      previous,
      change: total && previous !== null ? total.requests - previous : null,
    }
    previous = total?.requests ?? null
    return bucket
  })
  const baselines = new Map(
    visible.map((service) => [
      service,
      buckets
        .flatMap((bucket) => bucket.services)
        .find((row) => row.service === service)?.requests,
    ]),
  )
  const maximum = Math.max(
    1,
    ...buckets.flatMap((bucket) => bucket.services.map((row) => row.requests)),
  )
  const point = (
    bucket: TimeBucket,
    service: Service | 'Total',
    summary: IntervalSummary | null,
  ): TimePoint => ({
    id: `${bucket.id}:${service}`,
    bucketId: bucket.id,
    service,
    start: bucket.start,
    end: bucket.end,
    time: bucket.time,
    requests: summary?.requests ?? null,
    p50: summary?.p50 ?? null,
    p95: summary?.p95 ?? null,
    fraction:
      summary && bucket.total
        ? bucket.total.requests
          ? summary.requests / bucket.total.requests
          : 0
        : null,
    indexed:
      service !== 'Total' && summary && baselines.get(service)
        ? (summary.requests / baselines.get(service)!) * 100
        : null,
    y1: null,
    y2: null,
    intensity: summary
      ? Math.min(3, Math.floor((summary.requests / maximum) * 4))
      : 0,
    source: bucket.source.filter(
      (row) => service === 'Total' || row.service === service,
    ),
  })
  return {
    buckets,
    points: buckets.flatMap((bucket) => {
      let running = 0
      return visible.map((service) => {
        const summary =
          bucket.services.find((row) => row.service === service) ?? null
        const row = point(bucket, service, summary)
        const y1 = summary ? running : null
        running += summary?.requests ?? 0
        return { ...row, y1, y2: summary ? running : null }
      })
    }),
    totals: buckets.map((bucket) => point(bucket, 'Total', bucket.total)),
  }
}
