import { createSignal, Show } from 'solid-js'
import { Button } from '@wfe/components'
import { TableColumnFilter, TableHeaderFilter } from '@wfe/components/table'
import type {
  TableColumnFilterConfig,
  TableFilterValue,
} from '@wfe/components/table'

/** Both placements share application-owned criteria; neither owns query translation. */
export function FilterContractControls() {
  const [kind, setKind] = createSignal<'select' | 'date-range'>('select')
  const [value, setValue] = createSignal<TableFilterValue>()
  const [mounted, setMounted] = createSignal(true)
  const config = (): TableColumnFilterConfig =>
    kind() === 'select'
      ? {
          kind: 'select',
          choices: [
            { value: 'a', label: 'Alpha' },
            { value: 'b', label: 'Beta' },
          ],
        }
      : { kind: 'date-range' }
  return (
    <section aria-label="Filter contract fixture">
      <Button
        onClick={() => {
          setValue(undefined)
          setKind('select')
        }}
      >
        Use choice filter
      </Button>
      <Button
        onClick={() => {
          setValue({ start: '2026-01-01' })
          setKind('date-range')
        }}
      >
        Use date filter
      </Button>
      <Button onClick={() => setMounted(false)}>Remove filter controls</Button>
      <output aria-label="Accepted criterion">
        {JSON.stringify(value() ?? null)}
      </output>
      <Show when={mounted()}>
        <div data-filter-placement="panel">
          <TableColumnFilter
            label="Criterion"
            clearLabel="Clear criterion"
            config={config()}
            value={value()}
            onValueChange={setValue}
          />
        </div>
        <div data-filter-placement="header">
          <TableHeaderFilter
            columnId="criterion"
            columnLabel="Criterion"
            label="Criterion"
            clearLabel="Clear criterion"
            config={config()}
            value={value()}
            onValueChange={setValue}
          />
        </div>
      </Show>
    </section>
  )
}
