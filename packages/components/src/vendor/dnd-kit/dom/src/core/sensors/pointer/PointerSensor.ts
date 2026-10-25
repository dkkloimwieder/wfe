import {effect} from '../../../../../state/src/index.ts';
import type {CleanupFunction} from '../../../../../state/src/index.ts';
import {
  Sensor,
  configurator,
  ActivationController,
  type ActivationConstraints,
} from '../../../../../abstract/src/core/index.ts';
import type {Coordinates} from '../../../../../geometry/src/index.ts';
import {
  getDocument,
  getDocuments,
  getEventCoordinates,
  getFrameTransform,
  getInteractiveElement,
  isElement,
  isHTMLElement,
  isPointerEvent,
  isTextInput,
  Listeners,
  scheduler,
} from '../../../utilities/index.ts';

import type {DragDropManager} from '../../manager/index.ts';
import type {Draggable} from '../../entities/index.ts';

import {PointerActivationConstraints} from './PointerActivationConstraints.ts';

type Maybe<T> = T | undefined;

export interface PointerSensorOptions {
  activationConstraints?:
    | ActivationConstraints<PointerEvent>
    | ((
        event: PointerEvent,
        source: Draggable
      ) => ActivationConstraints<PointerEvent> | undefined);
  activatorElements?:
    | Maybe<Element>[]
    | ((source: Draggable) => Maybe<Element>[]);
  preventActivation?: (event: PointerEvent, source: Draggable) => boolean;
}

const defaults = Object.freeze<PointerSensorOptions>({
  activationConstraints(event, source) {
    const {pointerType, target} = event;

    if (
      pointerType === 'mouse' &&
      isElement(target) &&
      (source.handle === target || source.handle?.contains(target))
    ) {
      return undefined;
    }

    if (pointerType === 'touch') {
      return [
        new PointerActivationConstraints.Delay({value: 250, tolerance: 5}),
      ];
    }

    if (isTextInput(target) && !event.defaultPrevented) {
      return [
        new PointerActivationConstraints.Delay({value: 200, tolerance: 0}),
      ];
    }

    return [
      new PointerActivationConstraints.Delay({value: 200, tolerance: 10}),
      new PointerActivationConstraints.Distance({value: 5}),
    ];
  },
  preventActivation(event, source) {
    const {target} = event;

    if (target === source.element) return false;
    if (target === source.handle) return false;
    if (!isElement(target)) return false;
    if (source.handle?.contains(target)) return false;

    const interactiveElement = getInteractiveElement(target);

    if (interactiveElement === source.element) return false;

    return Boolean(interactiveElement);
  },
});

type LatestState = {
  event: PointerEvent | undefined;
  coordinates: Coordinates | undefined;
};

/**
 * The PointerSensor class is an input sensor that handles Pointer events,
 * such as mouse, touch and pen interactions.
 */
export class PointerSensor extends Sensor<
  DragDropManager,
  PointerSensorOptions
