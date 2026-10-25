import {ActivationConstraint} from '../../../../../abstract/src/core/index.ts';
import {
  exceedsDistance,
  type Distance,
  type Coordinates,
} from '../../../../../geometry/src/index.ts';
import {getEventCoordinates} from '../../../utilities/index.ts';

export interface DelayConstraintOptions {
  value: number;
  tolerance: Distance;
}

export class DelayConstraint extends ActivationConstraint<
  PointerEvent,
  DelayConstraintOptions
> {
  #timeout?: ReturnType<typeof setTimeout>;
  #coordinates?: Coordinates;

  onEvent(event: PointerEvent) {
    switch (event.type) {
      case 'pointerdown':
        this.#coordinates = getEventCoordinates(event);
        this.#timeout = setTimeout(
          () => this.activate(event),
          this.options.value
        );
        break;
      case 'pointermove':
        if (!this.#coordinates) return;

        const {x, y} = getEventCoordinates(event);
        const delta = {
          x: x - this.#coordinates.x,
          y: y - this.#coordinates.y,
        };

        if (exceedsDistance(delta, this.options.tolerance)) {
          this.abort();
        }
        break;
      case 'pointerup':
        this.abort();
        break;
    }
  }

  abort() {
    if (this.#timeout) {
      clearTimeout(this.#timeout);
      this.#coordinates = undefined;
      this.#timeout = undefined;
    }
  }
}
