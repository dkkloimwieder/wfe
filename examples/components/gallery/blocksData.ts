export const tenants = [
  { id: 'northwind', name: 'Northwind', kind: 'Tenant', plan: 'Growth' },
  { id: 'contoso', name: 'Contoso', kind: 'Tenant', plan: 'Enterprise' },
  { id: 'globex', name: 'Globex', kind: 'Tenant', plan: 'Growth' },
] as const

export type Tenant = (typeof tenants)[number]

export const applications = [
  { name: 'Billing', description: 'Manage invoices and payments.' },
  { name: 'Inventory', description: 'Track stock and purchase orders.' },
  { name: 'Support', description: 'Manage requests and service queues.' },
] as const

export const roles = ['Administrator', 'Editor', 'Viewer'] as const
export const permissionActions = ['View', 'Edit', 'Manage'] as const
export const invoiceStatuses = ['Draft', 'Sent', 'Paid', 'Overdue'] as const

export const choicesFor = (values: readonly string[]) =>
  values.map((value) => ({ value, label: value }))

// Give each data set a fixed seed so reloading the gallery preserves its rows.
function samples<T>(
  length: number,
  seed: number,
  make: (
    index: number,
    choose: <V>(values: readonly V[]) => V,
    integer: (max: number) => number,
  ) => T,
) {
  function integer(max: number) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return Math.floor((seed / 2 ** 32) * max)
  }
  return Array.from({ length }, (_, index) =>
    make(index, (values) => values[integer(values.length)]!, integer),
  )
}

const day = (offset: number) =>
  new Date(Date.UTC(2026, 10, 1 + offset)).toISOString().slice(0, 10)

const instant = (offset: number, minute: number) =>
  new Date(Date.UTC(2026, 10, 1 + offset, 0, minute)).toISOString()

function byTenant<T>(
  make: (tenant: Tenant, index: number) => T,
): Record<string, T> {
  return Object.fromEntries(
    tenants.map((tenant, index) => [tenant.id, make(tenant, index)]),
  )
}

export type Member = {
  id: string
  name: string
  email: string
  role: string
  applications: string[]
  status: 'Active' | 'Invited'
  lastActive: string
}

export type ApiKey = {
  id: string
  name: string
  prefix: string
  created: string
  lastUsed: string
  scopes: string[]
}

export type AuditEvent = {
  id: string
  actor: string
  action: string
  target: string
  application: string
  time: string
}

const member = (
  name: string,
  role: string,
  access: string[],
  lastActive = '',
): Member => {
  const email = `${name.toLowerCase().replace(' ', '.')}@example.com`
  return {
    id: email,
    name,
    email,
    role,
    applications: access,
    status: lastActive ? 'Active' : 'Invited',
    lastActive,
  }
}

const tenantAdmins = ['Alex Morgan', 'Jamie Rivera', 'Robin Ellis'] as const
const firstNames = [
  'Adrian',
  'Ashley',
  'Avery',
  'Bailey',
  'Blair',
  'Cameron',
  'Casey',
  'Charlie',
  'Dana',
  'Drew',
  'Elliot',
  'Harper',
  'Jesse',
  'Jordan',
  'Lee',
  'Morgan',
  'Parker',
  'Quinn',
  'Reese',
  'Riley',
  'Sam',
  'Taylor',
]
const familyNames = [
  'Bell',
  'Brooks',
  'Chen',
  'Diaz',
  'Ellis',
  'Grant',
  'Kim',
  'Lane',
  'Lopez',
  'Miller',
  'Nguyen',
  'Park',
  'Patel',
  'Reed',
  'Scott',
  'Singh',
  'Shaw',
  'Wells',
]

export const membersByTenant = byTenant((_, tenantIndex) => {
  const names = firstNames.map(
    (name, index) =>
      `${name} ${familyNames[(index + tenantIndex * 5) % familyNames.length]}`,
  )
  return [
    member(
      tenantAdmins[tenantIndex]!,
      'Administrator',
      applications.map(({ name }) => name),
      day(23),
    ),
    ...samples(19, 1921 + tenantIndex, (index, choose, integer) => {
      const app = applications[index % applications.length]!
      const access: string[] = [app.name]
      if (integer(3) === 0)
        access.push(applications[(index + 1) % applications.length]!.name)
      return member(
        names[index]!,
        choose(roles),
        access,
        index % 6 === 3 ? undefined : day(23 - integer(28)),
      )
    }),
  ]
})

export const applicationAccessByTenant: Record<string, string[]> = {
  northwind: ['Billing', 'Inventory'],
  contoso: ['Billing', 'Inventory', 'Support'],
  globex: ['Billing', 'Support'],
}

const keyNames = ['Reporting', 'Import', 'Export', 'Sync', 'Monitoring']
export const keyScopes = ['Read records', 'Write records']

