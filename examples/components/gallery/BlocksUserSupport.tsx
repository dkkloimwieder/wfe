import { createEffect, createMemo, createSignal, Show } from 'solid-js'
import {
  Button,
  EmptyState,
  Field,
  FileInput,
  FormGrid,
  Input,
  Label,
  SelectField,
  Sheet,
  SummaryList,
  Textarea,
} from '@wfe/components'
import { nativeEvents } from '@wfe/components/events'
import {
  ActivityList,
  DashboardGrid,
  DashboardPanel,
} from '@wfe/components/layout'
import {
  applications,
  choicesFor,
  customerTickets,
  portalCategories,
  portalContact,
  tenants,
  ticketPriorities,
} from './blocksData'
import type { TicketPriority } from './blocksData'
import { displayTime } from './blocksUserData'
import type { UserPageProps } from './blocksUserData'
import { useUserViews } from './BlocksUserState'
import {
  blockCellText,
  BlockDate,
  BlockNotice,
  BlockShell,
  BlockStatus,
  BlockTable,
  blockRowOpener,
  createBlockTable,
} from './blocksParts'

type PortalTicket = ReturnType<typeof customerTickets>[number]

const appChoices = choicesFor(applications.map(({ name }) => name))
const categoryChoices = choicesFor(portalCategories)
const priorityChoices = choicesFor(ticketPriorities)
const ratingChoices = [5, 4, 3, 2, 1].map((score) => ({
  value: String(score),
  label: `${score} out of 5`,
}))

function NewTicket(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  restoreFocus: () => HTMLElement | undefined
  onSubmit: (
    draft: Pick<
      PortalTicket,
      'subject' | 'application' | 'category' | 'priority' | 'attachments'
    >,
    text: string,
  ) => void
}) {
  const [subject, setSubject] = createSignal('')
  const [application, setApplication] = createSignal(
    applications[0].name as string,
  )
  const [category, setCategory] = createSignal<string>(portalCategories[0])
  const [priority, setPriority] = createSignal<TicketPriority>('Normal')
  const [description, setDescription] = createSignal('')
  const [files, setFiles] = createSignal<File[]>([])
  let subjectField: HTMLInputElement | undefined

  function submit(event: SubmitEvent) {
    event.preventDefault()
    const title = subject().trim()
    const text = description().trim()
    if (!title || !text) return
    props.onSubmit(
      {
        subject: title,
        application: application(),
        category: category(),
        priority: priority(),
        attachments: files().map(({ name }) => name),
      },
      text,
    )
    setSubject('')
    setDescription('')
    setFiles([])
    setApplication(applications[0].name)
    setCategory(portalCategories[0])
    setPriority('Normal')
  }

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <Sheet.Portal>
        <Sheet.Overlay />
        <Sheet.Content
          size="wide"
          initialFocus={() => subjectField}
          restoreFocus={props.restoreFocus}
        >
          <Sheet.Title>Submit a ticket</Sheet.Title>
          <Sheet.Description>
            Tell support what happened and which application you used.
          </Sheet.Description>
          <FormGrid
            as="form"
            ref={nativeEvents<HTMLFormElement>({ submit: submit })}
            footer={
              <>
                <Button
                  type="submit"
                  tone="primary"
                  disabled={!subject().trim() || !description().trim()}
                >
                  Submit ticket
                </Button>
                <Sheet.CloseButton aria-label="Cancel">
                  Cancel
                </Sheet.CloseButton>
              </>
            }
          >
            <Field>
              <Label>Subject</Label>
              <Input
                ref={(node) => {
                  subjectField = node
                }}
                value={subject()}
                onInput={(event) => setSubject(event.currentTarget.value)}
                required
                maxlength={120}
              />
            </Field>
            <Field>
              <Label>Application</Label>
              <SelectField
                label="Application"
                choices={appChoices}
                value={application()}
                onValueChange={setApplication}
              />
            </Field>
            <Field>
              <Label>Category</Label>
              <SelectField
                label="Category"
                choices={categoryChoices}
                value={category()}
                onValueChange={setCategory}
              />
            </Field>
            <Field>
              <Label>Priority</Label>
              <SelectField
                label="Priority"
                choices={priorityChoices}
                value={priority()}
                onValueChange={(value) => {
                  const choice = ticketPriorities.find((item) => item === value)
                  if (choice) setPriority(choice)
                }}
              />
            </Field>
            <Field>
              <Label>Description</Label>
              <Textarea
                rows={4}
                required
                value={description()}
                onInput={(event) => setDescription(event.currentTarget.value)}
              />
            </Field>
            <FileInput
              label="Attachments"
              files={files()}
              onFilesChange={setFiles}
              multiple
            />
          </FormGrid>
        </Sheet.Content>
      </Sheet.Portal>
    </Sheet>
  )
}

