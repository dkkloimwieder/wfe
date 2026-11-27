import { createEffect, createMemo, createSignal, Show, untrack } from 'solid-js'
import {
  Button,
  DropdownMenu,
  EmptyState,
  Field,
  FormActions,
  FormGrid,
  Input,
  Label,
  SelectField,
  Sheet,
  SummaryList,
  Textarea,
  ValueDisplay,
} from '@wfe/components'
import type { CalendarRange } from '@wfe/components'
import { nativeEvents } from '@wfe/components/events'
import {
  blockCellText,
  BlockDate,
  BlockDateRange,
  BlockNotice,
  BlockShell,
  BlockStatus,
  BlockTable,
  createBlockTable,
  viewChoice,
  viewFields,
  viewRange,
} from './blocksParts'
import {
  choicesFor,
  inDateRange,
  initialInvoices,
  invoiceStatuses,
  sortText,
} from './blocksData'
import type { Invoice } from './blocksData'
import type { TableViewValue } from '@wfe/components/table'
import { localTableViews } from '../../shared/controls/tableViewStorage'

const invoiceViews = localTableViews('invoices', {
  initialViewId: 'invoice-all',
  systemViews: [
    { id: 'invoice-all', name: 'All invoices', state: { version: 1 } },
    {
      id: 'invoice-outstanding',
      name: 'Outstanding',
      state: { version: 1, extraFilters: { status: 'Outstanding' } },
    },
    {
      id: 'invoice-paid',
      name: 'Paid invoices',
      state: { version: 1, extraFilters: { status: 'Paid' } },
    },
  ],
})
const statuses = choicesFor(invoiceStatuses)
const statusFilters = [
  { value: 'all', label: 'All statuses' },
  { value: 'Outstanding', label: 'Outstanding' },
  ...statuses,
]
const blankInvoice = (): Invoice => ({
  id: '',
  customer: '',
  email: '',
  issued: new Date().toISOString().slice(0, 10),
  due: '',
  amount: 0,
  status: 'Draft',
  notes: '',
})

function InvoiceEditor(props: {
  invoice: Invoice
  onSave: (invoice: Invoice) => void
  onCancel: () => void
  customerRef: (node: HTMLInputElement) => void
}) {
  // Seed the editor once so an open draft keeps the user's edits.
  const initial = untrack(() => props.invoice)
  const [status, setStatus] = createSignal(initial.status)
  const [issued, setIssued] = createSignal(initial.issued)
  return (
    <FormGrid
      as="form"
      footer={
        <>
          <Button type="submit" tone="primary">
            Save invoice
          </Button>
          <Button onClick={props.onCancel}>Cancel</Button>
        </>
      }
      ref={nativeEvents<HTMLFormElement>({
        submit: (event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          const customer = form.get('customer')
          const email = form.get('email')
          const due = form.get('due')
          const amount = form.get('amount')
          const notes = form.get('notes')
          if (
            typeof customer !== 'string' ||
            typeof email !== 'string' ||
            typeof due !== 'string' ||
            typeof amount !== 'string' ||
            typeof notes !== 'string'
          )
            return
          props.onSave({
            id: props.invoice.id,
            customer: customer.trim(),
            email: email.trim(),
            issued: issued(),
            due,
            amount: Number(amount),
            status: status(),
            notes: notes.trim(),
          })
        },
      })}
    >
      <Field required>
        <Label>Customer</Label>
        <Input
          name="customer"
          ref={props.customerRef}
          defaultValue={props.invoice.customer}
          pattern=".*\S.*"
        />
      </Field>
      <Field required>
        <Label>Contact email</Label>
        <Input name="email" type="email" defaultValue={props.invoice.email} />
      </Field>
      <Field required>
        <Label>Issued</Label>
        <Input
          name="issued"
          type="date"
          value={issued()}
          onValueChange={setIssued}
        />
      </Field>
      <Field required>
        <Label>Due</Label>
        <Input
          name="due"
          type="date"
          min={issued()}
          defaultValue={props.invoice.due}
        />
      </Field>
      <Field required>
        <Label>Amount (USD)</Label>
        <Input
          name="amount"
          type="number"
          min="0"
          step="0.01"
          defaultValue={String(props.invoice.amount)}
        />
      </Field>
      <SelectField
        label="Invoice status"
        choices={statuses}
        value={status()}
        onValueChange={setStatus}
      />
      <Field>
        <Label>Notes</Label>
        <Textarea name="notes" defaultValue={props.invoice.notes} />
      </Field>
    </FormGrid>
  )
}