export const keysByTenant = byTenant((tenant, tenantIndex) =>
  samples<ApiKey>(
    [7, 4, 4][tenantIndex]!,
    3029 + tenantIndex,
    (index, choose, integer) => ({
      id: `${tenant.id}-key-${index + 1}`,
      name: `${applications[index % applications.length]!.name} ${keyNames[index % keyNames.length]}`,
      prefix: `demo_${tenant.id.slice(0, 2)}${String(index + 1).padStart(2, '0')}`,
      created: day(-index - integer(20)),
      lastUsed: index % 4 === 2 ? '' : day(23 - integer(18)),
      scopes: choose([keyScopes, keyScopes.slice(0, 1)]),
    }),
  ),
)

export const auditByTenant = byTenant((tenant, tenantIndex) =>
  samples<AuditEvent>(
    [168, 166, 166][tenantIndex]!,
    5939 + tenantIndex,
    (index, choose) => {
      const members = membersByTenant[tenant.id]!
      const actor = choose(members)
      const application = choose(applications).name
      const action = choose([
        { name: 'Changed member role', target: choose(members).email },
        { name: 'Enabled application', target: application },
        { name: 'Viewed report', target: `${application} summary` },
        { name: 'Exported records', target: application },
      ])
      return {
        id: `${tenant.id}-audit-${index + 1}`,
        actor: actor.name,
        action: action.name,
        target: action.target,
        application,
        time: instant(23 - Math.floor(index / 6), 960 - (index % 6) * 73),
      }
    },
  ),
)

export type Invoice = {
  id: string
  customer: string
  email: string
  issued: string
  due: string
  amount: number
  status: string
  notes: string
}

const customers = [
  ['Alder Studio', 'Jo Miller'],
  ['Cedar Supply', 'Avery Lane'],
  ['Harbor Works', 'Blair Scott'],
  ['Linden Market', 'Kit Brooks'],
  ['Maple Services', 'Lee Singh'],
  ['Birch Labs', 'Lena Park'],
  ['Summit Freight', 'Nina Wells'],
  ['Riverside Clinic', 'Evan Reed'],
] as const

export const initialInvoices = samples<Invoice>(
  240,
  997,
  (index, choose, integer) => {
    const [customer, contact] = index === 0 ? customers[0] : choose(customers)
    const issued = 23 - Math.floor(index / 8)
    const status = index === 0 ? 'Sent' : choose(invoiceStatuses)
    return {
      id: `INV-${1048 - index}`,
      customer,
      email: `${contact.toLowerCase().replace(' ', '.')}@example.com`,
      issued: day(issued),
      due: day(issued + (status === 'Overdue' ? 7 : 30)),
      amount: index === 0 ? 1200 : (12000 + integer(478000)) / 100,
      status,
      notes: `Monthly service invoice for ${contact}.`,
    }
  },
)

export const billingInvoicesByTenant = byTenant((_, tenantIndex) =>
  initialInvoices.filter((_, index) => index % tenants.length === tenantIndex),
)

export type AttentionItem = {
  id: string
  tenant: string
  application: string
  plan: string
  issue: string
  owner: string
  date: string
}

const incidentTypes = [
  { application: 'Billing', description: 'Invoice retries above target' },
  { application: 'Inventory', description: 'Stock import queue delayed' },
  { application: 'Support', description: 'Ticket delivery delayed' },
  { application: 'Billing', description: 'Payment reconciliation delayed' },
  { application: 'Inventory', description: 'Stock count sync incomplete' },
  { application: 'Support', description: 'Response time above target' },
]

export const attention = samples<AttentionItem>(12, 881, (index, choose) => {
  const tenant = tenants[index % tenants.length]!
  const issue = index < 3 ? incidentTypes[index]! : choose(incidentTypes)
  return {
    id: `ops-${48 - index}`,
    tenant: tenant.name,
    application: issue.application,
    plan: tenant.plan,
    issue: issue.description,
    owner: tenantAdmins[index % tenants.length]!,
    date: day(27 - index * 2),
  }
})

export type Deployment = {
  id: string
  tenant: string
  application: string
  version: string
  environment: string
  status: string
  time: string
}

export const deployments = samples<Deployment>(
  40,
  4087,
  (index, choose, integer) => ({
    id: `d-${40 - index}`,
    tenant: tenants[index % tenants.length]!.name,
    application: choose(applications).name,
    version: `${2 + integer(3)}.${8 + Math.floor((39 - index) / 5)}.${integer(4)}`,
    environment: index % 3 === 1 ? 'Staging' : 'Production',
    status:
      index % 8 === 2
        ? 'Rolled back'
        : index % 9 === 1
          ? 'In progress'
          : 'Succeeded',
    time: instant(28 - Math.floor(index / 2), 810 - (index % 2) * 160),
  }),
)

export const usageDays = Array.from({ length: 30 }, (_, index) => day(index))

export const operationsUsage = samples(
  usageDays.length,
  8179,
  (dayIndex, _choose, integer) => {
    const day = usageDays[dayIndex]!
    const weekend = new Date(day + 'T00:00:00Z').getUTCDay() % 6 === 0
    const daily = 6800 + dayIndex * 125 + integer(2400) - (weekend ? 2400 : 0)
    return tenants.flatMap((tenant, tenantIndex) =>
      applications.map(({ name: application }, appIndex) => {
        const share =
          [0.47, 0.32, 0.21][tenantIndex]! * [0.46, 0.34, 0.2][appIndex]!
        const requests = Math.round(daily * share) + integer(130)
        const errors = 2 + integer(8)
        return {
          day,
          tenant: tenant.name,
          application,
          requests,
          errors,
          previousRequests:
            tenant.id === 'globex' ? 0 : Math.round(requests * 0.86),
          previousErrors: tenant.id === 'globex' ? 0 : errors + 1,
        }
      }),
    )
  },
).flat()