function PortalConversation(props: {
  ticket: PortalTicket
  onReply: (text: string) => void
  onCloseTicket: () => void
  onRate: (rating: number, comment: string) => void
  restoreFocus: () => HTMLElement | undefined
}) {
  const [reply, setReply] = createSignal('')
  const [score, setScore] = createSignal('')
  const [comment, setComment] = createSignal<string>()
  const rating = () => score() || String(props.ticket.feedback?.rating ?? '')
  const ratingComment = () => comment() ?? props.ticket.feedback?.comment ?? ''
  const [notice, setNotice] = createSignal('')
  let closeButton: HTMLButtonElement | undefined

  function sendReply(event: SubmitEvent) {
    event.preventDefault()
    const text = reply().trim()
    if (!text) return
    props.onReply(text)
    setReply('')
    setNotice('Reply sent.')
  }

  function saveRating(event: SubmitEvent) {
    event.preventDefault()
    if (!rating()) return
    props.onRate(Number(rating()), ratingComment().trim())
    setNotice('Rating saved.')
  }

  return (
    <Sheet.Content
      size="wide"
      class="blocks-ticket-sheet"
      initialFocus={() => closeButton}
      restoreFocus={props.restoreFocus}
    >
      <DashboardPanel
        footer={
          <>
            <BlockStatus value={props.ticket.status} />
            <BlockStatus value={props.ticket.priority} />
            <Show when={props.ticket.status !== 'Closed'}>
              <Button
                onClick={() => {
                  props.onCloseTicket()
                  setNotice('Ticket closed.')
                }}
              >
                Close ticket
              </Button>
            </Show>
            <Sheet.CloseButton
              ref={(node) => {
                closeButton = node
              }}
              aria-label="Close ticket detail"
            >
              Close
            </Sheet.CloseButton>
          </>
        }
      >
        <Sheet.Title>{props.ticket.subject}</Sheet.Title>
        <Sheet.Description>
          {props.ticket.id} · {props.ticket.application} ·{' '}
          {props.ticket.category}
        </Sheet.Description>
      </DashboardPanel>
      <DashboardGrid class="blocks-ticket-detail" minPanelWidth="22rem">
        <DashboardPanel title="Conversation" titleAs="h3">
          <ActivityList
            items={props.ticket.messages.map(({ author, time, text }) => ({
              actor: author,
              time: displayTime(time),
              dateTime: time,
              text,
              tone: author === portalContact.name ? 'neutral' : 'success',
            }))}
          />
        </DashboardPanel>
        <DashboardPanel title="Ticket actions" titleAs="h3">
          <Show when={props.ticket.attachments.length}>
            <SummaryList
              items={[
                {
                  label: 'Attachments',
                  value: props.ticket.attachments.join(', '),
                },
              ]}
            />
          </Show>
          <Show when={props.ticket.status !== 'Closed'}>
            <FormGrid
              as="form"
              ref={nativeEvents<HTMLFormElement>({ submit: sendReply })}
              footer={
                <Button type="submit" disabled={!reply().trim()}>
                  Send reply
                </Button>
              }
            >
              <Field>
                <Label>Reply</Label>
                <Textarea
                  rows={3}
                  required
                  value={reply()}
                  onInput={(event) => setReply(event.currentTarget.value)}
                />
              </Field>
            </FormGrid>
          </Show>
          <Show when={props.ticket.resolvedAt}>
            <FormGrid
              as="form"
              ref={nativeEvents<HTMLFormElement>({ submit: saveRating })}
              footer={
                <Button type="submit" disabled={!rating()}>
                  Save rating
                </Button>
              }
            >
              <Field>
                <Label>Rate the answer</Label>
                <SelectField
                  label="Rate the answer"
                  choices={ratingChoices}
                  value={rating()}
                  onValueChange={setScore}
                  placeholder="Choose a rating"
                />
              </Field>
              <Field>
                <Label>Rating comment</Label>
                <Textarea
                  rows={2}
                  value={ratingComment()}
                  onInput={(event) => setComment(event.currentTarget.value)}
                />
              </Field>
            </FormGrid>
          </Show>
          <Show
            when={props.ticket.status === 'Closed' && !props.ticket.resolvedAt}
          >
            <EmptyState>This ticket is closed.</EmptyState>
          </Show>
          <BlockNotice message={notice()} />
        </DashboardPanel>
      </DashboardGrid>
    </Sheet.Content>
  )
}

