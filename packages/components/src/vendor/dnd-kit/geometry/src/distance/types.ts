import type {Axis, Coordinates} from '../types/index.ts';

export type Distance =
  | number
  | Coordinates
  | Pick<Coordinates, Axis.Horizontal>
  | Pick<Coordinates, Axis.Vertical>;
