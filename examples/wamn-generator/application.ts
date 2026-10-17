import { createSignal, onCleanup } from 'solid-js'
import { createForm } from '@wfe/form'
import { createTable } from '@wfe/components/table'
import { newRequestId, refusalSentence } from '../wamn/.input/runtime'
import { query, update, get } from '../wamn/.input/widget'
import type {
  WidgetQueryRow,
  WidgetUpdateRequestChange,
} from '../wamn/.input/widget'
import type { Outcome } from '../wamn/.input/runtime'
import { createFixtureServer, makeWidget } from '../wamn/transport'
import { metadata } from './metadata'
import { project } from './projection'
import type { Values } from './projection'

function message<T>(outcome: Outcome<T>): string {
  if (outcome.status === 'refused') return refusalSentence(outcome.code)
  if (outcome.status === 'uncertain') return outcome.reason
  return 'The operation did not return one complete result'
}
export function createApplication(name: string) {
  const server = createFixtureServer(2)
  const initialRows = [0, 1].map(makeWidget)
  const first = initialRows[0]!
  const initialMetadata = metadata(name)
  const initialProjection = project(initialMetadata)
  const [rows, setRows] = createSignal<
    Readonly<Record<string, WidgetQueryRow>>
  >(Object.fromEntries(initialRows.map((row) => [row.id, row])))
  const firstId = first.id
  const current = () => rows()[firstId]!
  const [values, setValues] = createSignal<Values>({
    code: first.code,
    note: first.note ?? '',
  })
  const [description, setDescription] = createSignal(initialProjection)
  const [status, setStatus] = createSignal('Prepared fixture records')
  const [busy, setBusy] = createSignal(false)
  const [controlsCollapsed, setControlsCollapsed] = createSignal(true)
  const lifecycle = { readsSettled: 0, writesSettled: 0, disposals: 0 }
  let alive = true
  let readSequence = 0
  onCleanup(() => {
    alive = false
    lifecycle.disposals++
    readSequence++
    server.dispose()
  })
  const form = createForm<Values>({
    values,
    defaults: () => ({ code: current().code, note: current().note ?? '' }),
    onValuesChange: (next) => {
      readSequence++
      setBusy(false)
      setValues({ ...next })
    },
    validate: (next) =>
      next.code !== 'priority' && next.code !== 'standard'
        ? { fields: { code: 'Use a supported widget code' } }
        : {},
    async onSubmit(next, context) {
      readSequence++
      setBusy(false)
      try {
        const row = current()
        const change = {
          code: next.code,
          note: next.note,
        } satisfies WidgetUpdateRequestChange
        const outcome = await update(server.transport, [
          {
            id: row.id,
            expectedEditVersion: row.editVersion,
            change,
            requestId: newRequestId(),
          },
        ])
        if (!alive || context.signal.aborted) return { ok: true }
        if (outcome.status !== 'completed')
          return { ok: false, errors: { form: message(outcome) } }
        if (outcome.value.id !== row.id)
          return {
            ok: false,
            errors: {
              form: 'WAMN adapter: update returned a different widget',
            },
          }
        setRows((old) => ({ ...old, [row.id]: outcome.value }))
        setStatus('Widget saved')
        return { ok: true }
      } finally {
        lifecycle.writesSettled++
      }
    },
  })
  const table = createTable<WidgetQueryRow, never>({
    initialState: { columnOrder: initialProjection.columnOrder },
    source: { ids: () => Object.keys(rows()), get: (id) => rows()[id]! },
    columns: initialMetadata.columns.map((column) => ({
      id: column.id,
      accessorFn: (row) => row[column.id as keyof WidgetQueryRow],
      size:
        column.type === 'uuid'
          ? 304
          : column.type === 'timestamptz'
            ? 224
            : column.type === 'int64'
              ? 176
              : column.id === 'note'
                ? 240
                : 136,
      minSize: 96,
      maxSize: column.id === 'note' ? 960 : 640,
      sortFn:
        column.type === 'text' || column.type === 'timestamptz'
          ? (a, b) => String(a ?? '').localeCompare(String(b ?? ''))
          : undefined,
    })),
  })
  function setVariant(name: string) {
    const next = project(metadata(name))
    table.setColumnOrder(next.columnOrder)
    setDescription(next)
  }
  async function read(kind: 'refresh' | 'open') {
    if (!alive) return
    if (form.dirty || form.pending) {
      setStatus('Save or reset the draft before reading')
      return
    }
    const sequence = ++readSequence
    setBusy(true)
    try {
      if (kind === 'open') {
        const outcome = await get(server.transport, [{ id: firstId }])
        if (alive && sequence === readSequence)
          setStatus(
            outcome.status === 'completed'
              ? `Opened ${outcome.value.id}: ${outcome.value.note ?? ''}`
              : message(outcome),
          )
      } else {
        const outcome = await query(server.transport, [{ limit: 2 }])
        if (!alive || sequence !== readSequence) return
        if (outcome.status !== 'completed') {
          setStatus(message(outcome))
          return
        }
        const fetched = outcome.value.item
        if (
          fetched.length > 2 ||
          new Set(fetched.map((row) => row.id)).size !== fetched.length ||
          !fetched.some((row) => row.id === firstId)
        ) {
          setStatus('WAMN adapter: invalid query identities or page size')
          return
        }
        setRows(Object.fromEntries(fetched.map((row) => [row.id, row])))
        const first = fetched.find((row) => row.id === firstId)!
        setValues({ code: first.code, note: first.note ?? '' })
        setStatus(
          outcome.value.nextCursor === null
            ? 'Widgets refreshed'
            : 'Widget preview is incomplete',
        )
      }
    } catch (error) {
      if (alive && sequence === readSequence) setStatus(String(error))
    } finally {
      lifecycle.readsSettled++
      if (alive && sequence === readSequence) setBusy(false)
    }
  }
  return {
    form,
    table,
    controlsCollapsed,
    setControlsCollapsed,
    description,
    values,
    rows,
    status,
    busy,
    server,
    setVariant,
    refresh: () => read('refresh'),
    open: () => read('open'),
    snapshot: () => ({
      lifecycle: { ...lifecycle },
      values: values(),
      rows: Object.values(rows()),
      phase: form.phase,
      status: status(),
      busy: busy(),
      sent: server.sent.map((entry) => ({ ...entry, item: { ...entry.item } })),
    }),
  }
}