export function BlocksUserSupport(
  props: UserPageProps & {
    requestedTicket?: { id: string }
  } = {},
) {
  const tenant = () => props.tenant ?? tenants[0]
  const views = useUserViews()
  const viewOptions = { storage: views.storage['My tickets'] }
  const seed = createMemo(() => customerTickets(tenant()))
  const [edits, setEdits] = createSignal<Record<string, PortalTicket[]>>({})
  const rows = () => edits()[tenant().id] ?? seed()
  const [ticketId, setTicketId] = createSignal<string>()
  const [newOpen, setNewOpen] = createSignal(false)
  const ticket = createMemo(() => rows().find(({ id }) => id === ticketId()))
  let rowTrigger: ReturnType<typeof blockRowOpener> | undefined
  let newTrigger: HTMLButtonElement | undefined
  let sequence = 1150
  // The URL identifies an optional ticket to open on the first render.
  const linkedId = new URLSearchParams(window.location.search).get('item')
  createEffect(
    () => ({
      active: props.visible !== false,
      standalone: !props.contentOnly,
      link: props.requestedTicket,
      tenant: tenant().id,
    }),
    (next, previous) => {
      if (next.tenant !== previous?.tenant && previous) {
        setNewOpen(false)
        setTicketId(undefined)
      }
      if (!next.active) return
      if (next.link && next.link !== previous?.link) {
        rowTrigger = undefined
        setTicketId(next.link.id)
      } else if (!previous && next.standalone && linkedId) {
        setTicketId(linkedId)
      }
    },
  )

  const table = createBlockTable(
    rows,
    [
      { id: 'id', header: 'Ticket', accessorKey: 'id', enableHiding: false },
      { id: 'subject', header: 'Subject', accessorKey: 'subject' },
      { id: 'application', header: 'Application', accessorKey: 'application' },
      { id: 'status', header: 'Status', accessorKey: 'status' },
      { id: 'priority', header: 'Priority', accessorKey: 'priority' },
      { id: 'updated', header: 'Updated (UTC)', accessorKey: 'updated' },
    ],
    { globalFilterScope: 'all' },
  )

  function changeRows(update: (current: PortalTicket[]) => PortalTicket[]) {
    const tenantId = tenant().id
    const current = rows()
    setEdits((all) => ({ ...all, [tenantId]: update(current) }))
  }

  function patch(
    id: string,
    update: (row: PortalTicket) => Partial<PortalTicket>,
  ) {
    changeRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...update(row) } : row)),
    )
  }

  return (
    <BlockShell
      title="My tickets"
      fillTable
      contentOnly={props.contentOnly}
      visible={props.visible}
      header={
        <Button
          tone="primary"
          ref={(node) => {
            newTrigger = node
          }}
          onClick={() => setNewOpen(true)}
        >
          New ticket
        </Button>
      }
    >
      <BlockTable
        title="My tickets"
        table={table}
        views={viewOptions}
        filterMode="live"
        search={{ label: 'Search my tickets' }}
        columnWidths={{ id: '7rem', subject: '16rem', updated: '10rem' }}
        emptyResults={() => (
          <EmptyState>No tickets match your search.</EmptyState>
        )}
        renderCell={(cell) => {
          const value = blockCellText(cell.getValue())
          switch (cell.column.id) {
            case 'id':
              return (
                <Button
                  variant="ghost"
                  data-block-row-opener=""
                  aria-label={`Open ${value}`}
                  onClick={(event) => {
                    rowTrigger = blockRowOpener(event.currentTarget)
                    setTicketId(value)
                  }}
                >
                  {value}
                </Button>
              )
            case 'status':
            case 'priority':
              return <BlockStatus value={value} />
            case 'updated':
              return <BlockDate value={value} time />
            default:
              return value
          }
        }}
      />
      <NewTicket
        open={newOpen()}
        onOpenChange={setNewOpen}
        restoreFocus={() => newTrigger}
        onSubmit={(draft, description) => {
          const time = new Date().toISOString()
          const id = `TKT-${++sequence}`
          changeRows((current) => [
            {
              ...draft,
              id,
              status: 'New',
              updated: time,
              resolvedAt: undefined,
              feedback: undefined,
              messages: [
                {
                  author: portalContact.name,
                  time,
                  text: description,
                  channel: 'Web form',
                },
              ],
            },
            ...current,
          ])
          setNewOpen(false)
          table.setGlobalFilter('')
        }}
      />
      <Sheet
        open={Boolean(ticket())}
        onOpenChange={(open) => {
          if (!open) setTicketId(undefined)
        }}
      >
        <Sheet.Portal>
          <Sheet.Overlay />
          <Show when={ticket() && ticketId()} keyed>
            {(id) => (
              <PortalConversation
                ticket={ticket()!}
                onReply={(text) => {
                  const time = new Date().toISOString()
                  patch(id, (row) => ({
                    updated: time,
                    messages: [
                      ...row.messages,
                      {
                        author: portalContact.name,
                        time,
                        text,
                        channel: 'Web form',
                      },
                    ],
                  }))
                }}
                onCloseTicket={() =>
                  patch(id, () => ({
                    status: 'Closed',
                    updated: new Date().toISOString(),
                  }))
                }
                onRate={(rating, comment) =>
                  patch(id, () => ({
                    feedback: {
                      rating,
                      comment,
                      date: new Date().toISOString(),
                    },
                  }))
                }
                restoreFocus={() => rowTrigger?.() ?? newTrigger}
              />
            )}
          </Show>
        </Sheet.Portal>
      </Sheet>
    </BlockShell>
  )
}
