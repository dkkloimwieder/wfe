import { createSignal, For } from 'solid-js'
import {
  Button,
  EmptyState,
  Meter,
  SummaryList,
  ValueDisplay,
} from '@wfe/components'
import { DashboardGrid, DashboardPanel } from '@wfe/components/layout'
import {
  blockCellText,
  BlockDate,
  BlockNotice,
  BlockShell,
  BlockStatus,
  BlockTable,
  createBlockTable,
} from './blocksParts'
import {
  applicationUsage,
  billingInvoicesByTenant,
  billingPlans,
  tenants,
} from './blocksData'

export function BlocksBilling(props: {
  contentOnly?: boolean
  visible?: boolean
  tenant?: (typeof tenants)[number]
}) {
  const tenant = () => props.tenant ?? tenants[0]
  const [plans, setPlans] = createSignal<
    Partial<Record<string, (typeof billingPlans)[number]>>
  >({})
  const plan = () =>
    plans()[tenant().id] ??
    billingPlans.find(({ name }) => name === tenant().plan)!
  const [message, setMessage] = createSignal<{
    tenantId: string
    text: string
  }>()
  const table = createBlockTable(
    () => billingInvoicesByTenant[tenant().id] ?? [],
    [
      { id: 'id', header: 'Invoice', accessorKey: 'id' },
      { id: 'customer', header: 'Customer', accessorKey: 'customer' },
      { id: 'issued', header: 'Issued', accessorKey: 'issued' },
      {
        id: 'amount',
        header: 'Amount',
        accessorKey: 'amount',
        sortFn: (a, b) => Number(a) - Number(b),
      },
      { id: 'status', header: 'Status', accessorKey: 'status' },
    ],
  )

  return (
    <BlockShell
      title="Billing and usage"
      contentOnly={props.contentOnly}
      visible={props.visible}
    >
      <DashboardPanel title="Current plan" titleAs="h3">
        <SummaryList
          items={[
            { label: 'Tenant', value: tenant().name },
            { label: 'Plan', value: plan().name },
            {
              label: 'Monthly cost',
              value: (
                <ValueDisplay
                  value={plan().monthly}
                  format="currency"
                  currency="USD"
                />
              ),
            },
            {
              label: 'Next billing date',
              value: <BlockDate value="2026-12-01" />,
            },
          ]}
        />
      </DashboardPanel>
      <BlockNotice
        message={
          message()?.tenantId === tenant().id ? message()?.text : undefined
        }
      />
      <DashboardPanel title="Request usage this month" titleAs="h3">
        <For
          each={applicationUsage[tenant().id]}
          fallback={<EmptyState>No usage recorded this month.</EmptyState>}
        >
          {(app) => (
            <Meter
              label={app.name}
              value={app.requests}
              max={plan().requests}
              messages={{
                valueOfMaximum: (value, max) => `${value} of ${max} requests`,
              }}
              thresholds={[
                {
                  at: plan().requests + 1,
                  tone: 'warning',
                  label: 'Over the monthly limit.',
                },
              ]}
            />
          )}
        </For>
      </DashboardPanel>
      <DashboardGrid aria-label="Compare plans">
        <For each={billingPlans}>
          {(option) => (
            <DashboardPanel
              title={option.name}
              titleAs="h3"
              description={
                <>
                  <div>
                    <ValueDisplay
                      value={option.monthly}
                      format="currency"
                      currency="USD"
                    />{' '}
                    per month
                  </div>
                  <div>
                    <ValueDisplay
                      value={option.requests}
                      format="number-grouped"
                    />{' '}
                    monthly requests per application
                  </div>
                  <div>{option.members} members</div>
                </>
              }
              footer={
                <Button
                  disabled={plan() === option}
                  onClick={() => {
                    setPlans((all) => ({ ...all, [tenant().id]: option }))
                    setMessage({
                      tenantId: tenant().id,
                      text: `Changed the plan to ${option.name}.`,
                    })
                  }}
                >
                  {plan() === option ? 'Current plan' : `Choose ${option.name}`}
                </Button>
              }
            />
          )}
        </For>
      </DashboardGrid>
      <BlockTable
        table={table}
        title="Recent invoices"
        layout="panel"
        pageScope={[tenant().id]}
        columnAlignment={{ amount: 'right' }}
        formatValue={(value, column) => {
          if (column.id === 'amount')
            return (
              <ValueDisplay
                value={Number(value)}
                format="currency"
                currency="USD"
              />
            )
          if (column.id === 'status')
            return <BlockStatus value={blockCellText(value)} />
          if (column.id === 'issued')
            return <BlockDate value={blockCellText(value)} />
          return undefined
        }}
      />
    </BlockShell>
  )
}
