import { createEffect, createMemo, createSignal } from 'solid-js'
import { Command, CommandPalette, Field, Input, Label } from '@wfe/components'
import type { CommandItem } from '@wfe/components'

type Project = 'Atlas' | 'Beacon'
type SearchRecord = Pick<
  CommandItem,
  'id' | 'label' | 'description' | 'group' | 'href'
>

/** Mock transport. Real applications supply their own data and cancellation. */
function searchRecords(project: Project, query: string, signal: AbortSignal) {
  return new Promise<readonly SearchRecord[]>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer)
      reject(new DOMException('Search cancelled', 'AbortError'))
    }
    const timer = setTimeout(
      () => {
        signal.removeEventListener('abort', abort)
        if (query.trim().toLowerCase() === 'error') {
          reject(new Error('Search is unavailable. Try another query.'))
          return
        }
        const records: SearchRecord[] = [
          {
            id: `${project}-plan`,
            label: `${project} plan`,
            group: 'Records',
            description: 'Open the project plan',
          },
          {
            id: `${project}-notes`,
            label: `${project} notes`,
            group: 'Records',
            description: 'Open the project notes',
          },
          {
            id: 'fields',
            label: 'Fields gallery',
            group: 'Navigation',
            href: '?gallery=fields',
          },
        ]
        const term = query.trim().toLowerCase()
        resolve(
          records.filter((record) => record.label.toLowerCase().includes(term)),
        )
      },
      query.length === 1 ? 450 : 80,
    )
    if (signal.aborted) abort()
    else signal.addEventListener('abort', abort, { once: true })
  })
}

export function CommandRecipe() {
  const [project, setProject] = createSignal<Project>('Atlas')
  const [query, setQuery] = createSignal('')
  const [search, setSearch] = createSignal('')
  const [open, setOpen] = createSignal(false)
  const [records, setRecords] = createSignal<readonly SearchRecord[]>([])
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal<string>()
  const [note, setNote] = createSignal('Keep this note while using commands')
  const [result, setResult] = createSignal('No action selected')
  let request = 0
  createEffect(
    () => ({ project: project(), query: search(), open: open() }),
    (state) => {
      const version = ++request
      const controller = new AbortController()
      let current = true
      setRecords([])
      setError(undefined)
      setLoading(state.open)
      if (state.open) {
        void searchRecords(state.project, state.query, controller.signal).then(
          (items) => {
            if (!current || controller.signal.aborted || version !== request)
              return
            setRecords(items)
            setLoading(false)
          },
          (failure: unknown) => {
            if (!current || controller.signal.aborted || version !== request)
              return
            setError(
              failure instanceof Error ? failure.message : 'Search failed',
            )
            setLoading(false)
          },
        )
      }
      return () => {
        current = false
        controller.abort()
      }
    },
  )
  const items = createMemo<readonly CommandItem[]>(() => {
    const active = project()
    const next = active === 'Atlas' ? 'Beacon' : 'Atlas'
    return [
      {
        id: 'refresh',
        label: `Refresh ${active}`,
        keywords: ['reload', 'update'],
        group: 'Actions',
        description: 'Refresh the current project',
        onSelect: () => setResult(`Refreshed ${active}`),
      },
      {
        id: 'delete',
        label: `Delete ${active}`,
        group: 'Actions',
        disabled: true,
        description: 'This action is unavailable',
      },
      {
        id: 'context',
        label: `Switch to ${next}`,
        group: 'Context',
        onSelect: () => {
          setProject(next)
          setQuery('')
          setSearch('')
          setResult(`Context changed to ${next}`)
        },
      },
      {
        id: 'fields',
        label: 'Fields gallery',
        group: 'Navigation',
        href: '?gallery=fields',
        keywords: ['inputs'],
      },
      {
        id: 'table',
        label: 'Table gallery',
        group: 'Navigation',
        href: '?gallery=table',
      },
    ]
  })
  return (
    <section class="example-stack" data-command-review="">
      <h2>Commands for {project()}</h2>
      <p>
        Search local actions, switch project context, or follow a gallery link.
      </p>
      <Command
        label="Find a command"
        items={items()}
        query={query()}
        onQueryChange={setQuery}
      />
      <Field>
        <Label>Retained command note</Label>
        <Input value={note()} onValueChange={setNote} />
      </Field>
      <CommandPalette
        title="Search project records"
        label="Search records"
        trigger="Search project records"
        shortcut
        open={open()}
        onOpenChange={setOpen}
        query={search()}
        onQueryChange={setSearch}
        items={records()}
        filter="none"
        loading={loading()}
        error={error()}
        empty="No matching records"
        onSelect={(item) => setResult(`Opened ${item.label}`)}
      />
      <p>
        Use Control+K or Command+K outside a text field to open search. Try
        “plan” for results or “error” to review recovery.
      </p>
      <output aria-label="Command result">{result()}</output>
    </section>
  )
}
