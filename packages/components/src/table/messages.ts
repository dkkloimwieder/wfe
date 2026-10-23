import { resolveMessages } from '../internal/messages'

/** Application-owned translations. Formatting locale is a separate concern. */
export interface TableMessages {
  workspace: string
  controls: string
  closeControls: string
  readOnlyTable: string
  readOnlyRecords: string
  refresh: string
  refreshHelp: string
  unappliedChanges: string
  filters: string
  columnFilters: string
  search: string
  clearSearch: string
  grouping: string
  displayColumns: string
  visibleColumns: string
  selection: string
  selectionHelp: string
  selectionKeyboardHelp: string
  selectRows: string
  selectColumns: string
  selectAll: string
  clearSelection: string
  formatting: string
  actions: string
  configuration: string
  details: string
  noMatches: string
  noRecords: string
  alignLeft: string
  alignCenter: string
  alignRight: string
  pages: string
  pageSize: string
  previousPage: string
  nextPage: string
  groupRecords: string
  addGrouping: string
  chooseColumn: string
  expandAllGroups: string
  collapseAllGroups: string
  clearGrouping: string
  groupingLevels: string
  recordOrder: string
  groupAscending: string
  groupDescending: string
  expand: string
  collapse: string
  remove: string
  columnSummaries: string
  summaryHelp: string
  emptyGroup: string
  yes: string
  no: string
  either: string
  searchValues: string
  containsPlaceholder: string
  allValues: string
  contains: string
  equals: string
  startsWith: string
  notContains: string
  between: string
  hasAny: string
  hasAll: string
  is: string
  hasNone: string
  isNot: string
  isEmpty: string
  isNotEmpty: string
  enterText: string
  anyValue: string
  minimum: string
  maximum: string
  invalidNumber: string
  filterActive: string
  formatBooleanSymbol: string
  formatBooleanText: string
  formatDatetime: string
  formatDatetimeIso: string
  formatDateIso: string
  formatDate: string
  formatDateShort: string
  formatDateLong: string
  formatNumberPlain: string
  formatNumberGrouped: string
  formatNumberDecimal: string
  moveHelp: string
  moveFirst: string
  moveLeft: string
  moveRight: string
  moveLast: string
  resizeHelp: string
  renameHeader: string
  results: (title: string) => string
  recordCount: (count: number, total: number) => string
  pageRecordCount: (count: number, total: number | undefined) => string
  selectionCount: (rows: number, columns: number) => string
  selectionSummary: (rows: number, columns: number) => string
  activeFilters: (count: number) => string
  groupingCount: (count: number) => string
  visibleCount: (count: number) => string
  alignment: (label: string) => string
  clearFilter: (label: string) => string
  dateStart: (label: string) => string
  dateEnd: (label: string) => string
  clearDateStart: (label: string) => string
  clearDateEnd: (label: string) => string
  groupToggle: (label: string, expanded: boolean) => string
  groupRecordsCount: (count: number) => string
  groupLevel: (level: number, label: string) => string
  moveGroupUp: (label: string) => string
  moveGroupDown: (label: string) => string
  orderGroups: (label: string) => string
  summaryOrder: (label: string, direction: 'asc' | 'desc') => string
  expandLevel: (label: string) => string
  collapseLevel: (label: string) => string
  removeGrouping: (label: string) => string
  columnSummary: (label: string) => string
  booleanHelp: (state: string) => string
  filterMatch: (label: string) => string
  numberMinimum: (label: string) => string
  numberMaximum: (label: string) => string
  filter: (label: string) => string
  filterTitle: (label: string, active: boolean) => string
  closeFilter: (label: string) => string
  moveColumn: (label: string) => string
  resizeColumn: (label: string) => string
  pixelSize: (size: number) => string
  sortBy: (label: string) => string
  sortHeader: (label: string) => string
  renameColumnHeader: (label: string) => string
  headerName: (label: string) => string
  rowDetails: (id: string, expanded: boolean) => string
}

