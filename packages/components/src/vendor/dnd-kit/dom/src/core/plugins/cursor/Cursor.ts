import {Plugin} from '../../../../../abstract/src/core/index.ts';
import {DragDropManager} from '../../manager/index.ts';
import {getDocuments} from '../../../utilities/execution-context/getDocuments.ts';
import {registerCursorLayer} from '../../../utilities/element/getElementFromPoint.ts';

interface CursorPluginOptions {
  /** Cursor displayed while pointer dragging. @default 'grabbing' */
  cursor?: string;
}

/** Pointer interception isolates a drag without restyling every page element. */
export class Cursor extends Plugin<DragDropManager> {
  constructor(
    public manager: DragDropManager,
    options?: CursorPluginOptions
  ) {
    super(manager, options);
    const layers = new Map<Document, () => void>();
    const clear = () => {
      for (const release of layers.values()) release();
      layers.clear();
    };
    const destroy = this.destroy.bind(this);
    this.destroy = () => {
      destroy();
      clear();
    };
    this.registerEffect(() => {
      const operation = manager.dragOperation;
      const source = operation.source?.element;
      const target = operation.target?.element;
      if (
        this.disabled ||
        !operation.status.initialized ||
        !source ||
        operation.activatorEvent?.type.startsWith('key')
      ) {
        clear();
        return;
      }
      const documents = new Set(getDocuments(source.ownerDocument));
      if (target) documents.add(target.ownerDocument);
      for (const [document, release] of layers) {
        if (!documents.has(document)) {
          release();
          layers.delete(document);
        }
      }
      for (const document of documents) {
        if (layers.has(document)) continue;
        let ancestor: Element | null =
          source.ownerDocument === document
            ? source
            : target?.ownerDocument === document
              ? target
              : null;
        let container: Element | null = null;
        while (ancestor) {
          if (
            ancestor.localName === 'dialog' &&
            ancestor.hasAttribute('open')
          ) {
            container = ancestor;
            break;
          }
          const root = ancestor.getRootNode();
          ancestor =
            ancestor.parentElement ??
            ('host' in root ? (root as ShadowRoot).host : null);
        }
        // Native modal dialogs occupy the top layer, above body descendants.
        if (!container) {
          try {
            container = document.querySelector('dialog:modal');
          } catch {
            /* Older DOM implementations. */
          }
        }
        container ??= document.body;
        if (!container) continue;
        const layer = document.createElement('div');
        layer.setAttribute('data-dnd-cursor-layer', '');
        layer.setAttribute('aria-hidden', 'true');
        layer.style.cssText =
          'position:fixed;inset:0;z-index:2147483647;pointer-events:auto;touch-action:none;user-select:none;';
        layer.style.setProperty(
          'cursor',
          options?.cursor ?? 'grabbing',
          'important'
        );
        const block = (event: Event) => {
          event.preventDefault();
          event.stopPropagation();
        };
        for (const name of ['click', 'dblclick', 'contextmenu', 'wheel'])
          layer.addEventListener(name, block, {passive: false});
        const guardKey = (event: KeyboardEvent) => {
          try {
            if (
              event.key === 'Escape' &&
              !event.isComposing &&
              event.keyCode !== 229
            ) {
              manager.actions.stop({event, canceled: true});
            }
          } finally {
            // The gesture owns Escape; it must not also dismiss a parent overlay.
            event.preventDefault();
            event.stopImmediatePropagation();
          }
        };
        document.addEventListener('keydown', guardKey, true);
        const unregister = registerCursorLayer(layer);
        container.append(layer);
        layers.set(document, () => {
          document.removeEventListener('keydown', guardKey, true);
          unregister();
          layer.remove();
        });
      }
    });
  }
}