export const monthlyUsers = [
  {
    tenant: 'Northwind',
    application: 'All applications',
    current: 590,
    previous: 551,
  },
  {
    tenant: 'Contoso',
    application: 'All applications',
    current: 398,
    previous: 382,
  },
  {
    tenant: 'Globex',
    application: 'All applications',
    current: 280,
    previous: 267,
  },
  { tenant: 'Northwind', application: 'Billing', current: 352, previous: 326 },
  {
    tenant: 'Northwind',
    application: 'Inventory',
    current: 241,
    previous: 235,
  },
  { tenant: 'Northwind', application: 'Support', current: 132, previous: 118 },
  { tenant: 'Contoso', application: 'Billing', current: 219, previous: 202 },
  { tenant: 'Contoso', application: 'Inventory', current: 154, previous: 146 },
  { tenant: 'Contoso', application: 'Support', current: 121, previous: 122 },
  { tenant: 'Globex', application: 'Billing', current: 170, previous: 166 },
  { tenant: 'Globex', application: 'Inventory', current: 103, previous: 94 },
  { tenant: 'Globex', application: 'Support', current: 76, previous: 80 },
]

export function inDateRange(
  date: string,
  range: { start?: string; end?: string } | undefined,
) {
  const day = date.slice(0, 10)
  return (
    (!range?.start || day >= range.start) && (!range?.end || day <= range.end)
  )
}

export const sortText = (a: unknown, b: unknown) =>
  (typeof a === 'string' ? a : '').localeCompare(typeof b === 'string' ? b : '')

export const tabNames = [
  'Members',
  'Applications',
  'Roles',
  'API keys',
  'Audit log',
]

export const permissionKey = (application: string, action: string) =>
  `${application}:${action}`

export const defaultPermissions: Record<string, string[]> = Object.fromEntries(
  roles.map((role) => [
    role,
    applications.flatMap(({ name }) =>
      permissionActions
        .filter(
          (action) =>
            role === 'Administrator' ||
            action === 'View' ||
            (role === 'Editor' && action === 'Edit'),
        )
        .map((action) => permissionKey(name, action)),
    ),
  ]),
)

export const billingPlans = [
  { name: 'Starter', monthly: 49, requests: 10000, members: 5 },
  { name: 'Growth', monthly: 149, requests: 50000, members: 25 },
  { name: 'Enterprise', monthly: 399, requests: 200000, members: 100 },
] as const

export const applicationUsage = byTenant((_, tenantIndex) =>
  applications.map(({ name }, appIndex) => ({
    name,
    requests: Math.round(
      [34600, 48200, 12500][appIndex]! * [1, 0.77, 0.53][tenantIndex]!,
    ),
  })),
)

export const catalogApps = [
  {
    ...applications[0],
    category: 'Finance',
    permissions: ['Read invoices', 'Record payments'],
  },
  {
    ...applications[1],
    category: 'Operations',
    permissions: ['Read stock levels', 'Update purchase orders'],
  },
  {
    ...applications[2],
    category: 'Service',
    permissions: ['Read support requests', 'Manage service queues'],
  },
]

export const tenantSettings = {
  name: tenants[0].name as string,
  email: 'alex.morgan@example.com',
  domain: 'northwind.example.com',
  workspaceName: 'Northwind workspace',
  helpEmail: 'help@example.com',
  requireMfa: true,
  timeout: '30',
}

export const accessProfile = {
  name: 'Alex Morgan',
  email: 'alex.morgan@example.com',
  lastActive: '2026-11-24',
}

export const accessMemberships = [
  {
    id: 'northwind',
    tenant: 'Northwind',
    billing: 'Administrator',
    inventory: 'Editor',
    support: 'Editor',
  },
  {
    id: 'contoso',
    tenant: 'Contoso',
    billing: 'Viewer',
    inventory: 'Viewer',
    support: 'No access',
  },
  {
    id: 'globex',
    tenant: 'Globex',
    billing: 'No access',
    inventory: 'Viewer',
    support: 'Viewer',
  },
]

export const accessSessions = [
  {
    id: 'desktop',
    device: 'Desktop browser',
    tenant: 'Northwind',
    active: '2026-11-24T15:30:00Z',
    current: true,
  },
  {
    id: 'phone',
    device: 'Phone browser',
    tenant: 'Contoso',
    active: '2026-11-23T13:40:00Z',
    current: false,
  },
  {
    id: 'tablet',
    device: 'Tablet browser',
    tenant: 'Globex',
    active: '2026-11-20T10:00:00Z',
    current: false,
  },
]

