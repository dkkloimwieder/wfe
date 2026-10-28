import { render } from '@solidjs/web'
import { Button } from '@wfe/components'
import { createDragDrop } from '@wfe/components/dnd'
import { moveSortableItem } from '@wfe/components/sortable'
import { KanbanBoard } from '@wfe/components/kanban'
import { Gantt } from '@wfe/components/gantt'
import { Command } from '@wfe/components/command'
import { Card } from '@wfe/components/display'
import { createNativeTable, Table } from '@wfe/components/table'
import { GridView } from '@wfe/generator'
import { ShellView } from '@wfe/shell'
import '@wfe/components/styles.css'

function Page() {
  const drag = createDragDrop()
  const columns = moveSortableItem([{ id: 'planned', items: ['one'] }], {
    itemId: 'one',
    source: { containerId: 'planned', index: 0 },
    destination: { containerId: 'planned', beforeId: null },
  })
  const table = createNativeTable<{ id: string }>({
    source: { ids: () => ['one'], get: (id) => ({ id }) },
    columns: [{ id: 'id', accessorKey: 'id', header: 'ID' }],
  })
  return (
    <Card>
      <Button onClick={() => drag.cancel()}>Built consumer</Button>
      <Command label="Commands" items={[{ id: 'home', label: 'Home' }]} />
      <KanbanBoard aria-label="Board">{columns.length} column</KanbanBoard>
      <Gantt
        rows={[{ id: 'one', label: 'One' }]}
        intervals={[
          {
            id: 'event',
            rowId: 'one',
            label: 'Event',
            start: new Date('2026-10-01T00:00:00Z'),
            end: new Date('2026-10-02T00:00:00Z'),
          },
        ]}
        range={{
          start: new Date('2026-10-01T00:00:00Z'),
          end: new Date('2026-10-08T00:00:00Z'),
        }}
      />
      <Table table={table} accessibleLabel="Records" />
      <GridView
        description={{
          id: 'permissions',
          rows: [{ id: 'reader', label: 'Reader' }],
          columns: [{ id: 'view', label: 'View' }],
        }}
        bindings={{ value: () => true, onValueChange: () => {} }}
      />
    </Card>
  )
}

const app = document.getElementById('app')
if (!app) throw new Error('Missing consumer mount element')
render(
  () => (
    <ShellView
      description={{
        id: 'consumer',
        audiences: [{ id: 'reader', label: 'Reader' }],
        routes: [{ id: 'home', label: 'Home', view: 'home' }],
      }}
      bindings={{
        audience: () => 'reader',
        route: () => 'home',
        href: () => '#home',
        views: { home: Page },
        onAudienceChange: () => {},
        onNavigate: () => {},
      }}
    />
  ),
  app,
)
