// Generated from built declarations by tests/consumers/generate.mjs.
// Resolve only public package exports through the workspace node_modules links.
import type {
  angleGrid,
  AngleGridOptions,
  areaY,
  barX,
  barY,
  BinOptions,
  binX,
  BinXDatum,
  binY,
  BinYDatum,
  cell,
  CellOptions,
  Chart,
  ChartDefinition,
  ChartKey,
  ChartLegend,
  ChartLegendItem,
  ChartLegendProps,
  ChartMark,
  ChartPoint,
  ChartProps,
  ChartScene,
  ChartSpec,
  ChartTheme,
  ChartTooltipContent,
  ChartTooltipContext,
  ChartValue,
  colorLegend,
  colorLegendItems,
  curveLinearClosed,
  decorative,
  defineChart,
  dot,
  groupBy,
  GroupByDatum,
  GroupByOptions,
  lineX,
  lineY,
  normalize,
  NormalizeDatum,
  NormalizeOptions,
  pie,
  PieDatum,
  PieOptions,
  polar,
  PolarGuide,
  PolarLayoutContext,
  PolarMark,
  PolarOptions,
  radialArc,
  RadialArcOptions,
  radialArea,
  RadialAreaOptions,
  radialBarAngle,
  RadialBarAngleOptions,
  radialBarRadius,
  RadialBarRadiusOptions,
  radialDot,
  RadialDotOptions,
  radialGrid,
  RadialGridOptions,
  radialLine,
  RadialLineOptions,
  radialRule,
  RadialRuleOptions,
  radialText,
  RadialTextOptions,
  rect,
  RectOptions,
  rollingWindow,
  RollingWindowDatum,
  RollingWindowOptions,
  ruleX,
  RuleXOptions,
  ruleY,
  RuleYOptions,
  scaleBand,
  scaleLinear,
  scaleOrdinal,
  scalePoint,
  scaleTime,
  scaleUtc,
  select,
  SelectContext,
  SelectOptions,
  stackRowsX,
  StackRowsXDatum,
  StackRowsXOptions,
  stackRowsY,
  StackRowsYDatum,
  StackRowsYOptions,
  text,
  TextOptions,
  tooltip,
  tooltipPortal,
  TransformGroupSpec,
  TransformLineage,
  TransformOutputs,
  TransformOutputSpec,
  TransformReduceContext,
  TransformReducer,
  TransformValue,
} from '@wfe/components/chart'
import type { AllTyped, Assert } from '../assertions.js'

export type ExportedTypes = Assert<
  AllTyped<{
    angleGrid: typeof angleGrid
    AngleGridOptions: AngleGridOptions
    areaY: typeof areaY
    barX: typeof barX
    barY: typeof barY
    BinOptions: BinOptions<unknown>
    binX: typeof binX
    BinXDatum: BinXDatum<unknown, unknown, unknown>
    binY: typeof binY
    BinYDatum: BinYDatum<unknown, unknown, unknown>
    cell: typeof cell
    CellOptions: CellOptions<unknown>
    Chart: typeof Chart
    ChartDefinition: ChartDefinition
    ChartKey: ChartKey
    ChartLegend: typeof ChartLegend
    ChartLegendItem: ChartLegendItem
    ChartLegendProps: ChartLegendProps
    ChartMark: ChartMark
    ChartPoint: ChartPoint
    ChartProps: ChartProps
    ChartScene: ChartScene
    ChartSpec: ChartSpec
    ChartTheme: ChartTheme
    ChartTooltipContent: ChartTooltipContent
    ChartTooltipContext: ChartTooltipContext
    ChartValue: ChartValue
    colorLegend: typeof colorLegend
    colorLegendItems: typeof colorLegendItems
    curveLinearClosed: typeof curveLinearClosed
    decorative: typeof decorative
    defineChart: typeof defineChart
    dot: typeof dot
    groupBy: typeof groupBy
    GroupByDatum: GroupByDatum<unknown, unknown, unknown>
    GroupByOptions: GroupByOptions<unknown>
    lineX: typeof lineX
    lineY: typeof lineY
    normalize: typeof normalize
    NormalizeDatum: NormalizeDatum<{ id: string; value: number }, 'fraction'>
    NormalizeOptions: NormalizeOptions<unknown>
    pie: typeof pie
    PieDatum: PieDatum<{ id: string; value: number }>
    PieOptions: PieOptions<unknown>
    polar: typeof polar
    PolarGuide: PolarGuide
    PolarLayoutContext: PolarLayoutContext
    PolarMark: PolarMark
    PolarOptions: PolarOptions
    radialArc: typeof radialArc
    RadialArcOptions: RadialArcOptions<unknown>
    radialArea: typeof radialArea
    RadialAreaOptions: RadialAreaOptions<unknown>
    radialBarAngle: typeof radialBarAngle
    RadialBarAngleOptions: RadialBarAngleOptions<unknown>
    radialBarRadius: typeof radialBarRadius
    RadialBarRadiusOptions: RadialBarRadiusOptions<unknown>
    radialDot: typeof radialDot
    RadialDotOptions: RadialDotOptions<unknown>
    radialGrid: typeof radialGrid
    RadialGridOptions: RadialGridOptions
    radialLine: typeof radialLine
    RadialLineOptions: RadialLineOptions<unknown>
    radialRule: typeof radialRule
    RadialRuleOptions: RadialRuleOptions<unknown>
    radialText: typeof radialText
    RadialTextOptions: RadialTextOptions<unknown>
    rect: typeof rect
    RectOptions: RectOptions<unknown>
    rollingWindow: typeof rollingWindow
    RollingWindowDatum: RollingWindowDatum<unknown, unknown>
    RollingWindowOptions: RollingWindowOptions<unknown>
    ruleX: typeof ruleX
    RuleXOptions: RuleXOptions<unknown>
    ruleY: typeof ruleY
    RuleYOptions: RuleYOptions<unknown>
    scaleBand: typeof scaleBand
    scaleLinear: typeof scaleLinear
    scaleOrdinal: typeof scaleOrdinal
    scalePoint: typeof scalePoint
    scaleTime: typeof scaleTime
    scaleUtc: typeof scaleUtc
    select: typeof select
    SelectContext: SelectContext<unknown>
    SelectOptions: SelectOptions<unknown>
    stackRowsX: typeof stackRowsX
    StackRowsXDatum: StackRowsXDatum<
      { id: string; value: number },
      string,
      'series'
    >
    StackRowsXOptions: StackRowsXOptions<unknown>
    stackRowsY: typeof stackRowsY
    StackRowsYDatum: StackRowsYDatum<
      { id: string; value: number },
      string,
      'series'
    >
    StackRowsYOptions: StackRowsYOptions<unknown>
    text: typeof text
    TextOptions: TextOptions<unknown>
    tooltip: typeof tooltip
    tooltipPortal: typeof tooltipPortal
    TransformGroupSpec: TransformGroupSpec<unknown>
    TransformLineage: TransformLineage<unknown>
    TransformOutputs: TransformOutputs<unknown>
    TransformOutputSpec: TransformOutputSpec<unknown>
    TransformReduceContext: TransformReduceContext<unknown>
    TransformReducer: TransformReducer<unknown>
    TransformValue: TransformValue<unknown, unknown>
  }>
>
