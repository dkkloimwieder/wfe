// Generated from built declarations by tests/consumers/generate.mjs.
// Resolve only public package exports through the workspace node_modules links.
import type {
  ChangeHandler,
  ColumnDestination,
  columnMoveDestination,
  ConfiguredTableColumnFilterProps,
  createNativeTable,
  createTable,
  createTableFilterDraft,
  createTableSelection,
  fromLegacyTableFilterValue,
  LegacyTableFilterKind,
  moveColumn,
  NativeAggregationFn,
  nativeAggregations,
  NativeCell,
  NativeCellContext,
  NativeColumn,
  NativeColumnDef,
  NativeDisplayItem,
  NativeGroup,
  NativeGroupCell,
  NativeGroupPathEntry,
  NativeGroupValue,
  NativeGroupView,
  NativeRow,
  NativeRowView,
  NativeSource,
  NativeStateCallbacks,
  NativeStateSetters,
  NativeTable,
  NativeTableOptions,
  NativeTableState,
  ReadOnlyTable,
  ReadOnlyTableViewsOptions,
  readTableView,
  Table,
  TableCellWrap,
  TableChoice,
  TableChoiceEditor,
  TableChoiceEditorProps,
  TableClientPagination,
  TableColumnAlignment,
  TableColumnAlignments,
  TableColumnFilter,
  TableColumnFilterConfig,
  TableColumnFilterProps,
  TableColumnFilterValue,
  TableColumnMove,
  TableColumnResize,
  TableColumnWidths,
  TableControlSection,
  TableControlsHandle,
  TableControlsPlacement,
  TableDateFilter,
  TableDateFilterProps,
  TableDateRange,
  TableDetailRow,
  TableDetailToggle,
  TableEdge,
  TableEmptyResults,
  TableFilter,
  TableFilterConfig,
  TableFilterCriteria,
  TableFilterProps,
  TableFilterValue,
  TableFormatting,
  TableFormattingProps,
  TableGrouping,
  TableHeaderFilter,
  TableHeaderFilterProps,
  TableHeaderName,
  TableLeadingColumn,
  tableMessages,
  TableMessages,
  TablePageSize,
  TablePagination,
  TablePaginationProps,
  TableRow,
  TableRowAction,
  TableRowActionContext,
  TableRowDetails,
  TableRowSelection,
  TableSelection,
  TableSelectionCell,
  TableSelectionOptions,
  TableSelectionRange,
  TableSort,
  TableView,
  TableViewBinding,
  TableViewControlsState,
  TableViewList,
  TableViewsOptions,
  TableViewState,
  TableViewStorage,
  TableViewValue,
  TableWorkspace,
  TableWorkspaceProps,
  TableWorkspaceViewsOptions,
  toLegacyTableFilterValue,
  Updater,
} from '@wfe/components/table'
import type { AllTyped, Assert } from '../assertions.js'