export const accessActivity = [
  {
    id: 'signed-in',
    tenant: 'Northwind',
    action: 'Signed in',
    time: '2026-11-24T15:30:00Z',
  },
  {
    id: 'record-updated',
    tenant: 'Northwind',
    action: 'Updated an invoice',
    time: '2026-11-24T15:34:00Z',
  },
  {
    id: 'invite-accepted',
    tenant: 'Contoso',
    action: 'Accepted an invitation',
    time: '2026-11-23T13:40:00Z',
  },
]

export type WebhookEndpoint = {
  id: string
  name: string
  application: string
  url: string
  event: string
  status: 'Active' | 'Paused'
}

export type WebhookDelivery = {
  id: string
  event: string
  result: string
  time: string
}

export const webhookEndpoints: WebhookEndpoint[] = [
  {
    id: 'billing',
    name: 'Billing webhook',
    application: 'Billing',
    url: 'https://billing.example.com/webhooks',
    event: 'Invoice paid',
    status: 'Active',
  },
  {
    id: 'inventory',
    name: 'Inventory webhook',
    application: 'Inventory',
    url: 'https://inventory.example.com/webhooks',
    event: 'Stock changed',
    status: 'Active',
  },
  {
    id: 'support',
    name: 'Support webhook',
    application: 'Support',
    url: 'https://support.example.com/webhooks',
    event: 'Request opened',
    status: 'Paused',
  },
]

export const webhookDeliveries: Record<string, WebhookDelivery[]> =
  Object.fromEntries(
    webhookEndpoints.map((endpoint, endpointIndex) => [
      endpoint.id,
      samples<WebhookDelivery>(
        [44, 36, 0][endpointIndex]!,
        7771 + endpointIndex,
        (index, _choose, integer) => ({
          id: `${endpoint.id}-delivery-${index + 1}`,
          event: endpoint.event,
          time: instant(24 - Math.floor(index / 3), 930 - (index % 3) * 120),
          result:
            index === 1 || integer(8) === 0 ? '503 Unavailable' : '200 OK',
        }),
      ),
    ]),
  )

export const sampleEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type SampleRecord = {
  id: string
  detail: string
  customer: string
  status: string
  date: string
  amount?: number
}

type RecordSample = {
  detailLabel: string
  dateLabel: string
  openStatus: string
  rows: SampleRecord[]
  amountLabel?: string
}

const inventoryItems = [
  'Wireless scanner',
  'Shipping label rolls',
  'Packing station scale',
  'Storage tote',
  'Carton rack',
  'Barcode printer',
  'Packing tape',
  'Hand truck',
  'Safety marker',
  'Workstation mat',
]

export const recordSamples: Readonly<Record<string, RecordSample | undefined>> =
  {
    Payments: {
      detailLabel: 'Invoice',
      dateLabel: 'Received',
      openStatus: 'Pending',
      amountLabel: 'Amount',
      rows: samples(180, 218, (index, choose) => {
        const invoice = initialInvoices[index]!
        return {
          id: `PAY-${218 - index}`,
          detail: invoice.id,
          customer: invoice.customer,
          status: choose(['Settled', 'Pending', 'Failed']),
          date: day(27 - Math.floor(index / 7)),
          amount: invoice.amount,
        }
      }),
    },
    'Credit notes': {
      detailLabel: 'Reason',
      dateLabel: 'Issued',
      openStatus: 'Draft',
      amountLabel: 'Amount',
      rows: samples(24, 584, (index, choose, integer) => ({
        id: `CR-${String(84 - index).padStart(3, '0')}`,
        detail: choose([
          'Returned equipment',
          'Duplicate charge',
          'Service adjustment',
        ]),
        customer: choose(customers)[0],
        status: choose(['Applied', 'Draft']),
        date: day(24 - index),
        amount: (2500 + integer(90000)) / 100,
      })),
    },
    Products: {
      detailLabel: 'Product',
      dateLabel: 'Updated',
      openStatus: 'Backordered',
      rows: samples(120, 6201, (index, choose) => ({
        id: `SKU-${201 - index}`,
        detail: choose(inventoryItems),
        customer: choose(customers)[0],
        status: choose(['In stock', 'Backordered', 'Discontinued']),
        date: day(25 - Math.floor(index / 5)),
      })),
    },
    'Stock moves': {
      detailLabel: 'Movement',
      dateLabel: 'Recorded',
      openStatus: 'Scheduled',
      rows: samples(300, 1408, (index, choose, integer) => ({
        id: `MOV-${408 - index}`,
        detail: `${1 + integer(42)} × ${choose(inventoryItems)}`,
        customer: choose(customers)[0],
        status: choose(['In transit', 'Scheduled', 'Received']),
        date: day(24 - Math.floor(index / 11)),
      })),
    },
    Tickets: {
      detailLabel: 'Subject',
      dateLabel: 'Opened',
      openStatus: 'Open',
      rows: samples(150, 1526, (index, choose) => ({
        id: `TKT-${526 - index}`,
        detail: choose([
          'Resend invoice receipt',
          'Check shipment status',
          'Update account contact',
          'Add a warehouse user',
          'Find a missing stock movement',
          'Review payment status',
        ]),
        customer: choose(customers)[0],
        status: choose(['Open', 'Waiting', 'Resolved']),
        date: day(25 - Math.floor(index / 6)),
      })),
    },
  }

