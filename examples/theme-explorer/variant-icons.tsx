import {
  DragHandle,
  Icon,
  IconButton,
  createDragDrop,
  createDraggable,
} from '@wfe/components'
import type { IconName } from '@wfe/components'
import { TablePagination } from '@wfe/components/table'
import type { ColorRole } from '@wfe/components/theme'
import { buttonVariants } from './variant-button-matrix'
import {
  actionStates,
  roleSpecimens,
  specimen,
  type State,
} from './variant-types'

const noop = () => {}

// Record makes additions to the public IconName union a type error here.
const icons: Record<IconName, true> = {
  form: true,
  grid: true,
  navigation: true,
  layout: true,
  check: true,
  view: true,
  people: true,
  key: true,
  minus: true,
  cross: true,
  'chevron-down': true,
  'chevron-right': true,
  'chevron-left': true,
  refresh: true,
  controls: true,
  filter: true,
  calendar: true,
}

function DragHandleSample(props: {
  state?: State
  tone?: ColorRole
  label: string
}) {
  const disabled = () => props.state === 'disabled'
  const drag = createDraggable(createDragDrop(), {
    id: 'record',
    label: props.label,
    data: null,
    get disabled() {
      return disabled()
    },
  })
  return (
    <div ref={(node) => drag.ref(node)}>
      <DragHandle
        drag={drag}
        disabled={disabled()}
        label="Move record"
        tone={props.tone}
      />
    </div>
  )
}

export const specimens = [
  ...buttonVariants('icon', (appearance, disabled) => (
    <IconButton {...appearance} disabled={disabled} aria-label="Refresh">
      <Icon name="refresh" />
    </IconButton>
  )),
  ...(Object.keys(icons) as IconName[]).flatMap((name) => [
    specimen(
      `icon/${name}/standalone`,
      `Icon / ${name} / standalone`,
      ['rest'],
      () => <Icon name={name} />,
    ),
    specimen(
      `icon/${name}/button`,
      `Icon / ${name} / in button`,
      actionStates,
      (state) => (
        <IconButton aria-label={name} disabled={state === 'disabled'}>
          <Icon name={name} />
        </IconButton>
      ),
    ),
  ]),
  specimen('drag-handle/default', 'DragHandle', actionStates, (state) => (
    <DragHandleSample state={state} label="Sample record" />
  )),
  ...roleSpecimens('drag-handle/tone', 'DragHandle', (tone) => (
    <DragHandleSample tone={tone} label="Record" />
  )),
  specimen(
    'table/pagination',
    'Table / pagination actions',
    actionStates,
    (state) => (
      <TablePagination
        hasPrevious
        hasNext
        pending={state === 'disabled'}
        status="Page 2 of 3"
        onPrevious={noop}
        onNext={noop}
      />
    ),
  ),
]
