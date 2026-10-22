export type DecorationGeometry = {
  scale: 'linear' | 'power'
  exponent: number
  rotation: number
  taper: number
  randomizeOnHover: boolean
}
export const defaultDecorationGeometry: Readonly<DecorationGeometry> = {
  scale: 'linear',
  exponent: 2,
  rotation: 2,
  taper: 2,
  randomizeOnHover: true,
}
const strength = (value: number | undefined, fallback: number) =>
  Number.isFinite(value) ? Math.min(8, Math.max(0, value!)) : fallback
export function resolveDecorationGeometry(
  value: Partial<DecorationGeometry> = {},
): DecorationGeometry {
  return {
    scale: value.scale === 'power' ? 'power' : 'linear',
    exponent: Number.isFinite(value.exponent)
      ? Math.min(4, Math.max(0.1, value.exponent!))
      : defaultDecorationGeometry.exponent,
    rotation: strength(value.rotation, defaultDecorationGeometry.rotation),
    taper: strength(value.taper, defaultDecorationGeometry.taper),
    randomizeOnHover: value.randomizeOnHover ?? true,
  }
}
export type DecorationSamples = readonly [number, number, number]
export function decorationAngles(
  width: number,
  height: number,
  samples: DecorationSamples,
  options: DecorationGeometry,
): DecorationSamples {
  const w = Math.max(1, width),
    h = Math.max(1, height)
  const exponent = options.scale === 'power' ? options.exponent : 1
  const reduction = (size: number) => (100 / size) ** exponent
  const bound = (angle: number, limit: number) =>
    Math.max(-limit, Math.min(limit, angle))
  // Prevent projection inversion at extreme settings on small controls.
  const taperAngle = (sample: number, size: number) =>
    bound(
      sample * options.taper * reduction(size),
      (Math.asin(Math.min(1, 120 / (size + 12))) * 180) / Math.PI,
    )
  // Strength is expressed in degrees at 100px. Every size uses the same ratio.
  return [
    bound(samples[0] * options.rotation * reduction(Math.max(w, h)), 90),
    taperAngle(samples[1], h),
    taperAngle(samples[2], w),
  ]
}
