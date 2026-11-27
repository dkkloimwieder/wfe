import { createMemo, createSignal, For, Show } from 'solid-js'
import {
  Button,
  DropdownMenu,
  EmptyState,
  Field,
  FileInput,
  FormActions,
  FormGrid,
  formatDisplayValue,
  InlineAlert,
  Label,
  Meter,
  SelectField,
  Sheet,
  SummaryList,
  Tabs,
  Textarea,
} from '@wfe/components'
import {
  ActivityList,
  DashboardGrid,
  DashboardPanel,
} from '@wfe/components/layout'
import {
  blockCellText,
  BlockDate,
  BlockStatus,
  BlockTable,
  createBlockTable,
} from './blocksParts'
import {
  buildTicketDetail,
  choicesFor,
  ticketAgent,
  ticketAssignees,
  ticketIsResolved,
  ticketLogLevels,
  ticketPriorities,
  ticketSlaState,
  ticketStatuses,
} from './blocksData'
import type { Ticket, TicketAttachment, TicketStatus } from './blocksData'

type TicketDetail = ReturnType<typeof buildTicketDetail>
export type TicketActivityChange = Partial<Omit<TicketDetail, 'logs'>>
export type TicketPatch = Partial<
  Pick<Ticket, 'assignee' | 'status' | 'priority'>
>

const statusChoices = [
  { value: 'keep', label: 'Keep current status' },
  ...choicesFor(ticketStatuses),
]
const logChoices = choicesFor(['All levels', ...ticketLogLevels])
const replyModes = ['Public reply', 'Internal note'] as const
type ReplyMode = (typeof replyModes)[number]
type ReplyDraft = {
  text: string
  files: File[]
  status?: TicketStatus
  canned: string
}
const emptyDraft: ReplyDraft = { text: '', files: [], canned: 'none' }
const replyKinds = choicesFor(replyModes)
const cannedResponses = [
  { value: 'none', label: 'No canned response' },
  {
    value:
      'Thanks for the report. I will review the request and follow up here.',
    label: 'Acknowledge request',
  },
  {
    value:
      'Can you share the time of the last attempt and the steps you followed?',
    label: 'Ask for more details',
  },
  {
    value:
      'We updated the settings for your workspace. Please try the request again.',
    label: 'Ask customer to retry',
  },
]
const ticketTabs = [
  'Conversation',
  'Internal notes',
  'Attachments',
  'Logs',
  'Feedback',
  'History',
]
const formatTime = (time: string) =>
  formatDisplayValue(time, 'datetime', {
    dateFormat: 'MM/dd/yyyy',
    timeFormat: 'HH:mm',
  })

export function TicketActions(props: {
  label: string
  ticket?: Ticket
  onChange: (patch: TicketPatch) => void
  clearSelection?: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger>{props.label}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>Assign</DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent>
                <For each={ticketAssignees}>
                  {(assignee) => (
                    <DropdownMenu.Item
                      disabled={assignee === props.ticket?.assignee}
                      onSelect={() => props.onChange({ assignee })}
                    >
                      {assignee}
                    </DropdownMenu.Item>
                  )}
                </For>
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>Change status</DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent>
                <For each={ticketStatuses}>
                  {(status) => (
                    <DropdownMenu.Item
                      disabled={status === props.ticket?.status}
                      onSelect={() => props.onChange({ status })}
                    >
                      {status}
                    </DropdownMenu.Item>
                  )}
                </For>
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>Change priority</DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent>
                <For each={ticketPriorities}>
                  {(priority) => (
                    <DropdownMenu.Item
                      disabled={priority === props.ticket?.priority}
                      onSelect={() => props.onChange({ priority })}
                    >
                      {priority}
                    </DropdownMenu.Item>
                  )}
                </For>
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>
          <DropdownMenu.Item
            disabled={props.ticket?.status === 'Closed'}
            onSelect={() => props.onChange({ status: 'Closed' })}
          >
            {props.ticket ? 'Close ticket' : 'Close selected tickets'}
          </DropdownMenu.Item>
          <Show when={props.clearSelection}>
            <DropdownMenu.Item onSelect={() => props.clearSelection?.()}>
              Clear selection
            </DropdownMenu.Item>
          </Show>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu>
  )
}

