import type { ChartTooltipPlacement, ChartTooltipPosition } from './types'

export interface TooltipBounds {
  left: number
  top: number
  right: number
  bottom: number
}

export interface TooltipSize {
  width: number
  height: number
}

const defaultPlacements: readonly ChartTooltipPlacement[] = [
  'top',
  'bottom',
  'right',
  'left',
]

export interface TooltipPlacementResult {
  left: number
  top: number
  placement: ChartTooltipPlacement
  maxWidth: number
  maxHeight: number
}

type PlacementInput =
  'auto' | ChartTooltipPlacement | readonly ChartTooltipPlacement[] | undefined

export function resolveChartTooltipPlacement(
  anchor: ChartTooltipPosition,
  tooltip: TooltipSize,
  boundary: TooltipBounds,
  placement: PlacementInput,
  offset: number | undefined,
): TooltipPlacementResult
export function resolveChartTooltipPlacement(
  anchor: ChartTooltipPosition,
  tooltip: TooltipSize,
  boundary: TooltipBounds,
  placement: PlacementInput,
  offset: number | undefined,
  avoid: TooltipBounds | undefined,
): TooltipPlacementResult | null
/** Resolves host-local tooltip placement without reading the DOM. */
export function resolveChartTooltipPlacement(
  anchor: ChartTooltipPosition,
  tooltip: TooltipSize,
  boundary: TooltipBounds,
  placement:
    | 'auto'
    | ChartTooltipPlacement
    | readonly ChartTooltipPlacement[]
    | undefined,
  offset: number | undefined,
  avoid?: TooltipBounds,
): TooltipPlacementResult | null {
  const edge = 8
  const gap =
    offset !== undefined && Number.isFinite(offset) ? Math.max(0, offset) : 10
  if (avoid)
    return placeOutsideBounds(
      anchor,
      tooltip,
      boundary,
      placement,
      gap,
      avoid,
      edge,
    )
  const minimumLeft = boundary.left + edge
  const minimumTop = boundary.top + edge
  const maxLeft = Math.max(minimumLeft, boundary.right - edge - tooltip.width)
  const maxTop = Math.max(minimumTop, boundary.bottom - edge - tooltip.height)
  const placements =
    placement === undefined || placement === 'auto'
      ? defaultPlacements
      : Array.isArray(placement)
        ? placement.length
          ? placement
          : defaultPlacements
        : [placement as ChartTooltipPlacement]
  const candidates = placements.map((candidate) =>
    tooltipPlacement(
      candidate,
      anchor.x,
      anchor.y,
      tooltip.width,
      tooltip.height,
      gap,
    ),
  )
  let selected = candidates[0]!
  let selectedOverflow = overflow(
    selected,
    tooltip.width,
    tooltip.height,
    boundary,
    edge,
  )
  for (const candidate of candidates) {
    const candidateOverflow = overflow(
      candidate,
      tooltip.width,
      tooltip.height,
      boundary,
      edge,
    )
    if (candidateOverflow === 0) {
      selected = candidate
      break
    }
    if (candidateOverflow < selectedOverflow) {
      selected = candidate
      selectedOverflow = candidateOverflow
    }
  }
  return {
    left: clamp(selected.left, minimumLeft, maxLeft),
    top: clamp(selected.top, minimumTop, maxTop),
    placement: selected.placement,
    maxWidth: Math.max(0, boundary.right - boundary.left - edge * 2),
    maxHeight: Math.max(0, boundary.bottom - boundary.top - edge * 2),
  }
}