export const ticketStatuses = [
  'New',
  'Open',
  'Pending customer',
  'On hold',
  'Solved',
  'Closed',
] as const
export const ticketPriorities = ['Low', 'Normal', 'High', 'Urgent'] as const
export const ticketChannels = ['Email', 'Web form', 'Chat', 'API'] as const
export const ticketAssignees = [...tenantAdmins, 'Unassigned'] as const
export const ticketLogLevels = ['Info', 'Warning', 'Error'] as const
export const ticketAgent = tenantAdmins[0]
export const ticketSnapshot = instant(24, 15 * 60)

export type TicketStatus = (typeof ticketStatuses)[number]
export type TicketPriority = (typeof ticketPriorities)[number]
export type TicketFeedback = {
  rating: number
  comment: string
  date: string
}

export type Ticket = {
  id: string
  subject: string
  customer: string
  contact: string
  email: string
  tenant: Tenant['name']
  application: string
  status: TicketStatus
  priority: TicketPriority
  channel: (typeof ticketChannels)[number]
  assignee: string
  created: string
  firstResponse: string
  lastResponse: string
  slaDue: string
  updated: string
  resolvedAt?: string
  tag: string
  feedback?: TicketFeedback
}

type TicketActivity = { author: string; time: string; text: string }
export type TicketMessage = TicketActivity & {
  channel: Ticket['channel']
  files?: readonly string[]
}
export type TicketNote = TicketActivity & { files?: readonly string[] }
export type TicketAttachment = {
  id: string
  name: string
  type: string
  size: number
  uploader: string
  date: string
  internal: boolean
}
type TicketLog = {
  id: string
  time: string
  level: (typeof ticketLogLevels)[number]
  source: string
  message: string
}

const ticketTopics = [
  {
    subject: 'Invoice export stops before download',
    tag: 'export',
    app: 'Billing',
    request:
      'The export stops after I select November. Can you help me get the invoice file?',
  },
  {
    subject: 'Stock counts differ after import',
    tag: 'import',
    app: 'Inventory',
    request:
      'The stock count in the app differs from the count in our import file. Can you check the import?',
  },
  {
    subject: 'Receipt missing from billing history',
    tag: 'receipt',
    app: 'Billing',
    request:
      'I can see the payment in the bank statement. Where can I get a copy of the receipt?',
  },
  {
    subject: 'Notifications reach the old address',
    tag: 'notifications',
    app: 'Support',
    request:
      'We changed our contact address last week, but ticket updates still go to the old inbox.',
  },
  {
    subject: 'Warehouse user cannot sign in',
    tag: 'access',
    app: 'Inventory',
    request:
      'Our new warehouse user accepted the invitation but cannot sign in.',
  },
  {
    subject: 'Webhook deliveries arrive twice',
    tag: 'webhook',
    app: 'Support',
    request:
      'We received two deliveries for the same ticket update. Can you check the delivery history?',
  },
  {
    subject: 'Payment still shows as processing',
    tag: 'payment',
    app: 'Billing',
    request:
      'Our payment went through this morning and still shows as processing in Billing.',
  },
  {
    subject: 'Stock movement is missing from report',
    tag: 'report',
    app: 'Inventory',
    request:
      'A stock movement appears in the item history but is missing from the report.',
  },
  {
    subject: 'API returns an empty ticket list',
    tag: 'api',
    app: 'Support',
    request:
      'The API returns an empty list for our saved queue, even though the tickets are visible in the app.',
  },
  {
    subject: 'Credit note shows the wrong date',
    tag: 'credit',
    app: 'Billing',
    request:
      'The credit note shows a different date from the one on our statement.',
  },
  {
    subject: 'Product photos do not load',
    tag: 'catalog',
    app: 'Inventory',
    request:
      'Several product photos stopped loading after we updated the catalog.',
  },
  {
    subject: 'Saved view is missing from the sidebar',
    tag: 'views',
    app: 'Support',
    request:
      'I saved a ticket view yesterday. How do I get it back in the sidebar?',
  },
]

const laterCustomerMessages = [
  'I tried again in another browser and saw the same result.',
  'This started after our morning update. The rest of the workspace works.',
  'I can confirm that it works for our team now. Thank you.',
]
const agentMessages = [
  'Thanks for the report. I found the request in our records. Can you confirm whether it also happens in a new session?',
  'I have the details I need. I will check the settings for your workspace.',
  'I updated the workspace settings. Please try the request again.',
  'Thanks for confirming. I have recorded the result on your ticket.',
]
const internalNotes = [
  'Checked the tenant settings and matched the request to the reported time.',
  'Asked the application team to review the request trace.',
  'Keep the request on the watch list until the next scheduled run.',
]
const ratingComments = [
  'I still needed help completing the task.',
  'The steps took longer than I expected.',
  'The answer covered my main question.',
  'The steps were clear and the fix worked.',
  'Quick reply. I was able to finish my work.',
]
const attachmentExamples = [
  { name: 'request-log.txt', type: 'text/plain' },
  { name: 'screen-capture.png', type: 'image/png' },
  { name: 'sample-export.csv', type: 'text/csv' },
  { name: 'request-details.json', type: 'application/json' },
]
const logMessages = {
  Info: 'Request received and validated',
  Warning: 'Request took longer than expected',
  Error: 'The request finished before a result was available',
}