export type ExportedTypes = Assert<
  AllTyped<{
    ChangeHandler: ChangeHandler<unknown>
    ColumnDestination: ColumnDestination
    columnMoveDestination: typeof columnMoveDestination
    ConfiguredTableColumnFilterProps: ConfiguredTableColumnFilterProps<
      import('@wfe/components/table').TableColumnFilterConfig
    >
    createNativeTable: typeof createNativeTable
    createTable: typeof createTable
    createTableFilterDraft: typeof createTableFilterDraft
    createTableSelection: typeof createTableSelection
    fromLegacyTableFilterValue: typeof fromLegacyTableFilterValue
    LegacyTableFilterKind: LegacyTableFilterKind
    moveColumn: typeof moveColumn
    NativeAggregationFn: NativeAggregationFn
    nativeAggregations: typeof nativeAggregations
    NativeCell: NativeCell<unknown>
    NativeCellContext: NativeCellContext<unknown>
    NativeColumn: NativeColumn<unknown>
    NativeColumnDef: NativeColumnDef<unknown>
    NativeDisplayItem: NativeDisplayItem
    NativeGroup: NativeGroup
    NativeGroupCell: NativeGroupCell<unknown>
    NativeGroupPathEntry: NativeGroupPathEntry
    NativeGroupValue: NativeGroupValue
    NativeGroupView: NativeGroupView<unknown>
    NativeRow: NativeRow<unknown>
    NativeRowView: NativeRowView<unknown>
    NativeSource: NativeSource<unknown>
    NativeStateCallbacks: NativeStateCallbacks
    NativeStateSetters: NativeStateSetters
    NativeTable: NativeTable<unknown>
    NativeTableOptions: NativeTableOptions<unknown>
    NativeTableState: NativeTableState
    ReadOnlyTable: typeof ReadOnlyTable
    ReadOnlyTableViewsOptions: ReadOnlyTableViewsOptions
    readTableView: typeof readTableView
    Table: typeof Table
    TableCellWrap: TableCellWrap
    TableChoice: TableChoice
    TableChoiceEditor: typeof TableChoiceEditor
    TableChoiceEditorProps: TableChoiceEditorProps
    TableClientPagination: TableClientPagination
    TableColumnAlignment: TableColumnAlignment
    TableColumnAlignments: TableColumnAlignments
    TableColumnFilter: typeof TableColumnFilter
    TableColumnFilterConfig: TableColumnFilterConfig
    TableColumnFilterProps: TableColumnFilterProps
    TableColumnFilterValue: TableColumnFilterValue
    TableColumnMove: typeof TableColumnMove
    TableColumnResize: typeof TableColumnResize
    TableColumnWidths: TableColumnWidths
    TableControlSection: typeof TableControlSection
    TableControlsHandle: TableControlsHandle
    TableControlsPlacement: TableControlsPlacement
    TableDateFilter: typeof TableDateFilter
    TableDateFilterProps: TableDateFilterProps
    TableDateRange: TableDateRange
    TableDetailRow: typeof TableDetailRow
    TableDetailToggle: typeof TableDetailToggle
    TableEdge: TableEdge
    TableEmptyResults: TableEmptyResults
    TableFilter: typeof TableFilter
    TableFilterConfig: TableFilterConfig
    TableFilterCriteria: TableFilterCriteria
    TableFilterProps: TableFilterProps
    TableFilterValue: TableFilterValue
    TableFormatting: typeof TableFormatting
    TableFormattingProps: TableFormattingProps
    TableGrouping: typeof TableGrouping
    TableHeaderFilter: typeof TableHeaderFilter
    TableHeaderFilterProps: TableHeaderFilterProps
    TableHeaderName: typeof TableHeaderName
    TableLeadingColumn: TableLeadingColumn<unknown>
    tableMessages: typeof tableMessages
    TableMessages: TableMessages
    TablePageSize: TablePageSize
    TablePagination: typeof TablePagination
    TablePaginationProps: TablePaginationProps
    TableRow: typeof TableRow
    TableRowAction: TableRowAction
    TableRowActionContext: TableRowActionContext
    TableRowDetails: TableRowDetails
    TableRowSelection: TableRowSelection
    TableSelection: TableSelection
    TableSelectionCell: TableSelectionCell
    TableSelectionOptions: TableSelectionOptions
    TableSelectionRange: TableSelectionRange
    TableSort: typeof TableSort
    TableView: TableView
    TableViewBinding: TableViewBinding
    TableViewControlsState: TableViewControlsState
    TableViewList: TableViewList
    TableViewsOptions: TableViewsOptions
    TableViewState: TableViewState
    TableViewStorage: TableViewStorage
    TableViewValue: TableViewValue
    TableWorkspace: typeof TableWorkspace
    TableWorkspaceProps: TableWorkspaceProps
    TableWorkspaceViewsOptions: TableWorkspaceViewsOptions
    toLegacyTableFilterValue: typeof toLegacyTableFilterValue
    Updater: Updater<unknown>
  }>
>
