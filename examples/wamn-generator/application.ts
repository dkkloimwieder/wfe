import { createSignal, onCleanup } from 'solid-js'
import { createForm } from '@wfe/form'
import { createTable } from '@wfe/components/table'
import type { NativeColumnDef } from '@wfe/components/table'
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
  const [selectedId, setSelectedId] = createSignal(firstId)
  const [inspectedId, setInspectedId] = createSignal(firstId)
  const [inspectedRecord, setInspectedRecord] = createSignal<
    WidgetQueryRow | undefined
  >(undefined)
  const current = () => rows()[selectedId()]!
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
    initialState: {
      columnOrder: initialProjection.columnOrder,
      columnPinning: { start: [], end: ['actions'] },
    },
    source: { ids: () => Object.keys(rows()), get: (id) => rows()[id]! },
    columns: [
      ...initialMetadata.columns.map<NativeColumnDef<WidgetQueryRow, never>>(
        (column) => ({
          id: column.id,
          accessorFn: (row) => row[column.id as keyof WidgetQueryRow],
          size:
            column.type === 'uuid'
              ? 278
              : column.type === 'timestamptz'
                ? 192
                : column.type === 'int64'
                  ? 136
                  : column.id === 'note'
                    ? 240
                    : 128,
          minSize: 96,
          maxSize: column.id === 'note' ? 960 : 640,
          sortFn:
            column.type === 'text' || column.type === 'timestamptz'
              ? (a, b) => String(a ?? '').localeCompare(String(b ?? ''))
              : undefined,
        }),
      ),
      {
        id: 'actions',
        accessorFn: () => undefined,
        size: 128,
        minSize: 128,
        maxSize: 128,
        enableResizing: false,
        enableHiding: false,
        enableGlobalFilter: false,
      },
    ],
  })
  function setVariant(name: string) {
    const next = project(metadata(name))
    table.setColumnOrder(next.columnOrder)
    setDescription(next)
  }
  function beginEdit(id: string) {
    if (!alive) return false
    if (!Object.hasOwn(rows(), id)) {
      setStatus('This record is no longer available')
      return false
    }
    if (id === selectedId()) return true
    if (form.dirty || form.pending) {
      setStatus('Save or cancel the draft before choosing another record')
      return false
    }
    readSequence++
    setBusy(false)
    form.cancel()
    setSelectedId(id)
    const row = rows()[id]!
    setValues({ code: row.code, note: row.note ?? '' })
    setStatus('Record selected for editing')
    return true
  }
  function beginInlineEdit(id: string) {
    if (!alive) return false
    if (form.dirty || form.pending) {
      setStatus('Save or cancel the existing draft before inline editing')
      return false
    }
    return beginEdit(id)
  }
  async function read(kind: 'refresh' | 'open', id = selectedId()) {
    if (!alive) return
    if (kind === 'refresh' && (form.dirty || form.pending)) {
      setStatus('Save or reset the draft before reading')
      return
    }
    const sequence = ++readSequence
    if (kind === 'open') {
      setInspectedId(id)
      setInspectedRecord(undefined)
      if (!Object.hasOwn(rows(), id)) {
        setBusy(false)
        setStatus('This record is no longer available')
        return
      }
      setStatus('Loading record')
    }
    setBusy(true)
    try {
      if (kind === 'open') {
        const outcome = await get(server.transport, [{ id }])
        if (!alive || sequence !== readSequence || inspectedId() !== id) return
        if (outcome.status !== 'completed') {
          setStatus(message(outcome))
          return
        }
        if (outcome.value.id !== id) {
          setStatus('WAMN adapter: read returned a different record')
          return
        }
        setInspectedRecord(outcome.value)
        setStatus(`Opened ${id}`)
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
          !fetched.some((row) => row.id === selectedId())
        ) {
          setStatus('WAMN adapter: invalid query identities or page size')
          return
        }
        setRows(Object.fromEntries(fetched.map((row) => [row.id, row])))
        const selected = fetched.find((row) => row.id === selectedId())!
        setValues({ code: selected.code, note: selected.note ?? '' })
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
    selectedId,
    beginEdit,
    beginInlineEdit,
    inspectedId,
    inspectedRecord,
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
    open: (id = selectedId()) => read('open', id),
    snapshot: () => ({
      lifecycle: { ...lifecycle },
      values: values(),
      selectedId: selectedId(),
      inspectedId: inspectedId(),
      inspectedRecord: inspectedRecord(),
      rows: Object.values(rows()),
      phase: form.phase,
      status: status(),
      busy: busy(),
      sent: server.sent.map((entry) => ({ ...entry, item: { ...entry.item } })),
    }),
  }
}
