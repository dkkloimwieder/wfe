import { clamp, getPrecision } from '../vendor/kobalte/utils/src/number'

export function sliderScale(min = 0, max = 100, step = 1) {
  if (
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    max <= min ||
    !Number.isFinite(step) ||
    step <= 0 ||
    min + step === min ||
    !Number.isFinite((max - min) / step)
  )
    throw new RangeError(
      'Slider requires finite increasing bounds and a positive usable step',
    )
  const factor = 10 ** Math.max(getPrecision(min), getPrecision(step))
  const clean = (value: number) =>
    Number.isFinite(value * factor)
      ? Math.round(value * factor) / factor
      : value
  return {
    min,
    max,
    step,
    constrain: (value: number) => clamp(value, min, max),
    fraction: (value: number) => (clamp(value, min, max) - min) / (max - min),
    snap(value: number, lower = min, upper = max) {
      const first = Math.ceil((lower - min) / step - 1e-10)
      const last = Math.floor((upper - min) / step + 1e-10)
      if (first > last) return clamp(value, lower, upper)
      const index = clamp(Math.round((value - min) / step), first, last)
      return clamp(clean(min + index * step), lower, upper)
    },
  }
}
