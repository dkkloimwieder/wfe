import {CollisionPriority, CollisionType} from '../../../abstract/src/core/index.ts';
import type {CollisionDetector} from '../../../abstract/src/core/index.ts';
import {Point} from '../../../geometry/src/index.ts';

/**
 * Returns the distance between the droppable shape and the drag operation coordinates.
 */
export const pointerDistance: CollisionDetector = (input) => {
  const {dragOperation, droppable} = input;
  const {position} = dragOperation;

  if (!droppable.shape) {
    return null;
  }

  const distance = Point.distance(droppable.shape.center, position.current);
  const value = 1 / distance;

  return {
    id: droppable.id,
    value,
    type: CollisionType.Collision,
    priority: CollisionPriority.Normal,
  };
};
