import { describe, expect, it } from 'vitest'
import {
  decorationAngles,
  resolveDecorationGeometry,
} from '../../packages/components/src/theme/decorationGeometry'
const samples = [0.5, -0.4, 0.6] as const
const zero = { rotationReduction: 0, taperReduction: 0 } as const
describe('decoration reduction controls', () => {
  it('preserves a nonzero baseline at zero reduction in either scale', () => {
    const baseline = decorationAngles(
      100,
      80,
      samples,
      resolveDecorationGeometry(zero),
    )
    expect(baseline.every((angle) => angle !== 0)).toBe(true)
    for (const scale of ['linear', 'power'] as const)
      for (const exponent of [0.1, 1, 4])
        for (const [width, height] of [
          [20, 30],
          [300, 800],
          [1000, 240],
        ])
          expect(
            decorationAngles(
              width,
              height,
              samples,
              resolveDecorationGeometry({ ...zero, scale, exponent }),
            ),
          ).toEqual(baseline)
  })
  it('reduces each effect monotonically as its control increases', () => {
    for (const scale of ['linear', 'power'] as const) {
      let previous = decorationAngles(
        300,
        800,
        samples,
        resolveDecorationGeometry({ ...zero, scale }),
      )
      for (const amount of [0.1, 0.5, 1, 8]) {
        const next = decorationAngles(
          300,
          800,
          samples,
          resolveDecorationGeometry({
            scale,
            rotationReduction: amount,
            taperReduction: amount,
          }),
        )
        next.forEach((angle, axis) => {
          expect(Math.abs(angle)).toBeLessThan(Math.abs(previous[axis]))
          expect(Math.sign(angle)).toBe(Math.sign(previous[axis]))
        })
        previous = next
      }
    }
  })
  it('uses each taper side independently and the longest side for rotation', () => {
    const options = resolveDecorationGeometry({
      rotationReduction: 1,
      taperReduction: 1,
    })
    const original = decorationAngles(200, 800, samples, options)
    const wider = decorationAngles(400, 800, samples, options)
    expect(wider[0]).toBe(original[0])
    expect(wider[1]).toBe(original[1])
    expect(Math.abs(wider[2])).toBeLessThan(Math.abs(original[2]))
    const taller = decorationAngles(200, 1000, samples, options)
    expect(Math.abs(taller[0])).toBeLessThan(Math.abs(original[0]))
    expect(Math.abs(taller[1])).toBeLessThan(Math.abs(original[1]))
    expect(taller[2]).toBe(original[2])
  })
  it('keeps rotation and taper reduction independent', () => {
    const baseline = decorationAngles(
      300,
      800,
      samples,
      resolveDecorationGeometry(zero),
    )
    const rotationOnly = decorationAngles(
      300,
      800,
      samples,
      resolveDecorationGeometry({ ...zero, rotationReduction: 1 }),
    )
    expect(rotationOnly.slice(1)).toEqual(baseline.slice(1))
    expect(Math.abs(rotationOnly[0])).toBeLessThan(Math.abs(baseline[0]))
    const taperOnly = decorationAngles(
      300,
      800,
      samples,
      resolveDecorationGeometry({ ...zero, taperReduction: 1 }),
    )
    expect(taperOnly[0]).toBe(baseline[0])
    for (const axis of [1, 2])
      expect(Math.abs(taperOnly[axis])).toBeLessThan(Math.abs(baseline[axis]))
  })
  it('changes and disables each base angle without changing other axes', () => {
    for (const scale of ['linear', 'power'] as const) {
      const options = resolveDecorationGeometry({ scale })
      const baseline = decorationAngles(300, 800, samples, options)
      for (const [axis, key] of (
        ['rotation', 'taperX', 'taperY'] as const
      ).entries()) {
        const adjusted = decorationAngles(300, 800, samples, {
          ...options,
          [key]: options[key] / 2,
        })
        adjusted.forEach((angle, index) =>
          expect(angle).toBe(
            index === axis ? baseline[index] / 2 : baseline[index],
          ),
        )
        const disabled = decorationAngles(300, 800, samples, {
          ...options,
          [key]: 0,
        })
        expect(Math.abs(disabled[axis])).toBe(0)
      }
    }
  })
  it('matches linear at exponent one and reduces more with higher exponents', () => {
    const options = { rotationReduction: 0.5, taperReduction: 0.5 }
    const linear = decorationAngles(
      300,
      800,
      samples,
      resolveDecorationGeometry({ ...options, scale: 'linear' }),
    )
    const power = decorationAngles(
      300,
      800,
      samples,
      resolveDecorationGeometry({ ...options, scale: 'power', exponent: 1 }),
    )
    expect(power).toEqual(linear)
    const stronger = decorationAngles(
      300,
      800,
      samples,
      resolveDecorationGeometry({ ...options, scale: 'power', exponent: 3 }),
    )
    stronger.forEach((angle, axis) =>
      expect(Math.abs(angle)).toBeLessThan(Math.abs(power[axis])),
    )
  })
})
