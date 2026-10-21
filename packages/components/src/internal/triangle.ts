// Shared outline used by decorated disclosures and plain directional icons.
export const trianglePath = 'M1.625 3.375 9.5 9 1.625 14.625Z'

// A 6 by 4.2 triangle, centered in the existing 16px icon slot.
export function triangleTransform(direction: 'down' | 'right' | 'left') {
  const angle = direction === 'down' ? 90 : direction === 'left' ? 180 : 0
  return `translate(8 8) rotate(${angle}) scale(${8 / 15}) translate(-5.5625 -9)`
}