function placeOutsideBounds(
  anchor: ChartTooltipPosition,
  tooltip: TooltipSize,
  boundary: TooltipBounds,
  placement: PlacementInput,
  gap: number,
  avoid: TooltipBounds,
  edge: number,
): TooltipPlacementResult | null {
  if (
    ![
      anchor.x,
      anchor.y,
      tooltip.width,
      tooltip.height,
      ...Object.values(boundary),
      ...Object.values(avoid),
    ].every(Number.isFinite) ||
    tooltip.width < 0 ||
    tooltip.height < 0
  )
    return null
  const inner = {
    left: boundary.left + edge,
    top: boundary.top + edge,
    right: boundary.right - edge,
    bottom: boundary.bottom - edge,
  }
  if (inner.right <= inner.left || inner.bottom <= inner.top) return null
  const excluded = {
    left: Math.min(avoid.left, avoid.right),
    top: Math.min(avoid.top, avoid.bottom),
    right: Math.max(avoid.left, avoid.right),
    bottom: Math.max(avoid.top, avoid.bottom),
  }
  const preferred =
    placement === undefined || placement === 'auto'
      ? defaultPlacements
      : Array.isArray(placement)
        ? placement
        : [placement as ChartTooltipPlacement]
  const placements = [...new Set([...preferred, ...defaultPlacements])]
  const candidates = placements.flatMap((side) => {
    const region = { ...inner }
    if (side.startsWith('top'))
      region.bottom = Math.min(region.bottom, excluded.top - gap)
    if (side.startsWith('bottom'))
      region.top = Math.max(region.top, excluded.bottom + gap)
    if (side.endsWith('left'))
      region.right = Math.min(region.right, excluded.left - gap)
    if (side.endsWith('right'))
      region.left = Math.max(region.left, excluded.right + gap)
    const width = region.right - region.left
    const height = region.bottom - region.top
    return width > 0 && height > 0 ? [{ side, region, width, height }] : []
  })
  const full = candidates.find(
    (candidate) =>
      tooltip.width <= candidate.width && tooltip.height <= candidate.height,
  )
  const selected =
    full ??
    candidates.reduce<(typeof candidates)[number] | undefined>(
      (best, candidate) => {
        // Prefer the region that can show the largest portion of this card.
        const area = (region: (typeof candidates)[number]) =>
          Math.min(tooltip.width, region.width) *
          Math.min(tooltip.height, region.height)
        return !best || area(candidate) > area(best) ? candidate : best
      },
      undefined,
    )
  if (!selected) return null
  const { side, region, width, height } = selected
  const fittedWidth = Math.min(tooltip.width, width)
  const fittedHeight = Math.min(tooltip.height, height)
  const left = side.endsWith('right')
    ? region.left
    : side.endsWith('left')
      ? region.right - fittedWidth
      : clamp(
          anchor.x - fittedWidth / 2,
          region.left,
          region.right - fittedWidth,
        )
  const top = side.startsWith('bottom')
    ? region.top
    : side.startsWith('top')
      ? region.bottom - fittedHeight
      : clamp(
          anchor.y - fittedHeight / 2,
          region.top,
          region.bottom - fittedHeight,
        )
  return { left, top, placement: side, maxWidth: width, maxHeight: height }
}

function tooltipPlacement(
  placement: ChartTooltipPlacement,
  anchorX: number,
  anchorY: number,
  width: number,
  height: number,
  gap: number,
) {
  const xDirection =
    placement.endsWith('right') || placement === 'right'
      ? 1
      : placement.endsWith('left') || placement === 'left'
        ? -1
        : 0
  const yDirection =
    placement.startsWith('bottom') || placement === 'bottom'
      ? 1
      : placement.startsWith('top') || placement === 'top'
        ? -1
        : 0
  return {
    placement,
    left: anchorX + ((xDirection - 1) * width) / 2 + xDirection * gap,
    top: anchorY + ((yDirection - 1) * height) / 2 + yDirection * gap,
  }
}

function overflow(
  position: { left: number; top: number },
  width: number,
  height: number,
  boundary: TooltipBounds,
  edge: number,
) {
  return (
    Math.max(0, boundary.left + edge - position.left) +
    Math.max(0, position.left + width + edge - boundary.right) +
    Math.max(0, boundary.top + edge - position.top) +
    Math.max(0, position.top + height + edge - boundary.bottom)
  )
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value))
}