/** English defaults; partial overrides fall back per property. */
export const tableMessages: Readonly<TableMessages> = {
  workspace: 'Table workspace',
  controls: 'Table controls',
  closeControls: 'Close table controls',
  readOnlyTable: 'Read-only table',
  readOnlyRecords: 'Read-only records',
  refresh: 'Refresh results',
  refreshHelp: 'Apply filters and refresh results',
  unappliedChanges: 'Unapplied changes',
  filters: 'Filters',
  columnFilters: 'Column filters',
  search: 'Search all columns',
  clearSearch: 'Clear search',
  grouping: 'Grouping',
  displayColumns: 'Display columns',
  visibleColumns: 'Visible columns',
  selection: 'Selection',
  selectionHelp:
    'Drag cells or use Shift and arrow keys to extend the selection.',
  selectionKeyboardHelp:
    'Drag cells or use Shift with arrow keys. Shift Space selects rows. Control or Command Space selects columns. Copy uses the normal shortcut.',
  selectRows: 'Select rows',
  selectColumns: 'Select columns',
  selectAll: 'Select all',
  clearSelection: 'Clear selection',
  formatting: 'Formatting',
  actions: 'Actions',
  configuration: 'Configuration',
  details: 'Details',
  noMatches: 'No records match your search or filters.',
  noRecords: 'No records yet.',
  alignLeft: 'Left',
  alignCenter: 'Center',
  alignRight: 'Right',
  pages: 'Table pages',
  pageSize: 'Page size',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  groupRecords: 'Group records',
  addGrouping: 'Add grouping',
  chooseColumn: 'Choose a column',
  expandAllGroups: 'Expand all groups',
  collapseAllGroups: 'Collapse all groups',
  clearGrouping: 'Clear grouping',
  groupingLevels: 'Grouping levels',
  recordOrder: 'Record order',
  groupAscending: 'Group value: ascending',
  groupDescending: 'Group value: descending',
  expand: 'Expand',
  collapse: 'Collapse',
  remove: 'Remove',
  columnSummaries: 'Column summaries',
  summaryHelp:
    'Summaries use filtered records, including collapsed rows. First and last follow the table sort order. Range shows both endpoints. Span shows their difference.',
  emptyGroup: '(none)',
  yes: 'Yes',
  no: 'No',
  either: 'Either',
  searchValues: 'Search values…',
  containsPlaceholder: 'Contains…',
  allValues: 'All',
  contains: 'Contains',
  equals: 'Equals',
  startsWith: 'Starts with',
  notContains: 'Does not contain',
  between: 'Between',
  hasAny: 'Has any',
  hasAll: 'Has all',
  is: 'Is',
  hasNone: 'Has none',
  isNot: 'Is not',
  isEmpty: 'Is empty',
  isNotEmpty: 'Is not empty',
  enterText: 'Enter text…',
  anyValue: 'Any',
  minimum: 'Minimum',
  maximum: 'Maximum',
  invalidNumber: 'Enter a valid number.',
  filterActive: 'Filter active',
  formatBooleanSymbol: 'Check / cross',
  formatBooleanText: 'Yes / No',
  formatDatetime: 'Date and time',
  formatDatetimeIso: 'UTC ISO timestamp',
  formatDateIso: 'YYYY-MM-DD',
  formatDate: 'Configured date',
  formatDateShort: 'Short date',
  formatDateLong: 'Long date',
  formatNumberPlain: 'Plain number',
  formatNumberGrouped: 'Grouped number',
  formatNumberDecimal: 'Two decimal places',
  moveHelp:
    'Drag to move the column. Left and Right move one place. Home and End move to the first and last available places. Escape cancels a drag. Activate for move buttons.',
  moveFirst: 'Move first',
  moveLeft: 'Move left',
  moveRight: 'Move right',
  moveLast: 'Move last',
  resizeHelp:
    'Drag to resize the column. Left and Right change width by 10 pixels, or 50 with Shift. Home and End select the limits. Escape ends a drag at the current width.',
  renameHeader: 'Rename header',
  results: (title) => `${title} results`,
  recordCount: (count, total) => `${count}/${total} records`,
  pageRecordCount: (count, total) =>
    `${count}${total === undefined ? '' : `/${total}`}`,
  selectionCount: (rows, columns) =>
    `${rows} rows by ${columns} columns selected`,
  selectionSummary: (rows, columns) => `${rows} × ${columns} selected`,
  activeFilters: (count) => `${count} active`,
  groupingCount: (count) => `${count} levels`,
  visibleCount: (count) => `${count} visible`,
  alignment: (label) => `${label} alignment`,
  clearFilter: (label) => `Clear ${label} filter`,
  dateStart: (label) => `${label} start`,
  dateEnd: (label) => `${label} end`,
  clearDateStart: (label) => `Clear ${label} start`,
  clearDateEnd: (label) => `Clear ${label} end`,
  groupToggle: (label, expanded) =>
    `${expanded ? 'Collapse' : 'Expand'} ${label}`,
  groupRecordsCount: (count) =>
    `${count} ${count === 1 ? 'record' : 'records'}`,
  groupLevel: (level, label) => `${level}. ${label}`,
  moveGroupUp: (label) => `Move ${label} up`,
  moveGroupDown: (label) => `Move ${label} down`,
  orderGroups: (label) => `Order ${label} groups`,
  summaryOrder: (label, direction) =>
    `${label} summary: ${direction === 'asc' ? 'ascending' : 'descending'}`,
  expandLevel: (label) => `Expand ${label} level`,
  collapseLevel: (label) => `Collapse ${label} level`,
  removeGrouping: (label) => `Remove ${label} grouping`,
  columnSummary: (label) => `${label} summary`,
  booleanHelp: (state) => `${state}. Press Space to cycle Yes, No, and Either.`,
  filterMatch: (label) => `${label} match`,
  numberMinimum: (label) => `${label} minimum`,
  numberMaximum: (label) => `${label} maximum`,
  filter: (label) => `Filter ${label}`,
  filterTitle: (label, active) => `Filter ${label}${active ? ' (active)' : ''}`,
  closeFilter: (label) => `Close ${label} filter`,
  moveColumn: (label) => `Move ${label} column`,
  resizeColumn: (label) => `Resize ${label} column`,
  pixelSize: (size) => `${size} pixels`,
  sortBy: (label) => `Sort by ${label}`,
  sortHeader: (label) => `Sort ${label}`,
  renameColumnHeader: (label) => `Rename ${label} header`,
  headerName: (label) => `Header name for ${label}`,
  rowDetails: (id, expanded) =>
    `${expanded ? 'Collapse' : 'Expand'} details for row ${id}`,
}

export const resolveTableMessages = (
  overrides: () => Partial<TableMessages> | undefined,
): Readonly<TableMessages> => resolveMessages(tableMessages, overrides)