const afterMinutes = (time: string, minutes: number) =>
  new Date(Date.parse(time) + minutes * 60_000).toISOString()
const threadLength = (ticket: Pick<Ticket, 'id' | 'status'>) =>
  ticket.status === 'New' ? 1 : 2 + (Number(ticket.id.slice(4)) % 7)
const replyInterval = 24

export function ticketIsResolved(status: TicketStatus) {
  return status === 'Solved' || status === 'Closed'
}

export function ticketSlaState(ticket: Ticket, now: string) {
  if (ticket.resolvedAt)
    return ticket.resolvedAt > ticket.slaDue ? 'Breached' : 'Met'
  if (ticket.slaDue < now) return 'Breached'
  return ticket.slaDue <= afterMinutes(now, 4 * 60) ? 'Due soon' : 'On track'
}

function sampleTickets(
  tenant: Tenant,
  tenantIndex: number,
  count: number,
  offset = 0,
  contact?: (typeof customers)[number],
) {
  return samples<Ticket>(
    count,
    9473 + tenantIndex + offset,
    (sampleIndex, choose, integer) => {
      const index = offset + sampleIndex
      const sequence = index * tenants.length + tenantIndex
      const topic =
        ticketTopics[(sequence + Math.floor(index / 3)) % ticketTopics.length]!
      const [customer, customerName] =
        contact ?? (sequence === 0 ? customers[0] : choose(customers))
      const status =
        sequence < 3
          ? (['Open', 'New', 'Pending customer'] as const)[sequence]!
          : choose(ticketStatuses)
      const priority =
        sequence === 0
          ? 'High'
          : choose(
              status === 'New'
                ? ticketPriorities.slice(0, 3)
                : ticketPriorities,
            )
      const created = instant(
        ticketIsResolved(status)
          ? 19 - Math.floor(index / 2)
          : 24 - Math.floor(index / 12),
        11 * 60 - (index % 2) * 90,
      )
      const id = `TKT-${String(1150 - sequence).padStart(4, '0')}`
      const length = threadLength({ id, status })
      const firstResponse =
        length > 1 ? afterMinutes(created, replyInterval) : ''
      const lastResponse =
        length > 1
          ? afterMinutes(
              created,
              (length - (length % 2 ? 2 : 1)) * replyInterval,
            )
          : ''
      const lastMessage = afterMinutes(created, (length - 1) * replyInterval)
      const dueInMinutes =
        sequence < 3 ? [210, 420, 510][sequence]! : (1 + integer(3)) * 1440
      const slaDue = afterMinutes(created, dueInMinutes)
      const resolvedAt = ticketIsResolved(status)
        ? afterMinutes(
            lastMessage,
            integer(5) === 0 ? dueInMinutes + 60 : 45 + integer(360),
          )
        : undefined
      const rating =
        resolvedAt && integer(5) > 0 ? choose([1, 2, 3, 4, 4, 5, 5, 5]) : 0
      return {
        id,
        subject: topic.subject,
        customer,
        contact: customerName,
        email: `${customerName.toLowerCase().replace(' ', '.')}@example.com`,
        tenant: tenant.name,
        application: topic.app,
        status,
        priority,
        channel: sequence === 0 ? 'Email' : choose(ticketChannels),
        assignee:
          status === 'New'
            ? 'Unassigned'
            : sequence === 0
              ? ticketAgent
              : choose(ticketAssignees),
        created,
        firstResponse,
        lastResponse,
        slaDue,
        updated: resolvedAt ?? lastMessage,
        resolvedAt,
        tag: topic.tag,
        feedback:
          resolvedAt && rating
            ? {
                rating,
                comment: ratingComments[rating - 1]!,
                date: afterMinutes(resolvedAt, 60 + integer(720)),
              }
            : undefined,
      }
    },
  )
}

export const portalContact = {
  customer: customers[0][0],
  name: customers[0][1],
  email: 'jo.miller@example.com',
}

const trackerTicketsPerTenant = 50
const portalTicketsPerTenant = 40
export const initialTickets = tenants
  .flatMap((tenant, index) => {
    const tickets = sampleTickets(tenant, index, trackerTicketsPerTenant)
    const portalCount = tickets.filter(
      ({ email }) => email === portalContact.email,
    ).length
    return [
      ...tickets,
      ...sampleTickets(
        tenant,
        index,
        portalTicketsPerTenant - portalCount,
        trackerTicketsPerTenant,
        customers[0],
      ),
    ]
  })
  .sort((a, b) => sortText(b.id, a.id))

