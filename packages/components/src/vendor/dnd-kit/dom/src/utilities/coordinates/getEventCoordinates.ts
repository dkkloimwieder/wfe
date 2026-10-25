import {type Coordinates} from '../../../../geometry/src/index.ts';

export function getEventCoordinates(event: PointerEvent): Coordinates {
  return {
    x: event.clientX,
    y: event.clientY,
  };
}
