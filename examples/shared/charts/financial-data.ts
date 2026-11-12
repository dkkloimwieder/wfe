import {
  defineChart,
  rect,
  lineY,
  lineX,
  dot,
  decorative,
  scaleLinear,
  scalePoint,
  tooltip,
  tooltipPortal,
} from '@wfe/components/chart'

export const marketSessions = [
  {
    id: '2026-10-26',
    session: 1,
    open: 102.4,
    high: 106.2,
    low: 101.1,
    close: 105.3,
    volume: 12400,
  },
  {
    id: '2026-10-27',
    session: 2,
    open: 105.3,
    high: 106.8,
    low: 100.7,
    close: 101.8,
    volume: 18300,
  },
  {
    id: '2026-10-28',
    session: 3,
    open: 101.8,
    high: 104.9,
    low: 100.9,
    close: 104.2,
    volume: 15100,
  },
  {
    id: '2026-10-29',
    session: 4,
    open: 104.2,
    high: 105.6,
    low: 102.2,
    close: 104.2,
    volume: 9700,
  },
  {
    id: '2026-10-30',
    session: 5,
    open: 104.2,
    high: 109.4,
    low: 103.8,
    close: 108.6,
    volume: 22100,
  },
] as const
export const comparisons = [
  { id: 'North', before: 72, after: 84, customers: 240, cost: 38, revenue: 92 },
  { id: 'South', before: 81, after: 76, customers: 120, cost: 52, revenue: 70 },
  { id: 'East', before: 65, after: 78, customers: 360, cost: 46, revenue: 105 },
  { id: 'West', before: 88, after: 91, customers: 180, cost: 61, revenue: 118 },
] as const
export type FinancialPoint = {
  id: string
  x: number
  y: number
  group: string
  details: string
  source: (typeof marketSessions)[number] | (typeof comparisons)[number]
}
const usd = (value: number) => `$${value.toFixed(2)}`
const common = {
  margin: { left: 62, right: 26, top: 20, bottom: 54 },
  tooltip: { use: tooltip, portal: tooltipPortal },
  maxFocusDistance: Infinity,
}
const accent = 'var(--ui-accent)'
export const financialPanels = [
  {
    id: 'candlestick',
    title: 'Candlestick',
    description:
      'Simulated ACME sessions. Bodies span open to close; wicks span low to high. Hollow bodies rise, filled bodies fall, and a horizontal stroke means unchanged. Prices in USD.',
  },
  {
    id: 'ohlc',
    title: 'OHLC',
    description:
      'The same sessions: left ticks show open, right ticks show close, and vertical strokes show the full price range. Prices in USD.',
  },
  {
    id: 'dumbbell',
    title: 'Dumbbell comparison',
    description:
      'Regional completion rates in September and October. Hollow dots show September; filled dots show October. Connectors retain direction in the details.',
  },
  {
    id: 'slope',
    title: 'Slope comparison',
    description:
      'The same regional completion rates across two months on a shared percent scale. Read endpoint details to distinguish overlapping regions.',
  },
  {
    id: 'bubble',
    title: 'Bubble scatter',
    description:
      'Regional cost and revenue per customer in USD. Bubble area is proportional to customer count; a bubble with four times the customers has twice the radius.',
  },
  ...['North', 'South', 'East', 'West'].map((region) => ({
    id: `multiple-${region}`,
    title: `${region} small multiple`,
    description:
      'Aligned monthly completion rates. Every panel uses the same 50–100% vertical limits and September–October horizontal limits.',
  })),
]
export function financialDefinition(
  id: string,
  revision = 0,
  empty = false,
  reversed = false,
) {
  // Cycle the demonstration values while preserving realistic completion rates
  // and the shared fixed limits used to compare repeated refreshes.
  const delta = Number.isFinite(revision)
    ? Math.max(0, Math.trunc(revision)) % 5
    : 0
  const market = empty ? [] : [...marketSessions]
  const regions = empty ? [] : [...comparisons]
  if (reversed) {
    market.reverse()
    regions.reverse()
  }
  const points: FinancialPoint[] = []
  if (id === 'candlestick' || id === 'ohlc') {
    const rows = market.map((source) => ({
      id: source.id,
      x: source.session,
      y: source.close + delta,
      group: source.close < source.open ? 'Fall' : 'Rise',
      source,
      details: `${source.id}; open ${usd(source.open + delta)}, high ${usd(source.high + delta)}, low ${usd(source.low + delta)}, close ${usd(source.close + delta)}; volume ${source.volume} shares`,
      left: source.session - 0.22,
      right: source.session + 0.22,
      open: source.open + delta,
      close: source.close + delta,
    }))
    const segments = rows.flatMap((row) => [
      decorative(
        lineY(
          [
            { ...row, id: `${row.id}:low`, y: row.source.low + delta },
            { ...row, id: `${row.id}:high`, y: row.source.high + delta },
          ],
          {
            id: `wick-${row.id}`,
            key: 'id',
            x: 'x',
            y: 'y',
            stroke: 'var(--ui-text)',
          },
        ),
      ),
      ...(id === 'ohlc' || row.open === row.close
        ? [
            decorative(
              lineY(
                [
                  { ...row, x: row.left, y: row.open },
                  { ...row, y: row.open },
                ],
                { id: `open-${row.id}`, x: 'x', y: 'y' },
              ),
            ),
            decorative(
              lineY(
                [
                  { ...row, y: row.close },
                  { ...row, x: row.right, y: row.close },
                ],
                { id: `close-${row.id}`, x: 'x', y: 'y' },
              ),
            ),
          ]
        : [
            decorative(
              rect([row], {
                id: `body-${row.id}`,
                x1: 'left',
                x2: 'right',
                y1: 'open',
                y2: 'close',
                fill: row.group === 'Fall' ? accent : 'var(--ui-surface)',
                stroke: accent,
                strokeWidth: 2,
              }),
            ),
          ]),
    ])
    return defineChart({
      ...common,
      marks: [
        ...segments,
        dot(rows, {
          id: 'session-details',
          key: 'id',
          x: 'x',
          y: 'y',
          r: 4,
          fill: accent,
        }),
      ],
      scales: {
        x: {
          scale: scaleLinear().domain([0.5, 5.5]),
          axis: {
            label: 'Trading session (UTC)',
            ticks: {
              values: [1, 2, 3, 4, 5],
              format: (n: number) => `Oct ${25 + n}`,
            },
          },
        },
        y: {
          scale: scaleLinear().domain([98, 114]),
          axis: {
            label: 'Price (USD)',
            ticks: { format: (n: number) => `$${n}` },
          },
        },
      },
    })
  }
  const filtered = id.startsWith('multiple-')
    ? regions.filter((row) => row.id === id.slice(9))
    : regions
  for (const source of filtered) {
    const details = `${source.id}; September ${source.before}%, October ${source.after + delta}%; change ${source.after + delta - source.before} percentage points; ${source.customers} customers; cost $${source.cost}, revenue $${source.revenue} per customer`
    if (id === 'bubble')
      points.push({
        id: source.id,
        x: source.cost,
        y: source.revenue,
        group: source.id,
        details,
        source,
      })
    else
      for (const month of [0, 1])
        points.push({
          id: `${source.id}-${month}`,
          x: month,
          y: month ? source.after + delta : source.before,
          group: source.id,
          details,
          source,
        })
  }
  if (id === 'bubble')
    return defineChart({
      ...common,
      marks: [
        dot(points, {
          id: 'customer-bubbles',
          key: 'id',
          x: 'x',
          y: 'y',
          r: (row) =>
            Math.sqrt(
              ('customers' in row.source ? row.source.customers : 0) / Math.PI,
            ) * 1.8,
          fillOpacity: 0.5,
          stroke: 'var(--ui-text)',
        }),
      ],
      scales: {
        x: {
          scale: scaleLinear().domain([20, 80]),
          axis: { label: 'Cost / customer (USD)' },
        },
        y: {
          scale: scaleLinear().domain([40, 140]),
          axis: { label: 'Revenue / customer (USD)' },
        },
      },
    })
  if (id === 'dumbbell')
    return defineChart({
      ...common,
      marks: [
        ...filtered.map((row) =>
          decorative(
            lineX(
              [
                { id: 'before', x: row.before, y: row.id },
                { id: 'after', x: row.after + delta, y: row.id },
              ],
              { id: `connector-${row.id}`, key: 'id', x: 'x', y: 'y' },
            ),
          ),
        ),
        dot(
          points.filter((point) => point.x === 0),
          {
            id: 'comparison-before',
            key: 'id',
            x: 'y',
            y: 'group',
            r: 5,
            fill: 'var(--ui-surface)',
            stroke: accent,
            strokeWidth: 2,
          },
        ),
        dot(
          points.filter((point) => point.x === 1),
          {
            id: 'comparison-after',
            key: 'id',
            x: 'y',
            y: 'group',
            r: 5,
            fill: accent,
            stroke: accent,
            strokeWidth: 2,
          },
        ),
      ],
      scales: {
        x: {
          scale: scaleLinear().domain([50, 100]),
          axis: { label: 'Completion (%)' },
        },
        y: {
          scale: scalePoint<string>().domain(comparisons.map((row) => row.id)),
          axis: { label: 'Region' },
        },
      },
    })
  return defineChart({
    ...common,
    marks: [
      ...filtered.map((row, index) =>
        decorative(
          lineY(
            points
              .filter((point) => point.group === row.id)
              .sort((a, b) => a.x - b.x),
            {
              id: `slope-${row.id}`,
              x: 'x',
              y: 'y',
              strokeDasharray: [undefined, '6 3', '2 3', '8 3 2 3'][index],
            },
          ),
        ),
      ),
      dot(points, { id: 'monthly-endpoints', key: 'id', x: 'x', y: 'y', r: 5 }),
    ],
    scales: {
      x: {
        scale: scaleLinear().domain([-0.15, 1.15]),
        axis: {
          label: 'Month',
          ticks: {
            values: [0, 1],
            format: (n: number) => (n === 0 ? 'September' : 'October'),
          },
        },
      },
      y: {
        scale: scaleLinear().domain([50, 100]),
        axis: { label: 'Completion (%)' },
      },
    },
  })
}
