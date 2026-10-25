import {CorePlugin} from '../../../../../abstract/src/core/index.ts';
import {effect} from '../../../../../state/src/index.ts';

import type {DragDropManager} from '../../manager/index.ts';

const listenerOptions: AddEventListenerOptions = {
  capture: true,
  passive: true,
};

export class ScrollListener extends CorePlugin<DragDropManager> {
  #timeout: ReturnType<typeof setTimeout> | undefined;

  constructor(manager: DragDropManager) {
    super(manager);

    const {dragOperation} = this.manager;

    this.destroy = effect(() => {
      const enabled = dragOperation.status.dragging;

      if (enabled) {
        const root = dragOperation.source?.element?.ownerDocument ?? document;

        root.addEventListener('scroll', this.handleScroll, listenerOptions);

        return () => {
          clearTimeout(this.#timeout);
          this.#timeout = undefined;
          root.removeEventListener(
            'scroll',
            this.handleScroll,
            listenerOptions
          );
        };
      }

      return undefined;
    });
  }

  private handleScroll = () => {
    const {controller, status} = this.manager.dragOperation;
    if (!controller || controller.signal.aborted || !status.dragging) return;
    if (this.#timeout == null) {
      this.#timeout = setTimeout(() => {
        this.#timeout = undefined;
        if (this.manager.dragOperation.controller === controller &&
            !controller.signal.aborted && status.dragging) {
          this.manager.collisionObserver.forceUpdate(false);
        }
      }, 50);
    }
  };
}
