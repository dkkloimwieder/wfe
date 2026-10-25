import {configurator, Plugin} from '../../../../../abstract/src/core/index.ts';
import {effect} from '../../../../../state/src/index.ts';
import type {CleanupFunction} from '../../../../../state/src/index.ts';
import type {Axis} from '../../../../../geometry/src/index.ts';

import type {DragDropManager} from '../../manager/index.ts';
import {Scroller} from './Scroller.ts';
import {scheduler} from '../../../utilities/scheduling/scheduler.ts';

export interface AutoScrollerOptions {
  /**
   * Base scroll speed multiplier. Higher values scroll faster.
   * @default 25
   */
  acceleration?: number;
  /**
   * Percentage of container dimensions that defines the scroll activation zone.
   * A single number applies to both axes. Use `{ x, y }` to set per-axis
   * thresholds. Set an axis to `0` to disable auto-scrolling on that axis.
   * @default { x: 0.2, y: 0.2 }
   */
  threshold?: number | Record<Axis, number>;
}

const AUTOSCROLL_INTERVAL = 10;

export class AutoScroller extends Plugin<DragDropManager, AutoScrollerOptions> {
  public destroy: CleanupFunction;

  constructor(manager: DragDropManager, options?: AutoScrollerOptions) {
    super(manager, options);

    const scroller = manager.registry.plugins.get(Scroller);

    if (!scroller) {
      throw new Error('AutoScroller plugin depends on Scroller plugin');
    }

    const dispose = effect(() => {
      if (this.disabled) {
        scroller.autoScrolling = false;
        return;
      }

      // We consume the position from the drag operation
      // so that this effect is run when the position changes
      const {position: _, status, controller} = manager.dragOperation;

      if (status.dragging && controller && !controller.signal.aborted) {
        const scrollOptions = {
          acceleration: this.options?.acceleration,
          threshold:
            typeof this.options?.threshold === 'number'
              ? {x: this.options.threshold, y: this.options.threshold}
              : this.options?.threshold,
        };

        const canScroll = scroller.scroll(undefined, scrollOptions);

        if (canScroll) {
          scroller.autoScrolling = true;
          let active = true;
          const interval = setInterval(
            () =>
              scheduler.schedule(() => {
                if (active && !controller.signal.aborted &&
                    manager.dragOperation.controller === controller && status.dragging) {
                  scroller.scroll(undefined, scrollOptions);
                }
              }),
            AUTOSCROLL_INTERVAL
          );

          return () => {
            active = false;
            clearInterval(interval);
          };
        } else {
          scroller.autoScrolling = false;
        }
      } else {
        scroller.autoScrolling = false;
      }

      return undefined;
    });
    this.destroy = () => {
      dispose();
      scroller.autoScrolling = false;
    };
  }

  static configure = configurator(AutoScroller);
}
