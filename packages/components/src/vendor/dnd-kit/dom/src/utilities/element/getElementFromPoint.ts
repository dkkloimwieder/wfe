import type {Coordinates} from '../../../../geometry/src/index.ts';

const cursorLayers = new WeakSet<Element>();

/** Only owned interception layers may be bypassed by internal hit testing. */
export function registerCursorLayer(element: Element): () => void {
  cursorLayers.add(element);
  return () => {
    cursorLayers.delete(element);
  };
}

export function getElementFromPoint(
  root: Document | ShadowRoot,
  {x, y}: Coordinates
): Element | null {
  let element = root.elementFromPoint(x, y);
  if (element && cursorLayers.has(element)) {
    element =
      root
        .elementsFromPoint(x, y)
        .find((candidate) => !cursorLayers.has(candidate)) ?? null;
  }

  if (isIFrameElement(element)) {
    const {contentDocument} = element;

    if (contentDocument) {
      const {left, top} = element.getBoundingClientRect();

      return getElementFromPoint(contentDocument, {
        x: x - left,
        y: y - top,
      });
    }
  }

  return element;
}

function isIFrameElement(
  element: Element | null
): element is HTMLIFrameElement {
  return element?.tagName === 'IFRAME';
}
