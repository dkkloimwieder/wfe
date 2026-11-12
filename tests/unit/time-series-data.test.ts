import { describe, expect, it } from 'vitest'
import {
  createHourlyRecords,
  exampleEnd,
  hour,
  percentile,
  prepareTimeSeries,
  serviceNames,
  windows,
} from '../../examples/shared/charts/time-series-data'
import type {
  HourlyRecord,
  TimeWindow,
} from '../../examples/shared/charts/time-series-data'

describe('operational time-series example data', () => {
  const rows = createHourlyRecords()
  it('keeps stable source IDs across accepted snapshots', () => {
    expect(rows).toHaveLength(720 * 3)
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length)
    expect(createHourlyRecords(1).map((row) => row.id)).toEqual(
      rows.map((row) => row.id),
    )
    expect(createHourlyRecords(1)[0]?.requests).not.toBe(rows[0]?.requests)
  })
  it('uses bounded UTC intervals across the November daylight-saving boundary', () => {
    for (const window of [
      '24h',
      '7d',
      '30d',
    ] as const satisfies readonly TimeWindow[]) {
      const result = prepareTimeSeries(rows, window)
      const config = windows[window]
      expect(result.buckets).toHaveLength(config.hours / config.bucketHours)
      expect(result.buckets[0]?.start.getTime()).toBe(
        exampleEnd - config.hours * hour,
      )
      expect(result.buckets.at(-1)?.end.getTime()).toBe(exampleEnd)
      for (const bucket of result.buckets)
        expect(bucket.end.getTime() - bucket.start.getTime()).toBe(
          config.bucketHours * hour,
        )
    }
  })
  it('conserves request/error totals, source identity, fractions, and stack endpoints', () => {
    const before = rows.map((row) => ({ ...row, samples: [...row.samples] }))
    const result = prepareTimeSeries(rows, '30d')
    expect(
      result.buckets.reduce(
        (sum, bucket) => sum + (bucket.total?.requests ?? 0),
        0,
      ),
    ).toBe(rows.reduce((sum, row) => sum + row.requests, 0))
    expect(
      result.buckets.reduce(
        (sum, bucket) => sum + (bucket.total?.errors ?? 0),
        0,
      ),
    ).toBe(rows.reduce((sum, row) => sum + row.errors, 0))
    expect(result.buckets[0]?.source[0]).toBe(rows[0])
    expect(result.points[0]?.source[0]).toBe(rows[0])
    for (const bucket of result.buckets) {
      const points = result.points.filter(
        (point) => point.bucketId === bucket.id,
      )
      expect(
        points.reduce((sum, point) => sum + (point.fraction ?? 0), 0),
      ).toBeCloseTo(1)
      expect(points.at(-1)?.y2).toBe(bucket.total?.requests)
      expect(points[0]?.y1).toBe(0)
    }
    expect(rows).toEqual(before)
  })
  it('calculates latency percentiles from pooled samples rather than averaging percentiles', () => {
    const records: HourlyRecord[] = [
      {
        id: 'a',
        timestamp: exampleEnd - hour,
        service: 'API',
        requests: 100,
        errors: 1,
        samples: [1],
      },
      {
        id: 'b',
        timestamp: exampleEnd - hour,
        service: 'API',
        requests: 100,
        errors: 2,
        samples: [10, 20, 30],
      },
    ]
    const bucket = prepareTimeSeries(records, '24h').buckets.at(-1)!
    expect(bucket.total).toEqual({
      requests: 200,
      errors: 3,
      p50: 15,
      p95: expect.closeTo(28.5),
    })
  })
  it('excludes hidden services from totals and detail sources', () => {
    const result = prepareTimeSeries(rows, '30d', ['API', 'Workers'])
    expect(result.points).toHaveLength(60)
    expect(
      result.buckets
        .flatMap((bucket) => bucket.source)
        .every((row) => row.service !== 'Storage'),
    ).toBe(true)
    expect(
      result.buckets.reduce(
        (sum, bucket) => sum + (bucket.total?.requests ?? 0),
        0,
      ),
    ).toBe(
      rows
        .filter((row) => row.service !== 'Storage')
        .reduce((sum, row) => sum + row.requests, 0),
    )
    expect(prepareTimeSeries(rows, '30d', []).points).toEqual([])
  })
  it('preserves unknown intervals and does not bridge waterfall changes across them', () => {
    const result = prepareTimeSeries(rows, '30d', serviceNames, true)
    const missing = result.buckets[15]!
    expect(missing.total).toBeNull()
    expect(missing.source).toEqual([])
    expect(
      result.points.filter((point) => point.bucketId === missing.id),
    ).toHaveLength(3)
    expect(
      result.points
        .filter((point) => point.bucketId === missing.id)
        .every(
          (point) =>
            point.requests === null && point.y1 === null && point.y2 === null,
        ),
    ).toBe(true)
    expect(result.buckets[16]?.change).toBeNull()
    expect(result.buckets[16]?.previous).toBeNull()
    expect(
      result.buckets.filter((bucket) => bucket.total !== null),
    ).toHaveLength(29)
  })
  it('distinguishes an observed zero from an absent interval', () => {
    const result = prepareTimeSeries(
      [
        {
          id: 'zero',
          timestamp: exampleEnd - hour,
          service: 'API',
          requests: 0,
          errors: 0,
          samples: [],
        },
      ],
      '24h',
      ['API'],
    )
    expect(result.buckets[0]?.total).toBeNull()
    expect(result.buckets.at(-1)?.total?.requests).toBe(0)
    expect(result.points.at(-1)?.fraction).toBe(0)
    expect(result.points.at(-1)?.indexed).toBeNull()
    expect(result.buckets.at(-1)?.total?.p95).toBeNull()
  })
  it('keeps empty intervals explicit and indexes each service to its first known value', () => {
    expect(
      prepareTimeSeries([], '30d').buckets.every(
        (bucket) => bucket.total === null,
      ),
    ).toBe(true)
    const result = prepareTimeSeries(rows, '30d')
    for (const service of serviceNames) {
      const points = result.points.filter((point) => point.service === service)
      expect(points[0]?.indexed).toBe(100)
      expect(points[1]?.indexed).toBeCloseTo(
        (points[1]!.requests! / points[0]!.requests!) * 100,
      )
    }
  })
  it('interpolates percentile endpoints without sorting the application array in place', () => {
    const values = [30, 1, 20, 10]
    expect(percentile(values, 0)).toBe(1)
    expect(percentile(values, 1)).toBe(30)
    expect(percentile(values, 0.5)).toBe(15)
    expect(percentile([], 0.5)).toBeNull()
    expect(values).toEqual([30, 1, 20, 10])
  })
  it('keeps annotation identities separate for intervals with the same start but different durations', () => {
    const daily = prepareTimeSeries(rows, '30d').buckets.at(-1)!
    const hourly = prepareTimeSeries(rows, '24h').buckets[0]!
    const sixHour = prepareTimeSeries(rows, '7d').buckets.find(
      (bucket) => bucket.start.getTime() === daily.start.getTime(),
    )!
    expect(hourly.start.getTime()).toBe(daily.start.getTime())
    expect(sixHour.start.getTime()).toBe(daily.start.getTime())
    expect(new Set([daily.id, hourly.id, sixHour.id]).size).toBe(3)
    expect(daily.source).toHaveLength(72)
    expect(hourly.source).toHaveLength(3)
    expect(sixHour.source).toHaveLength(18)
  })
})