> {
  #cleanup: Set<CleanupFunction> = new Set();

  protected listeners = new Listeners();

  protected initialCoordinates: Coordinates | undefined;

  protected controller: ActivationController<PointerEvent> | undefined;

  private source: Draggable | undefined;
  private pointerId: number | undefined;
  private captureTarget: Element | undefined;

  constructor(
    public manager: DragDropManager,
    public options?: PointerSensorOptions
  ) {
    super(manager);

    this.handleCancel = this.handleCancel.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  protected activationConstraints(
    event: PointerEvent,
    source: Draggable,
    options = this.options
  ) {
    const {activationConstraints = defaults.activationConstraints} =
      options ?? {};

    const constraints =
      typeof activationConstraints === 'function'
        ? activationConstraints(event, source)
        : activationConstraints;

    return constraints;
  }

  public bind(source: Draggable, options = this.options): CleanupFunction {
    const unbind = effect(() => {
      if (source.disabled || this.disabled) return noop;
      const controller = new AbortController();
      const {signal} = controller;
      const listener: EventListener = (event: Event) => {
        if (isPointerEvent(event)) {
          this.handlePointerDown(event, source, options);
        }
      };
      let targets = [source.handle ?? source.element];

      if (options?.activatorElements) {
        if (Array.isArray(options.activatorElements)) {
          targets = options.activatorElements;
        } else {
          targets = options.activatorElements(source);
        }
      }

      const releaseWindows: CleanupFunction[] = [];
      for (const target of targets) {
        if (!target) continue;

        releaseWindows.push(patchWindow(target.ownerDocument.defaultView));
        target.addEventListener('pointerdown', listener, {signal});
      }

      return () => {
        try {
          if (this.source === source) this.cancel();
        } finally {
          controller.abort();
          releaseWindows.forEach((release) => release());
        }
      };
    });

    return unbind;
  }

  protected handlePointerDown(
    event: PointerEvent,
    source: Draggable,
    options: PointerSensorOptions | undefined
  ) {
    if (
      this.disabled ||
      this.pointerId !== undefined ||
      !event.isPrimary ||
      event.button !== 0 ||
      !isElement(event.target) ||
      source.disabled ||
      isCapturedBySensor(event) ||
      !this.manager.dragOperation.status.idle
    ) {
      return;
    }

    const {preventActivation = defaults.preventActivation} = options ?? {};

    if (preventActivation?.(event, source)) {
      return;
    }

    const {target} = event;
    const isNativeDraggable =
      isHTMLElement(target) &&
      target.draggable &&
      target.getAttribute('draggable') === 'true';

    const offset = getFrameTransform(source.element);
    const {x, y} = getEventCoordinates(event);

    this.initialCoordinates = {
      x: x * offset.scaleX + offset.x,
      y: y * offset.scaleY + offset.y,
    };

    this.source = source;
    this.pointerId = event.pointerId;
    const constraints = this.activationConstraints(event, source, options);
    (event as any).sensor = this;

    const controller = new ActivationController<PointerEvent>(
      constraints,
      (event) => this.handleStart(source, event)
    );

    controller.signal.onabort = () => this.handleCancel(event);
    this.controller = controller;
    controller.onEvent(event);
    if (this.pointerId !== event.pointerId) return;

    const documents = getDocuments();
    const unbindListeners = this.listeners.bind(documents, [
      {
        type: 'pointermove',
        listener: (event: PointerEvent) =>
          this.handlePointerMove(event, source),
      },
      {
        type: 'pointerup',
        listener: this.handlePointerUp,
        options: {
          capture: true,
        },
      },
      {
        type: 'pointercancel',
        listener: this.handleCancel,
      },
      {type: 'keydown', listener: this.handleKeyDown},
      {
        type: 'visibilitychange',
        listener: (event) => {
          if ((event.currentTarget as Document).visibilityState === 'hidden') {
            this.handleCancel(event);
          }
        },
      },
      {
        // Cancel activation if there is a competing Drag and Drop interaction
        type: 'dragstart',
        listener: isNativeDraggable ? this.handleCancel : preventDefault,
        options: {
          capture: true,
        },
      },
    ]);

    const cleanup = () => {
      unbindListeners();
      this.initialCoordinates = undefined;
    };

    this.#cleanup.add(cleanup);
    const ownerWindow = source.element?.ownerDocument.defaultView;
    if (ownerWindow) {
      this.#cleanup.add(this.listeners.bind(ownerWindow, {
        type: 'blur', listener: this.handleCancel,
      }));
    }
  }

  private latest: LatestState = {
    event: undefined,
    coordinates: undefined,
  };

  protected handleMove = () => {
    const {event, coordinates: to} = this.latest;

    if (!event || !to) {
      return;
    }

    this.manager.actions.move({event, to});
  };

  protected handlePointerMove(event: PointerEvent, source: Draggable) {
    if (event.pointerId !== this.pointerId) return;
    if (this.controller?.activated === false) {
      this.controller?.onEvent(event);
    }

    const {status} = this.manager.dragOperation;

    if (status.initializing || status.dragging) {
      const coordinates = getEventCoordinates(event);
      const offset = getFrameTransform(source.element);

      coordinates.x = coordinates.x * offset.scaleX + offset.x;
      coordinates.y = coordinates.y * offset.scaleY + offset.y;

      event.preventDefault();
      event.stopPropagation();

      this.latest.event = event;
      this.latest.coordinates = coordinates;

      if (status.dragging) {
        scheduler.schedule(this.handleMove);
      }
    }
  }

  private handlePointerUp(event: PointerEvent) {
    if (event.pointerId !== this.pointerId) return;
    const {controller, status} = this.manager.dragOperation;
    if (status.dragging && controller && this.latest.event) {
      event.preventDefault();
      event.stopPropagation();
      // Flush the final queued coordinates before resolving the drop. Wait for
      // prior target updates first; do not require another animation frame.
      this.manager.renderer.rendering.then(() => {
        if (controller.signal.aborted || this.manager.dragOperation.controller !== controller) return;
        this.handleMove();
        queueMicrotask(() => {
          if (controller.signal.aborted || this.manager.dragOperation.controller !== controller) return;
          this.manager.collisionObserver.forceUpdate();
          this.finishPointerUp(event);
        });
      });
      return;
    }
    this.finishPointerUp(event);
  }

  private finishPointerUp(event: PointerEvent) {
    if (event.pointerId !== this.pointerId) return;
    // End the drag and drop operation
    const {status} = this.manager.dragOperation;

    if (!status.idle) {
      // Prevent the default behaviour of the event
      event.preventDefault();
      event.stopPropagation();

      const canceled = !status.initialized;
      const ownerDocument = getDocument(event.target);
      const ownerWindow = ownerDocument.defaultView;

      if (!canceled && ownerWindow) {
        const suppressClick = (clickEvent: MouseEvent) => {
          if (
            clickEvent.target === ownerDocument.body &&
            clickEvent.detail > 0
          ) {
            clickEvent.preventDefault();
            clickEvent.stopImmediatePropagation();
          }
        };

        ownerWindow.addEventListener('click', suppressClick, true);

        // Suppress the body-targeted click following a drop before it
        // reaches document-level outside-click handlers.
        ownerWindow.setTimeout(() => {
          ownerWindow.removeEventListener('click', suppressClick, true);
        }, 0);
      }

      this.manager.actions.stop({event, canceled});
    }

    this.cleanup();
  }
  protected handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && !event.isComposing) {
      event.preventDefault();
      this.handleCancel(event);
    }
  }

  protected handleStart(source: Draggable, event: PointerEvent) {
    const {manager, initialCoordinates} = this;

    if (!initialCoordinates || !manager.dragOperation.status.idle) {
      return;
    }

    if (event.defaultPrevented) {
      return;
    }

    const controller = manager.actions.start({
      coordinates: initialCoordinates,
      event,
      source,
    });

    if (controller.signal.aborted) return this.cleanup();

    // Programmatic cancellation must release sensor resources immediately.
    const release = () => this.cleanup();
    controller.signal.addEventListener('abort', release, {once: true});
    this.#cleanup.add(() => controller.signal.removeEventListener('abort', release));

    event.preventDefault();

    const ownerDocument = getDocument(event.target);
    const pointerCaptureTarget = ownerDocument.body;

    try {
      pointerCaptureTarget.setPointerCapture(event.pointerId);
      this.captureTarget = pointerCaptureTarget;
    } catch {
      this.handleCancel(event);
      return;
    }

    this.#cleanup.add(this.listeners.bind(pointerCaptureTarget, {
      type: 'lostpointercapture',
      listener: (event) => {
        // Transferring implicit touch capture from the source bubbles a loss
        // event through body. Only loss of our own capture cancels the drag.
        if (event.target === pointerCaptureTarget) this.handleCancel(event);
      },
    }));

    const listenerTargets = isElement(event.target)
      ? [event.target, pointerCaptureTarget]
      : pointerCaptureTarget;

    const unbind = this.listeners.bind(listenerTargets, [
      {
        // Prevent scrolling on touch devices
        type: 'touchmove',
        listener: preventDefault,
        options: {
          passive: false,
        },
      },
      {
        // Prevent click events
        type: 'click',
        listener: preventDefault,
      },
      {
        type: 'contextmenu',
        listener: preventDefault,
      },
      {
        type: 'keydown',
        listener: this.handleKeyDown,
      },
    ]);

    this.#cleanup.add(unbind);

    // Flush the latest coordinates once the drag operation starts,
    // in case pointer moves were recorded while it was initializing.
    manager.renderer.rendering.then(() => {
      if (!controller.signal.aborted && manager.dragOperation.status.dragging) {
        scheduler.schedule(this.handleMove);
      }
    });
  }

  protected handleCancel(event: Event) {
    if (isPointerEvent(event) && event.pointerId !== this.pointerId) return;
    this.cancel(event);
  }

  /** Cancel pending activation as well as an active interaction owned by this sensor. */
  public cancel(event?: Event) {
    try {
      if (this.source && !this.manager.dragOperation.status.idle) {
        this.manager.actions.stop({event, canceled: true});
      }
    } finally {
      this.cleanup();
    }
  }

  protected cleanup() {
    const {controller, captureTarget, pointerId} = this;
    this.controller = undefined;
    this.source = undefined;
    this.captureTarget = undefined;
    this.pointerId = undefined;

    if (controller) {
      try {
        if (!controller.signal.aborted) controller.abort();
      } finally {
        // Do not retain the initiating pointer event through a completed signal.
        controller.signal.onabort = null;
      }
    }

    this.latest = {
      event: undefined,
      coordinates: undefined,
    };
    this.#cleanup.forEach((cleanup) => cleanup());
    this.#cleanup.clear();
    if (captureTarget && pointerId !== undefined) {
      try {
        if (captureTarget.hasPointerCapture(pointerId)) {
          captureTarget.releasePointerCapture(pointerId);
        }
      } catch {
        // The browser may already have released capture when the node detached.
      }
    }
  }

  public destroy() {
    this.cleanup();
    this.listeners.clear();
  }

  static configure = configurator(PointerSensor);

  static defaults = defaults;
}

function isCapturedBySensor(event: Event) {
  return 'sensor' in event;
}

function preventDefault(event: Event) {
  event.preventDefault();
}

function noop() {}

// Retain the non-passive touch listener while bindings need it (including
// bindings from other managers), then release it when the last binding ends.
const windows = new WeakMap<Window, number>();

function patchWindow(window: Window | null): CleanupFunction {
  if (!window) return noop;
  const count = windows.get(window) ?? 0;
  if (count === 0) {
    window.addEventListener('touchmove', noop, {capture: false, passive: false});
  }
  windows.set(window, count + 1);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const remaining = (windows.get(window) ?? 1) - 1;
    if (remaining > 0) windows.set(window, remaining);
    else {
      windows.delete(window);
      window.removeEventListener('touchmove', noop, false);
    }
  };
}
