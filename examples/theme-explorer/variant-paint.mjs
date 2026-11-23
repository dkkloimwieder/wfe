// This function also runs in the browser through Playwright.
export function readVariantPaint(element) {
  const properties = [
    'background-color',
    'background-image',
    'background-size',
    'background-position',
    'background-clip',
    'display',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width',
    'color',
    'box-shadow',
    'outline-color',
    'outline-style',
    'outline-width',
    'outline-offset',
    'text-shadow',
    'opacity',
    'filter',
    'transform',
    'scale',
    'rotate',
    'translate',
    'visibility',
    'fill',
    'stroke',
  ]
  const result = {}
  for (const layer of ['', '::before', '::after']) {
    const style = getComputedStyle(element, layer || null)
    if (layer && (style.content === 'none' || style.content === 'normal'))
      continue
    for (const property of layer
      ? [...properties, 'content', 'mask-image', 'mask-clip', 'inset']
      : properties) {
      const value = style.getPropertyValue(property)
      if (property === 'outline-color' && style.outlineStyle === 'none')
        continue
      const key = layer ? `${layer} ${property}` : property
      if (property === 'box-shadow') {
        const shadows = value === 'none' ? [] : value.split(/,(?![^()]*\))/)
        result[`${key} outer`] = shadows
          .filter((shadow) => !shadow.includes('inset'))
          .map((shadow) => shadow.trim())
          .join(', ')
        result[`${key} inset`] = shadows
          .filter((shadow) => shadow.includes('inset'))
          .map((shadow) => shadow.trim())
          .join(', ')
      } else {
        result[key] = value
      }
    }
  }
  return result
}

export function paintDelta(rest, state) {
  return Object.fromEntries(
    [...new Set([...Object.keys(rest), ...Object.keys(state)])]
      .filter((property) => rest[property] !== state[property])
      .map((property) => [
        property,
        [rest[property] ?? null, state[property] ?? null],
      ]),
  )
}
