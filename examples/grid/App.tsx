import { createMemo, createSignal, onCleanup } from 'solid-js'
import { GridView } from '@wfe/generator'
import type { GridCellChange, GridDescription } from '@wfe/generator'
import { DefaultAppearance } from '../shared/appearance/DefaultAppearance'
import './style.css'

const initial: GridDescription = {
  id: 'capabilities',
  title: 'Record capabilities',
  rows: Array.from({ length: 30 }, (_, index) => ({
    id: `r${index + 1}`,
    label: `Record ${String(index + 1).padStart(2, '0')}`,
    disabled: index === 29,
  })),
  columns: [
    { id: 'read', label: 'Read' },
    { id: 'write', label: 'Write' },
    { id: 'review', label: 'Review' },
    { id: 'export', label: 'Export' },
    { id: 'verified', label: 'Verified', readOnly: true },
  ],
}
const cellKey = (row: string, column: string) => JSON.stringify([row, column])
export type GridFixture = {
  requests: () => readonly GridCellChange[]
  value: (row: string, column: string) => boolean
  reject: (next: boolean) => void
  setCell: (row: string, column: string, value: boolean) => void
  reorder: () => void
  relabel: () => void
}
export function App(props: { ready?: (api: GridFixture) => void }) {
  const [description, setDescription] = createSignal(initial)
  const [values, setValues] = createSignal<ReadonlyMap<string, boolean>>(
    new Map(
      initial.rows.flatMap((row, r) =>
        initial.columns.map(
          (column, c) =>
            [cellKey(row.id, column.id), (r + c) % 3 === 0] as const,
        ),
      ),
    ),
  )
  const [requests, setRequests] = createSignal<readonly GridCellChange[]>([])
  const [accepted, setAccepted] = createSignal(0)
  let rejected = false
  let alive = true
  const value = (row: string, column: string) =>
    values().get(cellKey(row, column))!
  const setCell = (row: string, column: string, next: boolean) => {
    if (!alive) return
    setValues((old) => new Map(old).set(cellKey(row, column), next))
  }
  const change = (requested: GridCellChange) => {
    setRequests((old) => [...old, requested])
    if (rejected) return
    setCell(requested.row, requested.column, requested.value)
    setAccepted((old) => old + 1)
  }
  const latest = createMemo(() => {
    const last = requests().at(-1)
    if (!last) return 'No changes requested.'
    const row = description().rows.find((entry) => entry.id === last.row)!
    const column = description().columns.find(
      (entry) => entry.id === last.column,
    )!
    return `${row.label} / ${column.label}: ${last.value ? 'Yes' : 'No'}`
  })
  props.ready?.({
    requests,
    value,
    setCell,
    reject: (next) => {
      rejected = next
    },
    reorder: () => {
      if (alive)
        setDescription((old) => ({
          ...old,
          rows: [...old.rows].reverse(),
          columns: [...old.columns].reverse(),
        }))
    },
    relabel: () => {
      if (alive)
        setDescription((old) => ({
          ...old,
          rows: old.rows.map((row) =>
            row.id === 'r1' ? { ...row, label: 'Renamed record' } : row,
          ),
          columns: old.columns.map((column) =>
            column.id === 'write' ? { ...column, label: 'Edit' } : column,
          ),
        }))
    },
  })
  onCleanup(() => {
    alive = false
  })
  return (
    <DefaultAppearance class="grid-example">
      <header class="grid-example-header">
        <h1 data-ui-text="system">Boolean grid</h1>
        <p>
          Verified is read-only. Record 30 is disabled. Changes stay in this
          example’s memory.
        </p>
      </header>
      <GridView
        description={description()}
        bindings={{ value, onValueChange: change }}
      />
      <footer class="grid-example-footer">
        <span data-ui-text="system">Changes {accepted()}</span>
        <output aria-label="Latest change">{latest()}</output>
      </footer>
    </DefaultAppearance>
  )
}
