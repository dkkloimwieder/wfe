import {Plugin} from '../../../../../abstract/src/core/index.ts';
import {DragDropManager} from '../../manager/index.ts';
import {getDocuments} from '../../../utilities/execution-context/getDocuments.ts';

/** Suppress selection during a gesture without a document-wide CSS change. */
export class PreventSelection extends Plugin<DragDropManager> {
  constructor(public manager: DragDropManager) {
    super(manager);
    this.registerEffect(() => {
      const operation = manager.dragOperation;
      const source = operation.source?.element;
      const target = operation.target?.element;
      if (this.disabled || !operation.status.initialized || !source) return;
      const documents = new Set(getDocuments(source.ownerDocument));
      if (target) documents.add(target.ownerDocument);
      const roots = new Set<Document | ShadowRoot>(documents);
      for (const element of [source, target]) {
        const root = element?.getRootNode();
        if (root && 'host' in root) roots.add(root as ShadowRoot);
      }
      const prevent = (event: Event) => event.preventDefault();
      const clear = () => {
        for (const document of documents) {
          const selection = document.getSelection();
          if (selection?.rangeCount) selection.removeAllRanges();
        }
      };
      clear();
      for (const root of roots) {
        root.addEventListener('selectstart', prevent, true);
        root.addEventListener('selectionchange', clear, true);
      }
      return () => {
        for (const root of roots) {
          root.removeEventListener('selectstart', prevent, true);
          root.removeEventListener('selectionchange', clear, true);
        }
      };
    });
  }
}
