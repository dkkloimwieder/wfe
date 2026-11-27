import { createSignal } from 'solid-js'
import { Badge, Button, StatusTile, TileRow } from '@wfe/components'
import {
  ActivityList,
  DashboardGrid,
  DashboardHeaderActions,
  DashboardPanel,
  DashboardShell,
} from '@wfe/components/layout'
import type { ActivityListItem } from '@wfe/components/layout'

const deliveries: readonly ActivityListItem[] = [
  {
    time: '10:24 UTC',
    dateTime: '10:24Z',
    actor: 'Billing service',
    text: 'Delivered the invoice event.',
    tone: 'success',
  },
  {
    time: '10:18 UTC',
    dateTime: '10:18Z',
    actor: 'Inventory service',
    text: 'Scheduled a retry after a timeout.',
    tone: 'warning',
  },
  {
    time: '10:12 UTC',
    dateTime: '10:12Z',
    actor: 'Alex Chen',
    text: 'Enabled the billing endpoint.',
  },
]

function DeliveryHistory() {
  const [refreshes, setRefreshes] = createSignal(0)
  return (
    <>
      <DashboardHeaderActions>
        <Button onClick={() => setRefreshes((count) => count + 1)}>
          Refresh deliveries
        </Button>
      </DashboardHeaderActions>
      <DashboardPanel
        title="Delivery history"
        titleAs="h3"
        description="Recent events from your endpoints."
        headerEnd={<Badge tone="success">Connected</Badge>}
        footer={
          <Button onClick={() => setRefreshes(0)} disabled={!refreshes()}>
            Reset count
          </Button>
        }
        role="group"
      >
        <ActivityList items={deliveries} aria-label="Recent deliveries" />
        <div role="status">
          {refreshes()
            ? `Refreshes this session ${refreshes()}.`
            : 'Up to date.'}
        </div>
      </DashboardPanel>
    </>
  )
}

export function DashboardLayoutExample() {
  const [flush, setFlush] = createSignal(false)
  return (
    <div class="gallery-example-fill">
      <DashboardShell
        title="Webhook dashboard"
        titleAs="h2"
        mainAs="section"
        mainLabel="Webhook dashboard content"
        mainPadding={flush() ? 'none' : undefined}
        headerActions={
          <Button
            aria-pressed={flush() ? 'true' : 'false'}
            onClick={() => setFlush(!flush())}
          >
            Edge-to-edge content
          </Button>
        }
      >
        <TileRow
          columns={{ narrow: 1, medium: 2, wide: 4 }}
          gap="layout"
          role="group"
          aria-label="Delivery totals"
        >
          <StatusTile label="Delivered" value={84} state="ok" />
          <StatusTile label="Retried" value={4} state="warning" />
          <StatusTile label="Pending" value={2} state="unknown" />
          <StatusTile label="Endpoints" value={3} state="ok" />
        </TileRow>
        <DashboardGrid minPanelWidth="22rem" gap="layout">
          <DeliveryHistory />
          <DashboardPanel
            title="Endpoint"
            titleAs="h3"
            description="Receives invoice events."
          >
            <p>Billing service</p>
          </DashboardPanel>
        </DashboardGrid>
      </DashboardShell>
    </div>
  )
}
