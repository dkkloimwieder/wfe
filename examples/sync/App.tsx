import {
  Errored,
  For,
  Loading,
  Show,
  createMemo,
  createSignal,
  onCleanup,
  untrack,
} from 'solid-js'
import { Button, Field, Input, Label } from '@wfe/components'
import { ReadOnlyTable, TableRow, createTable } from '@wfe/components/table'
import { VirtualRows, createTableVirtualizer } from '@wfe/components/virtual'
import {
  collection,
  liveList,
  liveRows,
  outbox,
  outboxStatus,
  recordWrite,
  shell,
  syncStatus,
  syncComplete,
} from '@wfe/sync'
import type { Outbox, ShellResult } from '@wfe/sync'
import { applyChanges } from '@wfe/sync/internal'
import { DefaultAppearance } from '../shared/appearance/DefaultAppearance'
import { fakeServer, randomChanges, uuidv7 } from './fake'
import { indexedPersistence } from './persistence'
import type { CreateRequest, Order, Scope } from './fake'
import './style.css'

type Store = ReturnType<typeof collection<Order, Scope>>
type Server = ReturnType<typeof fakeServer>
const sizes = [10_000, 100_000]
const limit = 200
// The gallery names the databases; the package never does.
const persistence = indexedPersistence('wfe-sync-gallery-rows')

export function App() {
  // A new worker waits: the page offers a reload and never reloads alone.
  const [update, setUpdate] = createSignal<() => void>()
  const [result, setResult] = createSignal<ShellResult>()
  void shell({
    workerUrl: `${import.meta.env.BASE_URL}sw.js`,
    onUpdate: (reload) => setUpdate(() => reload),
  }).then(setResult)
  const [online, setOnline] = createSignal(navigator.onLine)
  const network = () => setOnline(navigator.onLine)
  window.addEventListener('online', network)
  window.addEventListener('offline', network)
  onCleanup(() => {
    window.removeEventListener('online', network)
    window.removeEventListener('offline', network)
  })
  const [size, setSize] = createSignal(sizes[0]!)
  const [applied, setApplied] = createSignal(0)
  const [served, setServed] = createSignal(0)
  const source = createMemo(() => {
    const server = fakeServer(size())
    // A page loaded with no network cannot reach the server. The saved rows
    // then fill the collection, and the next online event reads again.
    server.net.reachable = navigator.onLine
    const key = `orders:${size()}`
    const c = collection(
      server.feed,
      { size: size() },
      { key, trigger: server.trigger, persistence },
    )
    const reach = () => {
      if (server.net.reachable) return
      server.net.reachable = true
      void c.utils.refill()
    }
    window.addEventListener('online', reach)
    const o = outbox({
      database: `wfe-sync-gallery:${size()}`,
      send: server.send,
      probe: server.probe,
    })
    onCleanup(() => {
      window.removeEventListener('online', reach)
      o.close()
      queueMicrotask(() => void c.cleanup())
    })
    return { server, key, c, o }
  })
  const store = () => source().c
  const apply = () => {
    const c = store()
    applyChanges(c, randomChanges(c.toArray))
    setApplied((count) => count + 1)
  }
  const serve = () => {
    const { server, key } = source()
    server.change(key)
    setServed((count) => count + 1)
  }
  return (
    <DefaultAppearance class="sync-example">
      <header class="sync-controls">
        <h1 class="sync-title" data-ui-text="system">
          Sync store
        </h1>
        <div class="sync-buttons" role="group" aria-label="Row count">
          <For each={sizes}>
            {(count) => (
              <Button
                variant={size() === count ? 'filled' : 'outline'}
                aria-pressed={size() === count ? 'true' : 'false'}
                onClick={() => {
                  setSize(count)
                  setApplied(0)
                  setServed(0)
                }}
              >
                {count.toLocaleString('en-US')} rows
              </Button>
            )}
          </For>
          <Button onClick={apply}>Apply 100 changes</Button>
          <span data-sync-applied={applied()}>{applied()} batches applied</span>
          <Button onClick={serve}>Change on the server</Button>
          <span data-sync-served={served()}>{served()} server batches</span>
          <Button
            onClick={() => {
              const { server, c } = source()
              server.listing.cap = 100
              void c.utils.refill()
            }}
          >
            Refill with a 100-row cap
          </Button>
          <Button
            onClick={() => {
              const { server, c } = source()
              delete server.listing.cap
              void c.utils.refill()
            }}
          >
            Refill without a cap
          </Button>
          <Show when={update()}>
            {(reload) => (
              <Button
                variant="filled"
                data-sync-update
                onClick={() => reload()()}
              >
                Update available, reload
              </Button>
            )}
          </Show>
        </div>
      </header>
      <section class="sync-shell" aria-labelledby="sync-shell-title">
        <h2 id="sync-shell-title" data-ui-text="system">
          Shell
        </h2>
        <p
          data-sync-shell={result() ? 'ready' : 'waiting'}
          data-sync-worker={String(result()?.worker ?? '')}
          data-sync-persisted={String(result()?.persisted ?? '')}
          data-sync-quota={result()?.quota.quota ?? ''}
        >
          <Show when={result()} fallback="Preparing the shell">
            {(shown) => (
              <>
                Offline shell: {shown().worker ? 'installed' : 'unavailable'}
                {' · '}Storage:{' '}
                {shown().persisted ? 'protected' : 'not protected'}
                {' · '}
                {megabytes(shown().quota.usage)} of{' '}
                {megabytes(shown().quota.quota)} used
              </>
            )}
          </Show>
        </p>
        <p class="sync-buttons">
          <span data-sync-online={String(online())}>
            Network: {online() ? 'online' : 'offline'}
          </span>
          <Button onClick={() => location.reload()}>Reload page</Button>
          <span>
            With the network off, a reload renders the page from the worker
            cache and the rows from this device.
          </span>
        </p>
      </section>
      <Show when={source()} keyed>
        {(current) => (
          <>
            <Writes
              store={current.c}
              outbox={current.o}
              server={current.server}
            />
            <Shapes store={current.c} />
          </>
        )}
      </Show>
    </DefaultAppearance>
  )
}

