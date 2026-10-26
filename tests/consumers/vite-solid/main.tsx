import { render } from '@solidjs/web'
import { Button } from '@wfe/components'
import { Card } from '@wfe/components/display'
import { createNativeTable, Table } from '@wfe/components/table'
import { GridView } from '@wfe/generator'
import { ShellView } from '@wfe/shell'
import '@wfe/components/styles.css'

function Page() {
  const table = createNativeTable<{ id: string }>({
    source: { ids: () => ['one'], get: (id) => ({ id }) },
    columns: [{ id: 'id', accessorKey: 'id', header: 'ID' }],
  })
  return (
    <Card>
      <Button>Built consumer</Button>
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
