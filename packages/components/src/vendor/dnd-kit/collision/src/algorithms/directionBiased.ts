import {CollisionPriority, CollisionType} from '../../../abstract/src/core/index.ts';
import type {CollisionDetector} from '../../../abstract/src/core/index.ts';
import {Point} from '../../../geometry/src/index.ts';

import {defaultCollisionDetection} from './default.ts';

export const directionBiased: CollisionDetector = ({
  dragOperation,
  droppable,
}) => {
  if (!droppable.shape) {
    return null;
  }

  const {position, shape} = dragOperation;
  const {direction} = position;

  if (!shape) {
    return null;
  }

  if (direction === null) {
    return defaultCollisionDetection({dragOperation, droppable});
  }

  const {center} = shape.current;
  const rect = droppable.shape.boundingRectangle;
  const isBelow = rect.bottom >= center.y;
  const isAbove = rect.top <= center.y;
  const isLeft = rect.left <= center.x;
  const isRight = rect.right >= center.x;

  if (
    (direction === 'down' && isBelow) ||
    (direction === 'up' && isAbove) ||
    (direction === 'left' && isLeft) ||
    (direction === 'right' && isRight)
  ) {
    const distance = Point.distance(droppable.shape.center, center);
    const value = distance === 0 ? 1 : 1 / distance;

    return {
      id: droppable.id,
      value,
      type: CollisionType.Collision,
      priority: CollisionPriority.Normal,
    };
  }

  return null;
};
