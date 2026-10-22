export type IconElement =
  'path' | 'circle' | 'rect' | 'line' | 'ellipse' | 'polyline' | 'polygon'
export type IconGeometryAttributes = Partial<
  Record<
    | 'd'
    | 'cx'
    | 'cy'
    | 'r'
    | 'rx'
    | 'ry'
    | 'x'
    | 'y'
    | 'x1'
    | 'x2'
    | 'y1'
    | 'y2'
    | 'width'
    | 'height'
    | 'points',
    string
  >
> & { fill?: 'none' | 'currentColor' }
export type IconDefinition = {
  readonly name: string
  readonly viewBox: string
  readonly nodes: readonly (readonly [
    IconElement,
    Readonly<IconGeometryAttributes>,
  ])[]
}