function invoiceCsv(invoices: Invoice[]) {
  const quote = (value: string | number) =>
    `"${String(value).replaceAll('"', '""')}"`
  return [
    ['Invoice', 'Customer', 'Email', 'Issued', 'Due', 'Amount (USD)', 'Status'],
    ...invoices.map((item) => [
      item.id,
      item.customer,
      item.email,
      item.issued,
      item.due,
      item.amount,
      item.status,
    ]),
  ]
    .map((row) => row.map(quote).join(','))
    .join('\r\n')
}

type RecordChoices = ReturnType<typeof choicesFor>

export function RecordFilters(props: {
  statuses: RecordChoices
  status: string
  onStatus: (value: string) => void
  customers: RecordChoices
  customer: string
  onCustomer: (value: string) => void
  dateLabel: string
  range?: CalendarRange
  onRange: (value: CalendarRange | undefined) => void
}) {
  return (
    <>
      <SelectField
        label="Status"
        choices={props.statuses}
        value={props.status}
        onValueChange={props.onStatus}
      />
      <SelectField
        label="Customer"
        choices={props.customers}
        value={props.customer}
        onValueChange={props.onCustomer}
      />
      <BlockDateRange
        label={props.dateLabel}
        value={props.range}
        onValueChange={props.onRange}
      />
    </>
  )
}

export function BlocksRecords() {
  return <InvoiceWorkspace />
}

