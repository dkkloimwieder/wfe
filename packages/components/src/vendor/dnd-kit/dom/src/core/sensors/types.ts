import type {Sensors as AbstractSensors} from '../../../../abstract/src/core/index.ts';

import type {DragDropManager} from '../manager/index.ts';

export type Sensors = AbstractSensors<DragDropManager>;
