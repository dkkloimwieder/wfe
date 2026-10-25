import {reactive} from '../../../../../state/src/index.ts';
import {ScrollDirection as Direction} from '../../../utilities/index.ts';

const LOCKED = true;
const UNLOCKED = false;

export class ScrollLock {
  @reactive private accessor [Direction.Forward] = LOCKED;
  @reactive private accessor [Direction.Reverse] = LOCKED;

  public isLocked(direction?: Direction): boolean {
    if (direction === Direction.Idle) {
      return false;
    }

    if (direction == null) {
      return (
        this[Direction.Forward] === LOCKED && this[Direction.Reverse] === LOCKED
      );
    }

    return this[direction] === LOCKED;
  }

  public unlock(direction: Direction) {
    if (direction === Direction.Idle) {
      return;
    }

    this[direction] = UNLOCKED;
  }
}