function buildPublicTicketDetail(ticket: Ticket) {
  const seed = Number(ticket.id.slice(4))
  const topic = ticketTopics.find(({ tag }) => tag === ticket.tag)!
  const length = threadLength(ticket)
  const agent = ticket.assignee === 'Unassigned' ? ticketAgent : ticket.assignee
  const messages = Array.from({ length }, (_, index): TicketMessage => {
    const fromCustomer = index % 2 === 0
    return {
      author: fromCustomer ? ticket.contact : agent,
      time: afterMinutes(ticket.created, index * replyInterval),
      channel: ticket.channel,
      text:
        index === 0
          ? topic.request
          : fromCustomer
            ? laterCustomerMessages[index / 2 - 1]!
            : agentMessages[(index - 1) / 2]!,
    }
  })
  const attachments = samples<TicketAttachment>(
    seed % 5 || (seed === 1150 ? 2 : 0),
    seed + 439,
    (index, _choose, integer) => ({
      id: `file-${index + 1}`,
      ...attachmentExamples[index]!,
      size: 1024 + integer(260_000),
      uploader: ticket.contact,
      date: afterMinutes(ticket.created, index * 2),
      internal: false,
    }),
  )
  return { messages, attachments }
}

export function buildTicketDetail(ticket: Ticket) {
  const seed = Number(ticket.id.slice(4))
  const agent = ticket.assignee === 'Unassigned' ? ticketAgent : ticket.assignee
  const { messages, attachments } = buildPublicTicketDetail(ticket)
  const notes = samples<TicketNote>(seed % 4, seed + 871, (index, choose) => ({
    author: choose(tenantAdmins),
    time: afterMinutes(ticket.created, 4 + index * 8),
    text: internalNotes[index]!,
  }))
  const logs = samples<TicketLog>(seed % 21, seed + 690, (index, choose) => {
    const level = choose(ticketLogLevels)
    return {
      id: `log-${index + 1}`,
      time: afterMinutes(ticket.created, index * 2),
      level,
      source: index % 3 === 0 ? 'Customer report' : ticket.application,
      message: logMessages[level],
    }
  })
  const history: TicketActivity[] = [
    {
      author: ticket.contact,
      time: ticket.created,
      text: 'Created ticket with status New.',
    },
    {
      author: 'System',
      time: ticket.created,
      text: `Set priority to ${ticket.priority}.`,
    },
  ]
  if (ticket.assignee !== 'Unassigned')
    history.push({
      author: 'System',
      time: afterMinutes(ticket.created, 2),
      text: `Assigned to ${ticket.assignee}.`,
    })
  if (ticket.status !== 'New')
    history.push({
      author: agent,
      time: ticket.updated,
      text: `Changed status to ${ticket.status}.`,
    })
  return { messages, notes, attachments, logs, history }
}

const portalTicketsByTenant = byTenant((tenant) =>
  initialTickets.filter(
    (ticket) =>
      ticket.tenant === tenant.name && ticket.email === portalContact.email,
  ),
)

export function customerTickets(tenant: Tenant) {
  return portalTicketsByTenant[tenant.id]!.map((ticket) => {
    const { messages, attachments } = buildPublicTicketDetail(ticket)
    return {
      id: ticket.id,
      subject: ticket.subject,
      application: ticket.application,
      category: ticket.tag[0]!.toUpperCase() + ticket.tag.slice(1),
      priority: ticket.priority,
      status: ticket.status,
      updated: ticket.updated,
      resolvedAt: ticket.resolvedAt,
      feedback: ticket.feedback,
      messages,
      attachments: attachments
        .filter((file) => !file.internal)
        .map(({ name }) => name),
    }
  })
}

export const portalCategories = ['Access', 'Billing', 'Data', 'Other'] as const

export const userMember = {
  name: portalContact.name,
  email: portalContact.email,
  language: 'English',
  timeZone: 'America/New_York',
}

export const memberAppAccess: Record<string, readonly string[]> = {
  northwind: ['Billing', 'Inventory'],
  contoso: ['Inventory', 'Support'],
  globex: ['Billing', 'Support'],
}

const memberActions = [
  ['Billing', 'Downloaded an invoice'],
  ['Inventory', 'Viewed a stock report'],
  ['Billing', 'Updated a billing contact'],
  ['Inventory', 'Reviewed stock movements'],
  ['Billing', 'Exported the payment history'],
  ['Inventory', 'Checked a purchase order'],
  ['Billing', 'Reviewed an overdue invoice'],
  ['Inventory', 'Recorded a stock adjustment'],
  ['Billing', 'Downloaded a receipt'],
  ['Inventory', 'Checked low stock alerts'],
  ['Billing', 'Viewed the billing forecast'],
  ['Inventory', 'Opened the warehouse directory'],
] as const

export const memberActivity = samples(25, 5197, (index, _choose, integer) => {
  const [actor, text] = memberActions[index % memberActions.length]!
  return { actor, text, time: instant(24 - index, 9 * 60 + integer(480)) }
})

const announcementTopics = [
  [
    'reports',
    'Stock report schedule',
    'The weekly stock report is now available on Friday.',
  ],
  [
    'receipts',
    'Updated billing receipts',
    'Receipts now include the tenant name and invoice number.',
  ],
  [
    'support',
    'December support hours',
    'The support team will start at 09:00 UTC on December 1.',
  ],
  [
    'handbook',
    'Member handbook',
    'The member handbook includes a new guide to security settings.',
  ],
] as const

