import {getComputedStyles} from '../styles/getComputedStyles.ts';

export function isFixed(
  node: Element,
  computedStyle: CSSStyleDeclaration = getComputedStyles(node, true)
): boolean {
  // Sticky elements still move with their scroll container on the other axis.
  return computedStyle.position === 'fixed';
}
