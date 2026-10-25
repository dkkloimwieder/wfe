import {Droppable as AbstractDroppable} from '../../../../../abstract/src/core/index.ts';
import type {
  Data,
  DroppableInput as AbstractDroppableInput,
} from '../../../../../abstract/src/core/index.ts';
import {defaultCollisionDetection} from '../../../../../collision/src/index.ts';
import type {CollisionDetector} from '../../../../../collision/src/index.ts';
import {reactive, signal, untracked} from '../../../../../state/src/index.ts';
import type {BoundingRectangle, Shape} from '../../../../../geometry/src/index.ts';
import {DOMRectangle, PositionObserver} from '../../../utilities/index.ts';

import type {DragDropManager} from '../../manager/manager.ts';

type OptionalInput = 'collisionDetector';

export interface Input<T extends Data = Data>
  extends Omit<AbstractDroppableInput<T>, OptionalInput> {
  collisionDetector?: CollisionDetector;
  element?: Element;
}

export class Droppable<T extends Data = Data> extends AbstractDroppable<
  T,
  DragDropManager
> {
  constructor(
    {element, effects = () => [], ...input}: Input<T>,
    manager: DragDropManager | undefined
  ) {
    const {collisionDetector = defaultCollisionDetection} = input;
    const updateShape = (boundingClientRect?: BoundingRectangle | null) => {
      const {manager, element} = this;

      if (!element || boundingClientRect === null) {
        this.shape = undefined;
        return undefined;
      }

      if (!manager) return;

      const updatedShape = new DOMRectangle(element);

      const shape = untracked(() => this.shape);
      if (updatedShape && shape?.equals(updatedShape)) {
        return shape;
      }

      this.shape = updatedShape;

      return updatedShape;
    };

    const observePosition = signal(false);

    super(
      {
        ...input,
        collisionDetector,
        effects: () => [
          ...effects(),
          () => {
            const {element, manager} = this;
            if (!manager) return;

            const {dragOperation} = manager;
            const {source} = dragOperation;

            observePosition.value = Boolean(
              source &&
                dragOperation.status.initialized &&
                element &&
                !this.disabled &&
                this.accepts(source)
            );
          },
          () => {
            const {element} = this;

            if (observePosition.value && element) {
              const positionObserver = new PositionObserver(
                element,
                updateShape
              );

              return () => {
                positionObserver.disconnect();
                this.shape = undefined;
              };
            }

            return undefined;
          },
          () => {
            if (this.manager?.dragOperation.status.initialized) {
              return () => {
                this.shape = undefined;
              };
            }

            return undefined;
          },
        ],
      },
      manager
    );

    this.element = element;
    this.refreshShape = () => updateShape();
  }

  @reactive
  accessor #element: Element | undefined;

  @reactive
  public accessor proxy: Element | undefined;

  set element(element: Element | undefined) {
    this.#element = element;
  }

  get element() {
    return this.proxy ?? this.#element;
  }

  public refreshShape: () => Shape | undefined;
}
