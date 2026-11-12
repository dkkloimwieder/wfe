import { describe, expect, it } from 'vitest'
import {
  createSamples,
  empiricalCdf,
  histogramDensity,
  quantile,
  summarizeSamples,
} from '../../examples/shared/charts/statistics-data'
import type { Sample } from '../../examples/shared/charts/statistics-data'
const rows = (values: readonly number[]): Sample[] =>
  values.map((value, index) => ({ id: String(index), group: 'A', value }))
describe('statistical example policies', () => {
  it('interpolates quartiles, handles endpoints, and preserves the input order', () => {
    const values = [4, 1, 3, 2]
    expect([0, 0.25, 0.5, 0.75, 1].map((p) => quantile(values, p))).toEqual([
      1, 1.75, 2.5, 3.25, 4,
    ])
    expect(values).toEqual([4, 1, 3, 2])
    expect(quantile([], 0.5)).toBeNull()
    expect(() => quantile(values, -1)).toThrow(RangeError)
    expect(() => quantile(values, NaN)).toThrow(RangeError)
  })
  it('keeps original finite rows and reports omitted nonfinite values', () => {
    const source = rows([1, NaN, Infinity, 3])
    const result = summarizeSamples(source)[0]!
    expect(result.source).toEqual([source[0], source[3]])
    expect(result.source[0]).toBe(source[0])
    expect(result.excluded).toBe(2)
    expect(result.mean).toBe(2)
    expect(summarizeSamples(rows([NaN]))).toEqual([])
  })
  it('uses observed whiskers and retains distinct outlier records', () => {
    const source = rows([1, 2, 3, 4, 5, 100, 100])
    const result = summarizeSamples(source)[0]!
    expect(result.q1).toBe(2.5)
    expect(result.q3).toBe(52.5)
    expect(result.high).toBe(100)
    const outlier = summarizeSamples(rows([1, 2, 3, 4, 5, 6, 100]))[0]!
    expect(outlier.high).toBe(6)
    expect(outlier.outliers.map((row) => row.value)).toEqual([100])
  })
  it('handles singleton, all-equal, negative and empty populations', () => {
    expect(summarizeSamples([])).toEqual([])
    for (const values of [[7], [7, 7, 7], [-5, -4, -3]]) {
      const result = summarizeSamples(rows(values))[0]!
      expect(Number.isFinite(result.mean)).toBe(true)
      expect(result.outliers).toEqual([])
      expect(result.low).toBe(Math.min(...values))
      expect(result.high).toBe(Math.max(...values))
    }
  })
  it('pools CDF ties, jumps from zero to one and preserves contributing identity', () => {
    const source = rows([2, 1, 2, 4])
    const result = empiricalCdf(summarizeSamples(source)[0]!)
    expect(result.map(({ x, y }) => [x, y])).toEqual([
      [1, 0],
      [1, 0.25],
      [2, 0.25],
      [2, 0.75],
      [4, 0.75],
      [4, 1],
    ])
    expect(result[3]!.source[0]).toBe(source[0])
    expect(new Set(result.map((row) => row.id)).size).toBe(result.length)
  })
  it('conserves histogram probability and includes the maximum once', () => {
    for (const values of [[1], [2, 2, 2], [-10, -5, 0, 5, 10]]) {
      const source = rows(values)
      const bins = histogramDensity(summarizeSamples(source)[0]!, 4)
      expect(
        bins.reduce((sum, bin) => sum + bin.density * (bin.x2 - bin.x1), 0),
      ).toBeCloseTo(1)
      expect(bins.flatMap((bin) => bin.source)).toHaveLength(source.length)
      expect(bins.every((bin) => Number.isFinite(bin.density))).toBe(true)
      expect(bins.flatMap((bin) => bin.source).at(-1)).toBe(source.at(-1))
    }
    expect(() => histogramDensity(summarizeSamples(rows([1]))[0]!, 0)).toThrow(
      RangeError,
    )
  })
  it('retains sample IDs across refresh and group provenance', () => {
    const before = createSamples()
    expect(createSamples(1).map((row) => row.id)).toEqual(
      before.map((row) => row.id),
    )
    expect(createSamples(1)[0]!.value).not.toBe(before[0]!.value)
    expect(
      summarizeSamples(before).every((row) =>
        row.source.every((sample) => sample.group === row.id),
      ),
    ).toBe(true)
  })
})
