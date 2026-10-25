import {batch, signal, type Signal} from '../../../../../state/src/index.ts';
import {Plugin} from '../../../../../abstract/src/core/index.ts';
import {Axes} from '../../../../../geometry/src/index.ts';
import type {Coordinates} from '../../../../../geometry/src/index.ts';
import {ScrollDirection} from '../../../utilities/index.ts';

import type {DragDropManager} from '../../manager/index.ts';

import {ScrollLock} from './ScrollLock.ts';

const DIRECTIONS = [ScrollDirection.Forward, ScrollDirection.Reverse];

class ScrollIntent {
  public x = new ScrollLock();
  public y = new ScrollLock();

  public isLocked(): boolean {
    return this.x.isLocked() && this.y.isLocked();
  }
}

export class ScrollIntentTracker extends Plugin<DragDropManager> {
  private signal: Signal<ScrollIntent | null>;

  constructor(manager: DragDropManager) {
    super(manager);

    const scrollIntent = signal<ScrollIntent>(new ScrollIntent());
    let previousDelta: Coordinates | null = null;

    this.signal = scrollIntent;

    this.registerEffect(() => {
      const {status} = manager.dragOperation;

      if (!status.initialized) {
        previousDelta = null;
        scrollIntent.value = new ScrollIntent();
        return;
      }

      const {delta} = manager.dragOperation.position;

      if (previousDelta) {
        const directions = {
          x: getDirection(delta.x, previousDelta.x),
          y: getDirection(delta.y, previousDelta.y),
        };

        const intent = scrollIntent.peek();

        batch(() => {
          for (const axis of Axes) {
            for (const direction of DIRECTIONS) {
              if (directions[axis] === direction) {
                intent[axis].unlock(direction);
              }
            }
          }

          scrollIntent.value = intent;
        });
      }

      previousDelta = delta;
    });
  }

  get current(): ScrollIntent | null {
    return this.signal.peek();
  }
}

function getDirection(a: number, b: number): ScrollDirection {
  return Math.sign(a - b);
}