function Shapes(props: { store: Store }) {
  const rows = liveRows(props.store)
  const list = liveList(props.store)
  const status = syncStatus(props.store)
  const complete = syncComplete(props.store)
  const ids = createMemo(() => Object.keys(rows))
  const shownIds = createMemo(() => ids().slice(0, limit))
  // Every batch inserts and deletes rows, so the key list changes. Count the
  // updated rows untracked to keep this memo on one source.
  const updated = createMemo(() => {
    const keys = ids()
    return untrack(() => keys.filter((id) => rows[id]!.row_version > 1).length)
  })
  const shown = createMemo(() => list.slice(0, limit))
  // currentAt is a plain read. Each batch changes the key list, so read it
  // again then.
  const currentAt = createMemo(() => {
    ids()
    status()
    return untrack(() => props.store.utils.currentAt()) ?? ''
  })
  // The last failed read, such as a list with no network. Saved rows stay.
  const failure = createMemo(() => {
    ids()
    status()
    const error = untrack(() => props.store.utils.error())
    return error === undefined ? '' : String((error as Error).message ?? error)
  })
  return (
    <main class="sync-shapes">
      <p class="sync-status">
        Status:{' '}
        <output
          data-sync-status={status()}
          data-sync-complete={String(complete())}
        >
          {status()}
          <Show when={!complete()}> · partial: stopped at the cap</Show>
        </output>
        {' · '}Current as of{' '}
        <output data-sync-current-at={currentAt()}>
          {currentAt() || 'not yet'}
        </output>
        <Show when={failure()}>
          {' · '}Last read failed:{' '}
          <output data-sync-error={failure()}>{failure()}</output>
        </Show>
      </p>
      <section class="sync-shape" aria-labelledby="sync-rows-title">
        <h2 id="sync-rows-title" data-ui-text="system">
          liveRows
        </h2>
        <p>
          <span data-sync-rows={ids().length} data-sync-updated={updated()}>
            {ids().length.toLocaleString('en-US')}
          </span>{' '}
          rows in a plain table, first {limit} shown
        </p>
        <div class="sync-scroll">
          <table class="sync-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>Version</th>
              </tr>
            </thead>
            <tbody>
              <For each={shownIds()}>
                {(id) => (
                  <tr>
                    <td>{rows[id]?.name}</td>
                    <td>{rows[id]?.quantity}</td>
                    <td>{rows[id]?.status}</td>
                    <td>{rows[id]?.row_version}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </section>
      <section class="sync-shape" aria-labelledby="sync-list-title">
        <h2 id="sync-list-title" data-ui-text="system">
          liveList
        </h2>
        <Errored
          fallback={(error) => (
            <p data-sync-failed>
              The first page failed: {String((error() as Error).message)}
            </p>
          )}
        >
          <Loading fallback={<p>Loading the first page</p>}>
            <p>
              <span data-sync-list={list.length}>
                {list.length.toLocaleString('en-US')}
              </span>{' '}
              rows, first {limit} shown
            </p>
            <div class="sync-scroll">
              <ol class="sync-list">
                <For each={shown()}>
                  {(row) => (
                    <li>
                      {row.name} · {row.quantity} · {row.status} · v
                      {row.row_version}
                    </li>
                  )}
                </For>
              </ol>
            </div>
          </Loading>
        </Errored>
      </section>
      <VirtualTable rows={rows} ids={ids} />
    </main>
  )
}

/** A byte count in megabytes, one decimal. */
function megabytes(bytes: number): string {
  return `${(bytes / 1_048_576).toFixed(1)} MB`
}

/** Row height of the virtual table, in pixels. */
const rowHeight = 32

/**
 * ReadOnlyTable over the liveRows store, with virtual rows through its body
 * slot. The header and sorting stay with ReadOnlyTable; the slot renders only
 * the rows in the scroll window.
 */
function VirtualTable(props: {
  rows: Record<string, Order>
  ids: () => string[]
}) {
  const table = createTable<Order>({
    source: {
      ids: () => props.ids(),
      get: (id) => props.rows[id],
    },
    columns: [
      { id: 'name', header: 'Name', accessorKey: 'name' },
      { id: 'quantity', header: 'Quantity', accessorKey: 'quantity' },
      { id: 'status', header: 'Status', accessorKey: 'status' },
      { id: 'row_version', header: 'Version', accessorKey: 'row_version' },
    ],
  })
  let frame: HTMLDivElement | undefined
  const viewport = () =>
    frame?.querySelector<HTMLElement>('.table-scroll') ?? null
  const virtualizer = createTableVirtualizer<string>({
    mode: 'fixed',
    get count() {
      return table.getRowIds().length
    },
    rowHeight,
    getItemKey: (index) => untrack(() => table.getRowIds()[index]!),
    getIndexForKey: (key) => untrack(() => table.getRowIds().indexOf(key)),
    getScrollElement: viewport,
    get scrollMargin() {
      return viewport()?.querySelector('thead')?.offsetHeight ?? 0
    },
    observeElements: () =>
      Array.from(viewport()?.querySelectorAll('thead') ?? []),
  })
  return (
    <section class="sync-shape" aria-labelledby="sync-virtual-title">
      <h2 id="sync-virtual-title" data-ui-text="system">
        ReadOnlyTable with virtual rows
      </h2>
      <div
        class="sync-virtual"
        data-sync-virtual={table.getRowIds().length}
        ref={(node) => {
          frame = node
        }}
      >
        <ReadOnlyTable
          table={table}
          title="Virtual orders"
          controlsEnabled={false}
          renderBody={() => (
            <VirtualRows
              window={virtualizer}
              layout="table"
              columns={() => table.getVisibleColumns().length}
              renderRow={(id) => <TableRow table={table} id={id} />}
            />
          )}
        />
      </div>
    </section>
  )
}

/** The consumer computes the request hash: SHA-256 of the request JSON. */
async function hashOf(request: CreateRequest): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(request))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function Writes(props: { store: Store; outbox: Outbox; server: Server }) {
  const record = recordWrite(props.store, props.outbox)
  const counts = outboxStatus(props.outbox)
  const [name, setName] = createSignal('')
  const [written, setWritten] = createSignal<string[]>([])
  const [offline, setOffline] = createSignal(false)
  const [armed, setArmed] = createSignal(false)
  // The entries are a plain read. Each change moves the counts, so read them
  // again then.
  const entries = createMemo(() => {
    counts()
    return untrack(() => props.outbox.entries())
  })
  const refused = createMemo(() =>
    entries().filter((entry) => entry.state === 'refused'),
  )
  const states = createMemo(
    () => new Map(entries().map((entry) => [entry.expect.id, entry.state])),
  )
  const add = async (event: SubmitEvent) => {
    event.preventDefault()
    const id = uuidv7()
    const request = { id, name: name() || 'New order', quantity: 1 }
    setName('')
    setWritten((list) => [id, ...list])
    const request_hash = await hashOf(request)
    // A refusal or a discard rejects the write; the refused list shows it.
    void record
      .write(
        {
          operation: 'orders.create',
          request,
          request_hash,
          expect: { model: 'orders', id },
          append_only: true,
        },
        {
          id,
          row_version: 0,
          name: request.name,
          quantity: request.quantity,
          status: 'open',
          updated_at: new Date().toISOString(),
        },
      )
      .catch(() => undefined)
  }
  const toggleOffline = () => {
    const next = !offline()
    props.server.net.online = !next
    setOffline(next)
    if (!next) void props.outbox.replay()
  }
  const armRefusal = () => {
    props.server.net.refuseNext = true
    setArmed(true)
  }
  // The server disarms itself on the next send.
  const refuseArmed = createMemo(() => {
    counts()
    return armed() && untrack(() => props.server.net.refuseNext)
  })
  return (
    <section class="sync-writes" aria-labelledby="sync-writes-title">
      <h2 id="sync-writes-title" data-ui-text="system">
        recordWrite
      </h2>
      <form class="sync-buttons" onSubmit={add}>
        <Field controlId="sync-add-name">
          <Label>Order name</Label>
          <Input
            id="sync-add-name"
            value={name()}
            onInput={(event) => setName(event.currentTarget.value)}
          />
        </Field>
        <Button type="submit">Add row</Button>
        <Button
          variant={offline() ? 'filled' : 'outline'}
          aria-pressed={offline() ? 'true' : 'false'}
          onClick={toggleOffline}
        >
          Offline
        </Button>
        <Button
          variant={refuseArmed() ? 'filled' : 'outline'}
          aria-pressed={refuseArmed() ? 'true' : 'false'}
          onClick={armRefusal}
        >
          Refuse next send
        </Button>
      </form>
      <p class="sync-status">
        <output
          data-sync-pending={counts().pending}
          data-sync-refused={counts().refused}
          data-sync-last-sent={counts().lastSentAt ?? ''}
        >
          {counts().pending} pending · {counts().refused} refused · last sent{' '}
          {counts().lastSentAt ?? 'never'}
        </output>
      </p>
      <ul class="sync-written">
        <For each={written()}>
          {(id) => (
            <li
              data-sync-written={id}
              data-sync-state={states().get(id) ?? 'sent'}
              data-sync-version={record.rows[id]?.row_version ?? ''}
            >
              {record.rows[id]?.name ?? 'Not in the collection'}
              {record.rows[id] ? ` · v${record.rows[id]!.row_version}` : ''}
              {states().get(id) === 'pending'
                ? ' · recorded, not uploaded'
                : ''}
            </li>
          )}
        </For>
      </ul>
      <Show when={refused().length > 0}>
        <h3 data-ui-text="system">Not uploaded</h3>
        <ul class="sync-refused">
          <For each={refused()}>
            {(entry) => (
              <li data-sync-refused-seq={entry.seq}>
                {entry.operation} · {entry.expect.id.slice(-4)} ·{' '}
                {entry.refusal?.text}
                <Button onClick={() => void props.outbox.resubmit(entry.seq)}>
                  Resubmit
                </Button>
                <Button onClick={() => void props.outbox.discard(entry.seq)}>
                  Discard
                </Button>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </section>
  )
}
