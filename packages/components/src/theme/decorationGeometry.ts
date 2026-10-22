export type DecorationGeometry = {
  rotation: number
  taperX: number
  taperY: number
  scale: 'linear' | 'power'
  exponent: number
  rotationReduction: number
  taperReduction: number
  randomizeOnHover: boolean
}
export const defaultDecorationGeometry: Readonly<DecorationGeometry> = {
  rotation: 2,
  taperX: 2,
  taperY: 2,
  scale: 'power',
  exponent: 2,
  rotationReduction: 0.05,
  taperReduction: 0.3,
  randomizeOnHover: true,
}
const boundedAmount = (value: number | undefined, fallback: number) =>
  Number.isFinite(value) ? Math.min(8, Math.max(0, value!)) : fallback
export function resolveDecorationGeometry(
  value: Partial<DecorationGeometry> = {},
): DecorationGeometry {
  return {
    rotation: boundedAmount(value.rotation, defaultDecorationGeometry.rotation),
    taperX: boundedAmount(value.taperX, defaultDecorationGeometry.taperX),
    taperY: boundedAmount(value.taperY, defaultDecorationGeometry.taperY),
    scale:
      value.scale === 'linear' ? 'linear' : defaultDecorationGeometry.scale,
    exponent: Number.isFinite(value.exponent)
      ? Math.min(4, Math.max(0.1, value.exponent!))
      : defaultDecorationGeometry.exponent,
    rotationReduction: boundedAmount(
      value.rotationReduction,
      defaultDecorationGeometry.rotationReduction,
    ),
    taperReduction: boundedAmount(
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
  // Zero reduction preserves the selected base angles.
  const reduction = (size: number, amount: number) =>
    1 / (1 + (amount * size) / 100) ** exponent
  return [
    samples[0] *
      options.rotation *
      reduction(Math.max(w, h), options.rotationReduction),
    samples[1] * options.taperX * reduction(h, options.taperReduction),
    samples[2] * options.taperY * reduction(w, options.taperReduction),
  ]
}
