import { createSignal, Show } from 'solid-js'
import {
  Button,
  Field,
  FormActions,
  InlineAlert,
  Label,
  SelectField,
  Sheet,
  SummaryList,
} from '@wfe/components'
import type { TableRowActionContext } from '@wfe/components/table'
import {
  blockCellText,
  BlockDate,
  BlockNavigation,
  BlockShell,
  BlockStatus,
  BlockTable,
  createBlockTable,
} from './blocksParts'
import { webhookDeliveries, webhookEndpoints } from './blocksData'
import type { WebhookDelivery, WebhookEndpoint } from './blocksData'

export const integrationSections = ['Webhook endpoints', 'Deliveries'] as const
const [endpointsSection, deliveriesSection] = integrationSections
const endpointNames = new Map(
  webhookEndpoints.map(({ id, name }) => [id, name]),
)
const endpointChoices = webhookEndpoints.map(({ id, name }) => ({
  value: id,
  label: name,
}))
const defaultEndpoint = webhookEndpoints[0]!.id

export function BlocksIntegrations(
  props: {
    contentOnly?: boolean
    visible?: boolean
    section?: string
  } = {},
) {
  const [selected, setSelected] = createSignal<string>(endpointsSection)
  const section = () => props.section ?? selected()
  const [endpointFilter, setEndpointFilter] = createSignal(defaultEndpoint)
  const [detail, setDetail] = createSignal<WebhookEndpoint>()
  const [deliveries, setDeliveries] = createSignal(webhookDeliveries)
  const [result, setResult] = createSignal('')
  let testSequence = 0
  let restoreFocus: TableRowActionContext['getMenuTrigger'] | undefined

  const table = createBlockTable(
    () => webhookEndpoints,
    [
      { id: 'name', header: 'Endpoint', accessorKey: 'name' },
      { id: 'application', header: 'Application', accessorKey: 'application' },
      { id: 'event', header: 'Event', accessorKey: 'event' },
      { id: 'status', header: 'Status', accessorKey: 'status' },
    ],
  )
  const deliveryTable = createBlockTable(() => {
    const endpoint = endpointFilter()
    return (deliveries()[endpoint] ?? []).map((row) => ({
      ...row,
      endpoint: endpointNames.get(endpoint) ?? '',
    }))
  }, [
    { id: 'endpoint', header: 'Endpoint', accessorKey: 'endpoint' },
    { id: 'event', header: 'Event', accessorKey: 'event' },
    { id: 'time', header: 'Time (UTC)', accessorKey: 'time' },
    { id: 'result', header: 'Result', accessorKey: 'result' },
  ])

  function sendTestEvent(endpoint: WebhookEndpoint) {
    if (endpoint.status === 'Paused') {
      setResult('The endpoint is paused. No event was sent.')
      return
    }
    const delivery: WebhookDelivery = {
      id: `test-${++testSequence}`,
      event: `Test: ${endpoint.event}`,
      time: new Date().toISOString(),
      result: '200 OK',
    }
    setDeliveries((rows) => ({
      ...rows,
      [endpoint.id]: [delivery, ...(rows[endpoint.id] ?? [])],
    }))
    setResult('Test delivery succeeded. The example response was 200 OK.')
  }

  return (
    <BlockShell
      title="Integrations and webhooks"
      fillTable
      contentOnly={props.contentOnly}
      visible={props.visible}
      navigationLabel="Integrations navigation"
      navigation={(controls) => (
        <BlockNavigation
          title="Integrations"
          sections={integrationSections}
          value={section()}
          onChange={setSelected}
          controls={controls}
        />
      )}
    >
      <Show when={section() === endpointsSection}>
        <BlockTable
          table={table}
          title={endpointsSection}
          class="blocks-endpoints-table"
          minWidth="32rem"
          messages={{
            rowActions: (id) => `Actions for ${endpointNames.get(id) ?? id}`,
          }}
          rowActions={(row, context) => {
            const endpoint = row.original
            if (!endpoint) return
            return [
              {
                label: 'View details',
                onSelect: () => {
                  restoreFocus = context.getMenuTrigger
                  setResult('')
                  setDetail(endpoint)
                },
              },
            ]
          }}
          formatValue={(value, column) =>
            column.id === 'status' ? (
              <BlockStatus value={blockCellText(value)} />
            ) : undefined
          }
        />
        <Sheet
          open={Boolean(detail())}
          onOpenChange={(open) => {
            if (!open) setDetail(undefined)
          }}
        >
          <Sheet.Portal>
            <Sheet.Overlay />
            <Show when={detail()} keyed>
              {(endpoint) => {
                const latest = () => deliveries()[endpoint.id]?.[0]
                return (
                  <Sheet.Content
                    size="wide"
                    restoreFocus={() => restoreFocus?.()}
                  >
                    <Sheet.Title>{endpoint.name}</Sheet.Title>
                    <Sheet.Description>{endpoint.url}</Sheet.Description>
                    <SummaryList
                      items={[
                        { label: 'Application', value: endpoint.application },
                        { label: 'Event', value: endpoint.event },
                        {
                          label: 'Status',
                          value: <BlockStatus value={endpoint.status} />,
                        },
                      ]}
                    />
                    <Show when={latest()}>
                      {(delivery) => (
                        <SummaryList
                          items={[
                            {
                              label: 'Latest delivery',
                              value: <BlockDate value={delivery().time} time />,
                            },
                            {
                              label: 'Result',
                              value: <BlockStatus value={delivery().result} />,
                            },
                          ]}
                        />
                      )}
                    </Show>
                    <Show when={result()}>
                      <InlineAlert
                        tone={
                          endpoint.status === 'Paused' ? 'warning' : 'success'
                        }
                        announce="polite"
                      >
                        {result()}
                      </InlineAlert>
                    </Show>
                    <FormActions>
                      <Button
                        tone="primary"
                        onClick={() => sendTestEvent(endpoint)}
                      >
                        Send test event
                      </Button>
                      <Sheet.CloseButton aria-label="Close">
                        Close
                      </Sheet.CloseButton>
                    </FormActions>
                  </Sheet.Content>
                )
              }}
            </Show>
          </Sheet.Portal>
        </Sheet>
      </Show>
      <Show when={section() === deliveriesSection}>
        <BlockTable
          table={deliveryTable}
          title={deliveriesSection}
          class="blocks-delivery-table"
          minWidth="30rem"
          pageScope={[endpointFilter()]}
          filtersActive={endpointFilter() !== defaultEndpoint}
          onClearFilters={() => setEndpointFilter(defaultEndpoint)}
          extraFilters={
            <Field>
              <Label>Endpoint</Label>
              <SelectField
                label="Endpoint"
                choices={endpointChoices}
                value={endpointFilter()}
                onValueChange={setEndpointFilter}
              />
            </Field>
          }
          messages={{ noRecords: 'No deliveries yet.' }}
          formatValue={(value, column) => {
            if (column.id === 'time')
              return <BlockDate value={blockCellText(value)} time />
            if (column.id === 'result')
              return <BlockStatus value={blockCellText(value)} />
            return undefined
          }}
        />
      </Show>
    </BlockShell>
  )
}
