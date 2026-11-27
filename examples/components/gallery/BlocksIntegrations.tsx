import { createSignal, Show } from 'solid-js'
import {
  Button,
  FormGrid,
  InlineAlert,
  SummaryList,
  formatDisplayValue,
} from '@wfe/components'
import { ActivityList, DashboardGrid, EntryPanel } from '@wfe/components/layout'
import {
  blockCellText,
  BlockDate,
  BlockStatus,
  BlockShell,
  BlockTable,
  createBlockTable,
} from './blocksParts'
import { webhookDeliveries, webhookEndpoints } from './blocksData'
import type { WebhookDelivery, WebhookEndpoint } from './blocksData'

export function BlocksIntegrations(props: {
  contentOnly?: boolean
  visible?: boolean
}) {
  const [selected, setSelected] = createSignal<WebhookEndpoint>(
    webhookEndpoints[0]!,
  )
  const [deliveries, setDeliveries] = createSignal(webhookDeliveries)
  const [result, setResult] = createSignal('')
  const [tests, setTests] = createSignal(0)
  const table = createBlockTable(
    () => webhookEndpoints,
    [
      { id: 'name', header: 'Endpoint', accessorKey: 'name' },
      { id: 'application', header: 'Application', accessorKey: 'application' },
      { id: 'event', header: 'Event', accessorKey: 'event' },
      { id: 'status', header: 'Status', accessorKey: 'status' },
    ],
  )
  const recent = () => deliveries()[selected().id] ?? []
  const deliveryTable = createBlockTable(recent, [
    { id: 'event', header: 'Event', accessorKey: 'event' },
    { id: 'time', header: 'Time (UTC)', accessorKey: 'time' },
    { id: 'result', header: 'Result', accessorKey: 'result' },
  ])
  const latestDelivery = () => recent()[0]

  function sendTestEvent() {
    const endpoint = selected()
    if (endpoint.status === 'Paused') {
      setResult('The endpoint is paused. No event was sent.')
      return
    }
    const delivery: WebhookDelivery = {
      id: `test-${setTests((count) => count + 1)}`,
      event: `Test: ${endpoint.event}`,
      time: new Date().toISOString(),
      result: '200 OK',
    }
    setDeliveries((rows) => ({
      ...rows,
      [endpoint.id]: [delivery, ...recent()],
    }))
    setResult('Test delivery succeeded. The example response was 200 OK.')
  }

  return (
    <BlockShell
      title="Integrations and webhooks"
      contentOnly={props.contentOnly}
      visible={props.visible}
    >
      <BlockTable
        table={table}
        title="Webhook endpoints"
        class="blocks-endpoints-table"
        layout="panel"
        pageSizes={false}
        renderRowActions={(row) => (
          <Show when={row.original}>
            {(item) => (
              <Button
                aria-pressed={selected().id === item().id ? 'true' : 'false'}
                aria-label={`View ${item().name}`}
                onClick={() => {
                  setSelected(item())
                  deliveryTable.setGlobalFilter('')
                  deliveryTable.setColumnFilters([])
                  setResult('')
                }}
              >
                View
              </Button>
            )}
          </Show>
        )}
        formatValue={(value, column) =>
          column.id === 'status' ? (
            <BlockStatus value={blockCellText(value)} />
          ) : undefined
        }
      />
      <DashboardGrid minPanelWidth="27rem" gap="layout">
        <EntryPanel
          size="content"
          role="group"
          title={selected().name}
          titleAs="h3"
        >
          <FormGrid
            footer={
              <Button tone="primary" onClick={sendTestEvent}>
                Send test event
              </Button>
            }
          >
            <SummaryList
              items={[
                { label: 'Application', value: selected().application },
                { label: 'URL', value: selected().url },
                { label: 'Event', value: selected().event },
              ]}
            />
            <Show when={latestDelivery()}>
              {(delivery) => (
                <ActivityList
                  aria-label="Latest delivery"
                  items={[
                    {
                      time: formatDisplayValue(delivery().time, 'datetime', {
                        dateFormat: 'MM/dd/yyyy',
                        timeFormat: 'HH:mm',
                      }),
                      dateTime: delivery().time,
                      actor: delivery().result,
                      text: delivery().event,
                      tone:
                        delivery().result === '200 OK' ? 'success' : 'error',
                    },
                  ]}
                />
              )}
            </Show>
            <Show when={result()}>
              <InlineAlert
                tone={selected().status === 'Paused' ? 'warning' : 'success'}
                announce="polite"
              >
                {result()}
              </InlineAlert>
            </Show>
          </FormGrid>
        </EntryPanel>
        <BlockTable
          table={deliveryTable}
          title="Recent deliveries"
          layout="panel"
          class="blocks-delivery-table"
          minWidth="28rem"
          pageScope={[selected().id, tests()]}
          messages={{ noRecords: 'No deliveries yet.' }}
          formatValue={(value, column) => {
            if (column.id === 'time')
              return <BlockDate value={blockCellText(value)} time />
            if (column.id === 'result')
              return <BlockStatus value={blockCellText(value)} />
            return undefined
          }}
        />
      </DashboardGrid>
    </BlockShell>
  )
}
