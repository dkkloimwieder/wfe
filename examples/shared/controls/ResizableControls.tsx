import { createSignal, flush } from 'solid-js'
import {
  Button,
  Field,
  Input,
  Label,
  Resizable,
  SelectField,
} from '@wfe/components'
import { TableWorkspace, Table, createTable } from '@wfe/components/table'
export const resizableLifecycle = {
  configure: (_next: {
    paneCollapsed?: boolean
    acceptCollapse?: boolean
    size?: number
    accept?: boolean
    disabled?: boolean
    orientation?: 'horizontal' | 'vertical'
    dir?: 'ltr' | 'rtl'
    placement?: 'left' | 'right' | 'top'
    collapsed?: boolean
    resizable?: boolean
  }) => {},
  read: () => ({
    requests: [] as number[],
    tableRequests: [] as number[],
    collapseRequests: [] as boolean[],
  }),
  stop: () => {},
}
export function ResizableControls() {
  const [paneCollapsed, setPaneCollapsed] = createSignal(false)
  let acceptCollapse = true
  const collapseRequests: boolean[] = []
  const [size, setSize] = createSignal(35)
  const [disabled, setDisabled] = createSignal(false)
  const [orientation, setOrientation] = createSignal<'horizontal' | 'vertical'>(
    'horizontal',
  )
  const [dir, setDir] = createSignal<'ltr' | 'rtl'>('ltr')
  const [placement, setPlacement] = createSignal<'left' | 'right' | 'top'>(
    'left',
  )
  const [collapsed, setCollapsed] = createSignal(false)
  const [resizable, setResizable] = createSignal(true)
  let accept = true
  const requests: number[] = []
  const tableRequests: number[] = []
  resizableLifecycle.configure = (next) => {
    if (next.paneCollapsed !== undefined) setPaneCollapsed(next.paneCollapsed)
    if (next.acceptCollapse !== undefined) acceptCollapse = next.acceptCollapse
    if (next.size !== undefined) setSize(next.size)
    if (next.accept !== undefined) accept = next.accept
    if (next.disabled !== undefined) setDisabled(next.disabled)
    if (next.orientation !== undefined) setOrientation(next.orientation)
    if (next.dir !== undefined) setDir(next.dir)
    if (next.placement !== undefined) setPlacement(next.placement)
    if (next.collapsed !== undefined) setCollapsed(next.collapsed)
    if (next.resizable !== undefined) setResizable(next.resizable)
    flush()
  }
  resizableLifecycle.read = () => ({
    collapseRequests: [...collapseRequests],
    requests: [...requests],
    tableRequests: [...tableRequests],
  })
  const ids = Array.from({ length: 30 }, (_, index) => String(index + 1))
  const table = createTable({
    source: { ids: () => ids, get: (id) => ({ id, name: `Record ${id}` }) },
    columns: [
      { id: 'id', accessorKey: 'id', header: 'ID' },
      { id: 'name', accessorKey: 'name', header: 'Name' },
    ],
  })
  return (
    <section data-resizable-review dir={dir()}>
      <p class="ui-help">
        Drag a divider or focus it and use the arrow keys. Home and End select
        its size limits. Double-click the divider or press Enter to close and
        reopen the pane.
      </p>
      <div class="resize-review-actions">
        <Button onClick={() => setDir(dir() === 'ltr' ? 'rtl' : 'ltr')}>
          {dir() === 'ltr' ? 'RTL' : 'LTR'}
        </Button>
        <Button
          onClick={() =>
            setOrientation(
              orientation() === 'horizontal' ? 'vertical' : 'horizontal',
            )
          }
        >
          Change orientation
        </Button>
      </div>
      <Resizable
        id="resizable-review"
        primaryLabel="Navigation"
        collapsed={paneCollapsed()}
        onCollapsedChange={(next) => {
          collapseRequests.push(next)
          if (acceptCollapse) setPaneCollapsed(next)
        }}
        secondaryLabel="Content"
        {...{ size: size(), disabled: disabled(), orientation: orientation() }}
        onSizeChange={(next) => {
          requests.push(next)
          if (accept) setSize(next)
        }}
        minSize={20}
        maxSize={80}
        primary={
          <>
            <Field controlId="resize-navigation">
              <Label>Navigation draft</Label>
              <Input
                id="resize-navigation"
                defaultValue="Retained navigation"
              />
            </Field>
            <SelectField
              label="Navigation choice"
              value="a"
              choices={[
                { value: 'a', label: 'Alpha' },
                { value: 'b', label: 'Beta' },
              ]}
              onValueChange={() => {}}
            />
          </>
        }
      >
        <Field controlId="resize-content">
          <Label>Content draft</Label>
          <Input id="resize-content" defaultValue="Retained content" />
        </Field>
      </Resizable>
      <div class="resize-review-actions">
        <Button onClick={() => setPlacement('left')}>Left controls</Button>
        <Button onClick={() => setPlacement('top')}>Top controls</Button>
        <Button onClick={() => setPlacement('right')}>Right controls</Button>
      </div>
      <TableWorkspace
        class="resize-review-workspace"
        style={{ height: '20rem' }}
        controlsPlacement={placement()}
        controlsCollapsed={collapsed()}
        onControlsCollapsedChange={setCollapsed}
        controlsResizable={resizable()}
        onControlsSizeChange={(next) => tableRequests.push(next)}
        resultsHeader="Records"
        footer="30 records"
        controls={
          <Field controlId="resize-table-filter">
            <Label>Criteria draft</Label>
            <Input id="resize-table-filter" defaultValue="Retained criteria" />
          </Field>
        }
      >
        <div class="table-scroll">
          <Table table={table} />
        </div>
      </TableWorkspace>
      <Button id="resize-outside">Outside panes</Button>
    </section>
  )
}
declare global {
  interface Window {
    resizableFixture: typeof resizableLifecycle
  }
}