export const memberAnnouncements = [
  {
    id: 'announcement-maintenance',
    title: 'Scheduled maintenance',
    text: 'Inventory reports will be unavailable on November 28 from 02:00 to 03:00 UTC.',
    author: 'Alex Morgan',
    time: instant(24, 10 * 60),
  },
  {
    id: 'announcement-exports',
    title: 'New invoice export options',
    text: 'Billing exports now include the invoice due date and payment status.',
    author: 'Jamie Rivera',
    time: instant(22, 13 * 60),
  },
  ...samples(announcementTopics.length, 7301, (index, choose, integer) => {
    const [topic, title, text] = announcementTopics[index]!
    return {
      id: `announcement-${topic}`,
      title,
      text,
      author: choose(tenantAdmins),
      time: instant(20 - index, 9 * 60 + integer(480)),
    }
  }),
]

const taskTopics = [
  ['Inventory', 'Check low stock items'],
  ['Billing', 'Review overdue invoices'],
  ['Inventory', 'Verify stock adjustments'],
  ['Billing', 'Confirm the tax address'],
  ['Inventory', 'Check outstanding purchase orders'],
  ['Billing', 'Review the December billing forecast'],
  ['Inventory', 'Schedule a stock count'],
  ['Billing', 'Download the payment history'],
  ['Inventory', 'Review warehouse permissions'],
] as const

export const memberTasks = [
  {
    id: 'task-stock',
    title: 'Review the November stock report',
    application: 'Inventory',
    due: day(27),
  },
  {
    id: 'task-contact',
    title: 'Confirm the billing contact',
    application: 'Billing',
    due: day(29),
  },
  {
    id: 'task-export',
    title: 'Download the November invoice export',
    application: 'Billing',
    due: day(31),
  },
  ...samples(taskTopics.length, 7389, (index, _choose, integer) => {
    const [application, title] = taskTopics[index]!
    return {
      id: `task-review-${index + 1}`,
      title,
      application,
      due: day(32 + index + integer(4)),
    }
  }),
]

export const notificationTypes = [
  'Support',
  'Tasks',
  'Announcements',
  'Security',
] as const

const otherSessionDevices = [
  'Work laptop',
  'Mobile app',
  'Backup laptop',
  'Home desktop',
  'Tablet app',
]

export const userAccessSessions = [
  ...accessSessions,
  ...samples(otherSessionDevices.length, 7731, (index, choose, integer) => ({
    id: `session-${index + 1}`,
    device: otherSessionDevices[index]!,
    tenant: choose(tenants).name,
    active: instant(18 - index, 9 * 60 + integer(480)),
    current: false,
  })),
]

export function userNotifications(tenant: Tenant) {
  const tickets = portalTicketsByTenant[tenant.id]!
  const notices = [
    ...tickets
      .filter((ticket) => ticket.firstResponse)
      .map((ticket) => ({
        id: ticket.id,
        type: 'Support' as const,
        title: ticket.subject,
        target: ticket.id,
        time: ticket.updated,
      })),
    ...memberTasks.map(({ id, title }, index) => ({
      id,
      type: 'Tasks' as const,
      title,
      target: id,
      time: instant(24 - index, 10 * 60),
    })),
    ...memberAnnouncements.map(({ id, title, time }) => ({
      id,
      type: 'Announcements' as const,
      title,
      target: id,
      time,
    })),
    ...userAccessSessions.map((session) => ({
      id: session.id,
      type: 'Security' as const,
      title:
        session.id === 'desktop'
          ? 'New sign-in on a desktop browser'
          : `New sign-in on ${session.device.toLowerCase()}`,
      target: session.id,
      time: session.active,
    })),
  ]
  // Fill the inbox with ticket receipt events as well as conversation updates.
  const receipts = tickets.slice(0, 80 - notices.length).map((ticket) => ({
    id: `received-${ticket.id}`,
    type: 'Support' as const,
    title: `Ticket received: ${ticket.subject}`,
    target: ticket.id,
    time: ticket.created,
  }))
  return [...notices, ...receipts]
    .sort((a, b) => b.time.localeCompare(a.time))
    .map((notification, index) => ({ ...notification, read: index > 3 }))
}

const tokenNames = [
  'Reports export',
  'Inventory reader',
  'Daily backup',
  'Invoice archive',
  'Warehouse scanner',
  'Payments audit',
  'Monthly dashboard',
  'Support integration',
  'Stock alerts',
  'Accounting sync',
]

export const personalTokens = samples(
  tokenNames.length,
  1427,
  (index, _choose, integer) => ({
    id: `token-${index + 1}`,
    name: tokenNames[index]!,
    created: day(10 + index),
    lastUsed:
      index === 2 || (index > 2 && integer(4) === 0)
        ? ''
        : day(22 + (index % 3)),
  }),
)

export const memberInvitation = {
  tenant: tenants[0],
  inviter: 'Alex Morgan',
  name: portalContact.name,
  email: portalContact.email,
  role: 'Member',
}