export function TicketSheet(props: {
  original: Ticket
  ticket: Ticket
  changes?: TicketActivityChange
  now: string
  onChange: (
    patch: TicketPatch,
    activity?: (time: string) => TicketActivityChange,
  ) => void
  restoreFocus: () => HTMLElement | undefined
}) {
  const initial = createMemo(() => buildTicketDetail(props.original))
  const [tab, setTab] = createSignal('Conversation')
  const [replyKind, setReplyKind] = createSignal<ReplyMode>('Public reply')
  const [drafts, setDrafts] = createSignal<Record<ReplyMode, ReplyDraft>>({
    'Public reply': emptyDraft,
    'Internal note': emptyDraft,
  })
  const draft = () => drafts()[replyKind()]
  function updateDraft(patch: Partial<ReplyDraft>) {
    const kind = replyKind()
    setDrafts((current) => ({
      ...current,
      [kind]: { ...current[kind], ...patch },
    }))
  }
  const [uploadFiles, setUploadFiles] = createSignal<File[]>([])
  const [logLevel, setLogLevel] = createSignal('All levels')
  const [notice, setNotice] = createSignal('')
  const internal = () => replyKind() === 'Internal note'
  function selectTab(value: string) {
    setTab(value)
    if (value === 'Internal notes') setReplyKind('Internal note')
    if (value === 'Conversation') setReplyKind('Public reply')
  }
  const closed = () => props.ticket.status === 'Closed'
  const replyLabel = () => (internal() ? 'Add internal note' : 'Send reply')
  const submitLabel = () => {
    const status = draft().status
    if (status && !internal()) return `Send and set ${status}`
    if (status) return `Add note and set ${status}`
    return replyLabel()
  }
  let closeButton: HTMLButtonElement | undefined

  function describeFiles(
    files: readonly File[],
    time: string,
    internal: boolean,
  ) {
    const count = attachments().length
    return files.map((file, index): TicketAttachment => ({
      id: `file-${count + index + 1}`,
      name: file.name,
      type: file.type || 'Unknown',
      size: file.size,
      date: time,
      uploader: ticketAgent,
      internal,
    }))
  }

  function send() {
    const { status, files, text: draftText } = draft()
    const text = draftText.trim()
    if (!text || closed()) return
    const isPrivate = internal()
    props.onChange(status ? { status } : {}, (time) => {
      const attachments = describeFiles(files, time, isPrivate)
      const entry = {
        author: ticketAgent,
        time,
        text,
        files: attachments.map(({ name }) => name),
      }
      return {
        attachments,
        ...(isPrivate
          ? { notes: [entry] }
          : { messages: [{ ...entry, channel: props.ticket.channel }] }),
      }
    })
    updateDraft({ ...emptyDraft, status: undefined })
    setTab(isPrivate ? 'Internal notes' : 'Conversation')
    setNotice(isPrivate ? 'Internal note added.' : 'Public reply sent.')
  }

  const attachments = createMemo(() => [
    ...initial().attachments,
    ...(props.changes?.attachments ?? []),
  ])
  const attachmentTable = createBlockTable(attachments, [
    { id: 'name', header: 'File', accessorKey: 'name' },
    { id: 'type', header: 'Type', accessorKey: 'type' },
    {
      id: 'size',
      header: 'Size (KB)',
      accessorKey: 'size',
      sortFn: (a, b) => Number(a) - Number(b),
    },
    { id: 'uploader', header: 'Uploaded by', accessorKey: 'uploader' },
    { id: 'date', header: 'Date', accessorKey: 'date' },
    {
      id: 'visibility',
      header: 'Visibility',
      accessorFn: ({ internal }) => (internal ? 'Internal' : 'Public'),
    },
  ])
  const logs = createMemo(() =>
    initial().logs.filter(
      ({ level }) => logLevel() === 'All levels' || level === logLevel(),
    ),
  )
  const logTable = createBlockTable(logs, [
    { id: 'time', header: 'Time (UTC)', accessorKey: 'time' },
    { id: 'level', header: 'Level', accessorKey: 'level' },
    { id: 'source', header: 'Source', accessorKey: 'source' },
    { id: 'message', header: 'Message', accessorKey: 'message' },
  ])
  const conversation = createMemo(() => [
    ...initial().messages,
    ...(props.changes?.messages ?? []),
  ])
  const notes = createMemo(() => [
    ...initial().notes,
    ...(props.changes?.notes ?? []),
  ])
  const history = createMemo(() => [
    ...initial().history,
    ...(props.changes?.history ?? []),
  ])
  const feedback = () =>
    ticketIsResolved(props.ticket.status) ? props.ticket.feedback : undefined

  return (
    <Sheet.Content
      size="wide"
      class="blocks-ticket-sheet"
      initialFocus={() => closeButton}
      restoreFocus={props.restoreFocus}
    >
      <DashboardPanel>
        <Sheet.Title>{props.ticket.subject}</Sheet.Title>
        <Sheet.Description>
          {props.ticket.id} · {props.ticket.tenant} / {props.ticket.application}
        </Sheet.Description>
        <FormActions>
          <BlockStatus value={props.ticket.status} />
          <BlockStatus value={props.ticket.priority} />
          <TicketActions
            label="Ticket actions"
            ticket={props.ticket}
            onChange={(patch) => props.onChange(patch)}
          />
          <Sheet.CloseButton
            ref={(node) => {
              closeButton = node
            }}
            aria-label="Close ticket detail"
          >
            Close
          </Sheet.CloseButton>
        </FormActions>
      </DashboardPanel>
      <DashboardGrid minPanelWidth="23rem" class="blocks-ticket-detail">
        <DashboardPanel>
          <Tabs value={tab()} onValueChange={selectTab} panelMount="active">
            <Tabs.List aria-label="Ticket detail">
              <For each={ticketTabs}>
                {(name) => <Tabs.Trigger value={name}>{name}</Tabs.Trigger>}
              </For>
            </Tabs.List>
            <Tabs.Content value="Conversation">
              <ActivityList
                items={conversation().map(
                  ({ author, channel, time, text, files }) => ({
                    actor: `${author} · ${channel}`,
                    time: formatTime(time),
                    dateTime: time,
                    text: files?.length ? (
                      <>
                        {text}
                        <br />
                        Attachments: {files.join(', ')}
                      </>
                    ) : (
                      text
                    ),
                    tone:
                      author === props.ticket.contact ? 'neutral' : 'success',
                  }),
                )}
              />
            </Tabs.Content>
            <Tabs.Content value="Internal notes">
              <DashboardPanel
                title="Internal notes"
                titleAs="h3"
                description="Only support staff can see these notes."
              >
                <Show
                  when={notes().length}
                  fallback={<EmptyState>No internal notes yet.</EmptyState>}
                >
                  <ActivityList
                    items={notes().map(({ author, time, text, files }) => ({
                      actor: author,
                      time: formatTime(time),
                      dateTime: time,
                      text: files?.length ? (
                        <>
                          {text}
                          <br />
                          Attachments: {files.join(', ')}
                        </>
                      ) : (
                        text
                      ),
                      tone: 'warning',
                    }))}
                  />
                </Show>
              </DashboardPanel>
            </Tabs.Content>
            <Tabs.Content value="Attachments">
              <BlockTable
                layout="panel"
                table={attachmentTable}
                title="Ticket attachments"
                minWidth="38rem"
                pageSizes={false}
                controlsEnabled={false}
                footerEnabled={false}
                emptyResults={() => (
                  <EmptyState>No attachments yet.</EmptyState>
                )}
                renderCell={(cell) => {
                  const value = cell.getValue()
                  if (cell.column.id === 'date')
                    return <BlockDate value={blockCellText(value)} />
                  if (cell.column.id === 'size')
                    return (Number(value) / 1024).toFixed(1)
                  return blockCellText(value)
                }}
              />
              <Show when={!closed()}>
                <FormGrid
                  footer={
                    <Button
                      disabled={!uploadFiles().length}
                      onClick={() => {
                        props.onChange({}, (time) => ({
                          attachments: describeFiles(uploadFiles(), time, true),
                        }))
                        setUploadFiles([])
                        setNotice('Internal attachments added.')
                      }}
                    >
                      Add internal attachments
                    </Button>
                  }
                >
                  <FileInput
                    label="Internal attachments"
                    files={uploadFiles()}
                    onFilesChange={setUploadFiles}
                    multiple
                  />
                </FormGrid>
              </Show>
            </Tabs.Content>
            <Tabs.Content value="Logs">
              <BlockTable
                layout="panel"
                table={logTable}
                title="Ticket logs"
                minWidth="34rem"
                columnWidths={{ time: '9rem', level: '6rem', source: '8rem' }}
                controls={{ filtering: false, search: false, sorting: false }}
                extraFilters={
                  <SelectField
                    label="Log level"
                    choices={logChoices}
                    value={logLevel()}
                    onValueChange={setLogLevel}
                  />
                }
                filtersActive={logLevel() !== 'All levels'}
                onClearFilters={() => setLogLevel('All levels')}
                filterMode="live"
                pageSizes={false}
                footerEnabled={false}
                emptyResults={() => (
                  <EmptyState>No log entries match this level.</EmptyState>
                )}
                renderCell={(cell) => {
                  const value = blockCellText(cell.getValue())
                  if (cell.column.id === 'time')
                    return <BlockDate value={value} time />
                  if (cell.column.id === 'level')
                    return <BlockStatus value={value} />
                  return value
                }}
              />
            </Tabs.Content>
            <Tabs.Content value="Feedback">
              <DashboardPanel title="Customer feedback" titleAs="h3">
                <Show
                  when={feedback()}
                  fallback={
                    <EmptyState>
                      {ticketIsResolved(props.ticket.status)
                        ? 'The customer has not left feedback yet.'
                        : 'Feedback is available after the ticket is solved.'}
                    </EmptyState>
                  }
                >
                  {(entry) => (
                    <>
                      <Meter label="Rating" value={entry().rating} max={5} />
                      <SummaryList
                        items={[
                          { label: 'Comment', value: entry().comment },
                          {
                            label: 'Received',
                            value: <BlockDate value={entry().date} />,
                          },
                        ]}
                      />
                    </>
                  )}
                </Show>
              </DashboardPanel>
            </Tabs.Content>
            <Tabs.Content value="History">
              <ActivityList
                items={history().map(({ author, time, text }) => ({
                  actor: author,
                  time: formatTime(time),
                  dateTime: time,
                  text,
                }))}
              />
            </Tabs.Content>
          </Tabs>
          <Show when={notice()}>
            <InlineAlert tone="success" announce="polite">
              {notice()}
            </InlineAlert>
          </Show>
          <Show
            when={
              !closed() &&
              (tab() === 'Conversation' || tab() === 'Internal notes')
            }
          >
            <DashboardPanel title="Reply composer" titleAs="h3">
              <FormGrid
                as="form"
                onSubmit={(event) => {
                  event.preventDefault()
                  send()
                }}
                footer={
                  <Button
                    tone="primary"
                    type="submit"
                    disabled={!draft().text.trim()}
                  >
                    {submitLabel()}
                  </Button>
                }
              >
                <DashboardGrid minPanelWidth="10rem">
                  <SelectField
                    label="Reply type"
                    choices={replyKinds}
                    value={replyKind()}
                    onValueChange={(value) =>
                      selectTab(
                        value === 'Internal note'
                          ? 'Internal notes'
                          : 'Conversation',
                      )
                    }
                  />
                  <Show when={!internal()}>
                    <SelectField
                      label="Canned response"
                      choices={cannedResponses}
                      value={draft().canned}
                      onValueChange={(value) => {
                        updateDraft(
                          value === 'none'
                            ? { canned: value }
                            : { canned: value, text: value },
                        )
                      }}
                    />
                  </Show>
                </DashboardGrid>
                <Show when={internal()}>
                  <InlineAlert tone="warning">
                    This note is visible only to support staff.
                  </InlineAlert>
                </Show>
                <Field required>
                  <Label>{internal() ? 'Internal note' : 'Public reply'}</Label>
                  <Textarea
                    rows={3}
                    value={draft().text}
                    onValueChange={(text) => updateDraft({ text })}
                  />
                </Field>
                <FileInput
                  label={internal() ? 'Note attachments' : 'Reply attachments'}
                  files={draft().files}
                  onFilesChange={(files) => updateDraft({ files })}
                  multiple
                />
                <SelectField
                  label="Status on send"
                  choices={statusChoices}
                  value={draft().status ?? 'keep'}
                  onValueChange={(value) =>
                    updateDraft({
                      status: ticketStatuses.find((status) => status === value),
                    })
                  }
                />
              </FormGrid>
            </DashboardPanel>
          </Show>
        </DashboardPanel>
        <DashboardPanel title="Ticket summary" titleAs="h3">
          <SummaryList
            items={[
              {
                label: 'Customer',
                value: `${props.ticket.customer} / ${props.ticket.contact}`,
              },
              { label: 'Contact email', value: props.ticket.email },
              { label: 'Tenant', value: props.ticket.tenant },
              { label: 'Application', value: props.ticket.application },
              { label: 'Channel', value: props.ticket.channel },
              { label: 'Assignee', value: props.ticket.assignee },
              {
                label: 'Created',
                value: <BlockDate value={props.ticket.created} time />,
              },
              {
                label: 'First response',
                value: (
                  <BlockDate
                    value={props.ticket.firstResponse}
                    time
                    empty="Awaiting reply"
                  />
                ),
              },
              {
                label: 'SLA due',
                value: (
                  <>
                    <BlockDate value={props.ticket.slaDue} time />{' '}
                    <BlockStatus
                      value={ticketSlaState(props.ticket, props.now)}
                    />
                  </>
                ),
              },
              {
                label: 'Tags',
                value: <BlockStatus value={props.ticket.tag} />,
              },
            ]}
          />
        </DashboardPanel>
      </DashboardGrid>
    </Sheet.Content>
  )
}
