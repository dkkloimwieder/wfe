export type DecorationGeometry = {
  scale: 'linear' | 'power'
  exponent: number
  rotationReduction: number
  taperReduction: number
  randomizeOnHover: boolean
}
export const defaultDecorationGeometry: Readonly<DecorationGeometry> = {
  scale: 'power',
  exponent: 2,
  rotationReduction: 0.05,
  taperReduction: 0.3,
  randomizeOnHover: true,
}
const reductionValue = (value: number | undefined, fallback: number) =>
  Number.isFinite(value) ? Math.min(8, Math.max(0, value!)) : fallback
export function resolveDecorationGeometry(
  value: Partial<DecorationGeometry> = {},
): DecorationGeometry {
  return {
    scale:
      value.scale === 'linear' ? 'linear' : defaultDecorationGeometry.scale,
    exponent: Number.isFinite(value.exponent)
      ? Math.min(4, Math.max(0.1, value.exponent!))
      : defaultDecorationGeometry.exponent,
    rotationReduction: reductionValue(
      value.rotationReduction,
      defaultDecorationGeometry.rotationReduction,
    ),
    taperReduction: reductionValue(
      value.taperReduction,
      defaultDecorationGeometry.taperReduction,
    ),
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
  // Zero preserves the original two-degree ranges. Size only reduces them.
  const reduction = (size: number, amount: number) =>
    1 / (1 + (amount * size) / 100) ** exponent
  return [
    samples[0] * 2 * reduction(Math.max(w, h), options.rotationReduction),
    samples[1] * 2 * reduction(h, options.taperReduction),
    samples[2] * 2 * reduction(w, options.taperReduction),
  ]
}
