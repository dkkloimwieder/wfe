import { Tree } from '@wfe/components/tree'
import { TablePagination } from '@wfe/components/table'
import { SidebarGroup } from '@wfe/components/layout'
import { TableExample } from '../shared/controls/Recipes'
import { actionStates, interactiveStates, specimen } from './variant-types'

const noop = () => {}

export const additionalSpecimens = [
  specimen(
    'sidebar-group/items',
    'SidebarGroup / items',
    [...actionStates, 'selected'],
    (state) => (
      <SidebarGroup
        label="Records"
        open
        compact={false}
        onOpenChange={noop}
        onExpand={noop}
      >
        {() => (
          <a
            href="#variants"
            aria-current={state === 'selected' ? 'page' : undefined}
            aria-disabled={state === 'disabled' ? 'true' : undefined}
            tabindex={state === 'disabled' ? -1 : undefined}
            onClick={(event) => event.preventDefault()}
          >
            All records
          </a>
        )}
      </SidebarGroup>
    ),
  ),
  specimen('table/header', 'Table / header actions', interactiveStates, () => (
    <TableExample />
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
  specimen(
    'tree/items',
    'Tree / items',
    [...actionStates, 'selected', 'open'],
    (state) => (
      <Tree
        label="Folders"
        nodes={[
          {
            id: 'records',
            label: 'Records',
            disabled: state === 'disabled',
            children: [{ id: 'reviews', label: 'Reviews' }],
          },
          { id: 'archive', label: 'Archive' },
        ]}
        selected={state === 'selected' ? ['records'] : []}
        expanded={state === 'open' ? ['records'] : []}
        onSelectionChange={noop}
        onExpandedChange={noop}
      />
    ),
  ),
]
