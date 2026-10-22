export type DecorationGeometry = {
  sizeMode: 'none' | 'longest' | 'axes'
  referenceSize: number
  rotation: number
  taper: number
  rotationFalloff: number
  taperFalloff: number
  randomizeOnHover: boolean
}
export const defaultDecorationGeometry: Readonly<DecorationGeometry> = {
  sizeMode: 'longest',
  referenceSize: 128,
  rotation: 2,
  taper: 2,
  rotationFalloff: 1,
  taperFalloff: 2,
  randomizeOnHover: true,
}
const finite = (
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
) => (Number.isFinite(value) ? Math.min(max, Math.max(min, value!)) : fallback)
export function resolveDecorationGeometry(
  value: Partial<DecorationGeometry> = {},
): DecorationGeometry {
  const defaults = defaultDecorationGeometry
  return {
    sizeMode:
      value.sizeMode === 'none' || value.sizeMode === 'axes'
        ? value.sizeMode
        : 'longest',
    referenceSize: finite(
      value.referenceSize,
      defaults.referenceSize,
      16,
      1024,
    ),
    rotation: finite(value.rotation, defaults.rotation, 0, 8),
    taper: finite(value.taper, defaults.taper, 0, 8),
    rotationFalloff: finite(
      value.rotationFalloff,
      defaults.rotationFalloff,
      0,
      4,
    ),
    taperFalloff: finite(value.taperFalloff, defaults.taperFalloff, 0, 4),
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
  const longest = Math.max(w, h)
  const scale = (size: number, falloff: number) =>
    options.sizeMode === 'none'
      ? 1
      : Math.min(1, (options.referenceSize / size) ** falloff)
  const xSize = options.sizeMode === 'axes' ? Math.sqrt(h * longest) : longest
  const ySize = options.sizeMode === 'axes' ? Math.sqrt(w * longest) : longest
  // Keep the backing away from the horizon of the shared 240px perspective.
  const safeTaper = (angle: number, span: number) => {
    const limit = (Math.asin(Math.min(1, 120 / (span + 12))) * 180) / Math.PI
    return Math.min(limit, Math.max(-limit, angle))
  }
  return [
    samples[0] * options.rotation * scale(longest, options.rotationFalloff),
    safeTaper(
      samples[1] * options.taper * scale(xSize, options.taperFalloff),
      h,
    ),
    safeTaper(
      samples[2] * options.taper * scale(ySize, options.taperFalloff),
      w,
    ),
  ]
}