export function InvoiceWorkspace(props: {
  contentOnly?: boolean
  visible?: boolean
}) {
  const [invoices, setInvoices] = createSignal(initialInvoices)
  const [status, setStatus] = createSignal('all')
  const [range, setRange] = createSignal<CalendarRange>()
  const [customer, setCustomer] = createSignal('all')
  const [recordId, setRecordId] = createSignal<string>()
  const [newInvoice, setNewInvoice] = createSignal<Invoice>()
  const [editing, setEditing] = createSignal(false)
  const [message, setMessage] = createSignal('')
  let nextInvoiceNumber = 1049
  let invoiceTrigger: HTMLButtonElement | undefined
  let customerField: HTMLInputElement | undefined
  let editButton: HTMLButtonElement | undefined

  const record = () =>
    newInvoice() ?? invoices().find(({ id }) => id === recordId())
  const filteredInvoices = createMemo(() =>
    invoices().filter(
      (item) =>
        (status() === 'all' ||
          (status() === 'Outstanding'
            ? item.status === 'Sent' || item.status === 'Overdue'
            : item.status === status())) &&
        (customer() === 'all' || item.customer === customer()) &&
        inDateRange(item.issued, range()),
    ),
  )
  const table = createBlockTable(
    filteredInvoices,
    [
      {
        id: 'id',
        header: 'Invoice',
        accessorKey: 'id',
        enableHiding: false,
      },
      {
        id: 'customer',
        header: 'Customer',
        accessorKey: 'customer',
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
      },
      {
        id: 'amount',
        header: 'Amount',
        accessorKey: 'amount',
        sortFn: (a, b) => Number(a) - Number(b),
      },
      {
        id: 'issued',
        header: 'Issued',
        accessorKey: 'issued',
      },
      { id: 'due', header: 'Due', accessorKey: 'due' },
      {
        id: 'email',
        header: 'Contact email',
        accessorKey: 'email',
      },
    ],
    {
      globalFilterScope: 'all',
      initialState: { columnVisibility: { email: false } },
    },
  )
  const customers = createMemo(() => [
    { value: 'all', label: 'All customers' },
    ...choicesFor(
      [...new Set(invoices().map(({ customer }) => customer))].sort(sortText),
    ),
  ])
  const matching = table.getRowIds
  const selectedIds = () =>
    matching().filter((id) => table.state.rowSelection[id])
  const clearSelection = () => table.setRowSelection({})
  createEffect(() => table.state.globalFilter, clearSelection, { defer: true })

  function invoiceViewFilters(value: TableViewValue) {
    const stored = viewFields(value)
    return {
      status:
        viewChoice(
          stored.status,
          statusFilters.map(({ value }) => value),
        ) ?? 'all',
      customer:
        viewChoice(
          stored.customer,
          customers().map(({ value }) => value),
        ) ?? 'all',
      range: viewRange(stored.range),
    }
  }

  function clearFilters() {
    setStatus('all')
    setCustomer('all')
    setRange(undefined)
    clearSelection()
  }
  function closeInvoice() {
    setEditing(false)
    setNewInvoice(undefined)
    setRecordId(undefined)
  }
  function saveInvoice(invoice: Invoice) {
    if (invoice.id) {
      setInvoices((rows) =>
        rows.map((row) => (row.id === invoice.id ? invoice : row)),
      )
      setEditing(false)
      setMessage(`Saved ${invoice.id}.`)
      return
    }
    const id = `INV-${nextInvoiceNumber++}`
    setInvoices((rows) => [{ ...invoice, id }, ...rows])
    setNewInvoice(undefined)
    setRecordId(id)
    setEditing(false)
    setMessage(`Created ${id}.`)
  }
  function exportInvoices(items: Invoice[], filename: string) {
    const url = URL.createObjectURL(
      new Blob([invoiceCsv(items)], { type: 'text/csv;charset=utf-8' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
  function markPaid() {
    const selected = new Set(selectedIds())
    setInvoices((rows) =>
      rows.map((row) =>
        selected.has(row.id) ? { ...row, status: 'Paid' } : row,
      ),
    )
    table.setRowSelection({})
    setMessage(
      `Marked ${selected.size} ${selected.size === 1 ? 'invoice' : 'invoices'} paid.`,
    )
  }

  const exportMenu = () => (
    <DropdownMenu>
      <DropdownMenu.Trigger>Export</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Item
            disabled={!matching().length}
            onSelect={() =>
              exportInvoices(
                matching().flatMap((id) => {
                  const invoice = table.getRow(id).original
                  return invoice ? [invoice] : []
                }),
                'filtered-invoices.csv',
              )
            }
          >
            Export filtered invoices
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => exportInvoices(invoices(), 'all-invoices.csv')}
          >
            Export all invoices
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu>
  )
  const bulkMenu = () => (
    <DropdownMenu>
      <DropdownMenu.Trigger>
        Bulk actions ({selectedIds().length})
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={markPaid}>
            Mark as paid
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={clearSelection}>
            Clear selection
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu>
  )
  return (
    <BlockShell
      title="Records workspace"
      contentOnly={props.contentOnly}
      visible={props.visible}
      fillTable
      header={
        <>
          <BlockNotice message={message()} />
          <Button
            tone="primary"
            onClick={(event) => {
              invoiceTrigger = event.currentTarget
              setNewInvoice(blankInvoice())
              setEditing(true)
            }}
          >
            New invoice
          </Button>
        </>
      }
    >
      <BlockTable
        class="blocks-records-workspace"
        table={table}
        title="Invoice register"
        minWidth={
          table.state.columnVisibility.email === false ? '51rem' : '61rem'
        }
        columnWidths={{ customer: '8rem', email: '10rem' }}
        toolbarActions={exportMenu()}
        columnAlignment={{ amount: 'right' }}
        rowSelection={{
          selected: table.state.rowSelection,
          onChange: (selected) => table.setRowSelection(selected),
          selectAll: 'page',
        }}
        bulkActions={bulkMenu()}
        controls={{ filtering: false, grouping: true }}
        filterMode="live"
        search={{ label: 'Search invoices' }}
        views={{
          ...invoiceViews,
          extraFilters: {
            capture: () => ({
              status: status(),
              customer: customer(),
              range: range(),
            }),
            normalize: invoiceViewFilters,
            restore: (value) => {
              const next = invoiceViewFilters(value)
              setStatus(next.status)
              setCustomer(next.customer)
              setRange(next.range)
              clearSelection()
            },
          },
        }}
        filtersActive={
          status() !== 'all' || customer() !== 'all' || Boolean(range())
        }
        pageScope={[status(), customer(), range()]}
        onClearFilters={clearFilters}
        emptyResults={({ filtered, clearFilters }) => (
          <EmptyState>
            <div role="status">No invoices match these filters.</div>
            <Show when={filtered}>
              <Button onClick={clearFilters}>Clear filters</Button>
            </Show>
          </EmptyState>
        )}
        messages={{
          pageRecordCount: (count) =>
            `${count} of ${invoices().length} invoices`,
          selectPageRows: 'Select invoices on this page',
          selectRow: (id) => `Select ${id}`,
        }}
        extraFilters={
          <RecordFilters
            statuses={statusFilters}
            status={status()}
            onStatus={(value) => {
              setStatus(value)
              clearSelection()
            }}
            customers={customers()}
            customer={customer()}
            onCustomer={(value) => {
              setCustomer(value)
              clearSelection()
            }}
            dateLabel="Issued"
            range={range()}
            onRange={(value) => {
              setRange(value)
              clearSelection()
            }}
          />
        }
        renderCell={(cell) => {
          const id = cell.row.id
          if (cell.column.id === 'id') {
            return (
              <Button
                variant="ghost"
                aria-label={`Open ${id}`}
                onClick={(event) => {
                  invoiceTrigger = event.currentTarget
                  setRecordId(id)
                  setEditing(false)
                }}
              >
                {id}
              </Button>
            )
          }
          if (cell.column.id === 'amount') {
            return (
              <ValueDisplay
                format="currency"
                currency="USD"
                value={Number(cell.getValue())}
              />
            )
          }
          if (cell.column.id === 'status')
            return <BlockStatus value={blockCellText(cell.getValue())} />
          if (cell.column.id === 'issued' || cell.column.id === 'due')
            return <BlockDate value={blockCellText(cell.getValue())} />
          return <>{blockCellText(cell.getValue())}</>
        }}
      />
      <Sheet
        open={Boolean(record())}
        onOpenChange={(open) => {
          if (!open) closeInvoice()
        }}
      >
        <Sheet.Portal>
          <Sheet.Overlay />
          <Sheet.Content
            focusKey={editing()}
            initialFocus={() => (editing() ? customerField : editButton)}
            restoreFocus={() => invoiceTrigger}
          >
            <Sheet.Title>
              {newInvoice() ? 'New invoice' : record()?.id}
            </Sheet.Title>
            <Sheet.Description>Northwind / Billing</Sheet.Description>
            <Show when={record()}>
              {(invoice) => (
                <Show
                  when={editing()}
                  fallback={
                    <>
                      <SummaryList
                        items={[
                          { label: 'Customer', value: invoice().customer },
                          { label: 'Contact email', value: invoice().email },
                          {
                            label: 'Issued',
                            value: <BlockDate value={invoice().issued} />,
                          },
                          {
                            label: 'Due',
                            value: <BlockDate value={invoice().due} />,
                          },
                          {
                            label: 'Amount',
                            value: (
                              <ValueDisplay
                                format="currency"
                                currency="USD"
                                value={invoice().amount}
                              />
                            ),
                          },
                          {
                            label: 'Status',
                            value: <BlockStatus value={invoice().status} />,
                          },
                          { label: 'Notes', value: invoice().notes || '—' },
                        ]}
                      />

                      <FormActions>
                        <Button
                          tone="primary"
                          ref={(node) => {
                            editButton = node
                          }}
                          onClick={() => setEditing(true)}
                        >
                          Edit invoice
                        </Button>
                        <Sheet.CloseButton aria-label="Close">
                          Close
                        </Sheet.CloseButton>
                      </FormActions>
                    </>
                  }
                >
                  <InvoiceEditor
                    invoice={invoice()}
                    customerRef={(node) => {
                      customerField = node
                    }}
                    onSave={saveInvoice}
                    onCancel={() =>
                      newInvoice() ? closeInvoice() : setEditing(false)
                    }
                  />
                </Show>
              )}
            </Show>
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet>
    </BlockShell>
  )
}
