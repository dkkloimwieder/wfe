import {CorePlugin} from '../../../../../abstract/src/core/index.ts';
import {computed, deepEqual, reactive} from '../../../../../state/src/index.ts';
import {
  canScroll,
  detectScrollIntent,
  getScrollableAncestors,
  getElementFromPoint,
  getScrollPosition,
  ScrollDirection,
  scheduler,
  isKeyboardEvent,
  getDocument,
  getRoot,
} from '../../../utilities/index.ts';
import {Axes, type Axis, type Coordinates} from '../../../../../geometry/src/index.ts';

import type {DragDropManager} from '../../manager/index.ts';

import {ScrollIntentTracker} from './ScrollIntent.ts';

export interface ScrollOptions {
  acceleration?: number;
  threshold?: Record<Axis, number>;
}

export class Scroller extends CorePlugin<DragDropManager> {
  public getScrollableElements: () => Set<Element> | null;

  private scrollIntentTracker: ScrollIntentTracker;
  private destroyed = false;

  @reactive
  public accessor autoScrolling = false;

  constructor(manager: DragDropManager) {
    super(manager);

    let previousElementFromPoint: Element | null = null;
    let previousScrollableElements: Set<Element> | null = null;
    const elementFromPoint = computed(() => {
      const {position, source} = manager.dragOperation;

      if (!position) {
        return null;
      }

      const element = getElementFromPoint(
        getRoot(source?.element),
        position.current
      );

      if (element) {
        previousElementFromPoint = element;
      }

      return element ?? previousElementFromPoint;
    });
    const scrollableElements = computed(() => {
      const element = elementFromPoint.value;
      const {documentElement} = getDocument(element);

      if (!element || element === documentElement) {
        const {target} = manager.dragOperation;
        const targetElement = target?.element;

        if (targetElement) {
          const elements = getScrollableAncestors(targetElement, {
            excludeElement: false,
          });
          previousScrollableElements = elements;

          return elements;
        }
      }

      if (element) {
        const elements = getScrollableAncestors(element, {
          excludeElement: false,
        });

        if (
          this.autoScrolling &&
          previousScrollableElements &&
          elements.size < previousScrollableElements?.size
        ) {
          return previousScrollableElements;
        }

        previousScrollableElements = elements;

        return elements;
      }

      previousScrollableElements = null;

      return null;
    }, deepEqual);

    this.getScrollableElements = () => {
      return scrollableElements.value;
    };

    this.scrollIntentTracker = new ScrollIntentTracker(manager);

    const unsubscribe = manager.monitor.addEventListener('dragmove', (event) => {
      if (
        this.disabled ||
        event.defaultPrevented ||
        !isKeyboardEvent(manager.dragOperation.activatorEvent) ||
        !event.by
      ) {
        return;
      }

      // Prevent the move event if we can scroll to the new coordinates
      if (this.scroll({by: event.by})) {
        event.preventDefault();
      }
    });
    this.destroy = () => {
      this.destroyed = true;
      this.#meta = undefined;
      unsubscribe();
      this.scrollIntentTracker.destroy();
    };
  }

  #meta: {element: Element; by: Coordinates; controller: AbortController} | undefined;

  #scroll = () => {
    if (!this.#meta) return;
    const {controller} = this.#meta;
    if (this.destroyed || this.disabled || controller.signal.aborted ||
        this.manager.dragOperation.controller !== controller ||
        !this.manager.dragOperation.status.dragging) {
      this.#meta = undefined;
      return;
    }

    const {element, by} = this.#meta;

    if (by.y) element.scrollTop += by.y;
    if (by.x) element.scrollLeft += by.x;
  };

  public scroll = (
    options?: {by: Coordinates},
    scrollOptions?: ScrollOptions
  ): boolean => {
    const {controller, status} = this.manager.dragOperation;
    if (this.destroyed || this.disabled || !controller ||
        controller.signal.aborted || !status.dragging) {
      this.#meta = undefined;
      return false;
    }

    const elements = this.getScrollableElements();

    if (!elements) {
      this.#meta = undefined;
      return false;
    }

    const {position} = this.manager.dragOperation;
    const currentPosition = position?.current;

    if (currentPosition) {
      const {by} = options ?? {};
      const intent = by
        ? {
            x: getScrollIntent(by.x),
            y: getScrollIntent(by.y),
          }
        : undefined;
      const scrollIntent = intent
        ? undefined
        : this.scrollIntentTracker.current;

      if (scrollIntent?.isLocked()) {
        return false;
      }

      for (const scrollableElement of elements) {
        const scrollPosition = getScrollPosition(scrollableElement);
        const elementCanScroll = canScroll(
          scrollableElement,
          by,
          scrollPosition
        );

        if (elementCanScroll.x || elementCanScroll.y) {
          const {speed, direction} = detectScrollIntent(
            scrollableElement,
            currentPosition,
            intent,
            scrollOptions?.acceleration,
            scrollOptions?.threshold,
            undefined,
            scrollPosition
          );

          if (scrollIntent) {
            for (const axis of Axes) {
              if (scrollIntent[axis].isLocked(direction[axis])) {
                speed[axis] = 0;
                direction[axis] = 0;
              }
            }
          }

          if (direction.x || direction.y) {
            const {x, y} = by ?? direction;
            const scrollLeftBy = x * speed.x;
            const scrollTopBy = y * speed.y;

            if (scrollLeftBy || scrollTopBy) {
              const previousScrollBy = this.#meta?.by;

              if (this.autoScrolling && previousScrollBy) {
                const scrollIntentMismatch =
                  (previousScrollBy.x && !scrollLeftBy) ||
                  (previousScrollBy.y && !scrollTopBy);

                if (scrollIntentMismatch) continue;
              }

              this.#meta = {
                controller,
                element: scrollableElement,
                by: {
                  x: scrollLeftBy,
                  y: scrollTopBy,
                },
              };

              scheduler.schedule(this.#scroll);

              return true;
            }
          }
        }
      }
    }

    this.#meta = undefined;
    return false;
  };
}

function getScrollIntent(value: number) {
  if (value > 0) {
    return ScrollDirection.Forward;
  }

  if (value < 0) {
    return ScrollDirection.Reverse;
  }

  return ScrollDirection.Idle;
}
