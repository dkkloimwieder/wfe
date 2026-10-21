import type {
  FormDescription,
  FormViewBindings,
  TableDescription,
  TableViewBindings,
  LayoutDescription,
  LayoutViewBindings,
} from '@wfe/generator'
import type { FormContract, FormBindings, FormErrors } from '@wfe/form'
import type { NativeTable, TableSelection } from '@wfe/components/table'

type MemberInput = {
  name: string
  enabled: boolean
  role: 'reader' | 'author'
  nickname: string
}
type MemberRow = { key: string; first: string; last: string; points: number }
declare const memberForm: FormContract<MemberInput>
declare const selection: TableSelection
declare const memberTable: NativeTable<MemberRow, never>
const memberEditor = {
  id: 'member-editor',
  fields: [
    { field: 'name', label: 'Name', control: 'text', required: true },
    { field: 'enabled', label: 'Enabled', control: 'switch' },
    { field: 'role', label: 'Role', control: 'select' },
    { field: 'nickname', label: 'Nickname', control: 'custom' },
  ],
  submit: { id: 'save', label: 'Save' },
  actions: [{ id: 'reset', label: 'Reset' }],
} as const satisfies FormDescription<MemberInput>
const memberBindings = {
  form: memberForm,
  choices: {
    role: () => [
      { value: 'reader', label: 'Reader' },
      { value: 'author', label: 'Author' },
    ],
  },
  fields: { nickname: (props) => props.value.toUpperCase() },
  actions: { reset: { run: () => memberForm.reset() } },
} satisfies FormViewBindings<MemberInput, typeof memberEditor>
const memberRecords = {
  id: 'members',
  columns: {
    displayLabel: { label: 'Member' },
    points: { label: 'Points', renderer: 'points' },
  },
  actions: [{ id: 'export', label: 'Export' }],
} as const satisfies TableDescription
const memberRows = {
  table: memberTable,
  selection,
  pagination: {
    hasPrevious: false,
    hasNext: true,
    onPrevious() {},
    onNext() {},
    status: 'More records available',
    pageSize: {
      value: 25,
      options: [25, 50],
      onValueChange(_value: number) {},
    },
  },
  headerAliases: () => ({ displayLabel: 'Full name' }),
  cells: {
    points: (props) =>
      typeof props.value === 'number' ? props.value.toFixed(0) : '',
  },
  actions: { export: { run: () => {} } },
} satisfies TableViewBindings<MemberRow, never, typeof memberRecords>
const memberLayout = {
  id: 'member-workspace',
  panels: [{ id: 'member-list', view: 'records', fill: true }],
  navigation: [{ id: 'member-edit', view: 'editor' }],
} as const satisfies LayoutDescription<'records' | 'editor'>
const memberViews = {
  views: { records: () => 'Records', editor: () => 'Editor' },
} satisfies LayoutViewBindings<typeof memberLayout>

type StockInput = { code: string; available: boolean; price: number }
type StockRow = { sku: string; cents: number; quantity: number }
declare const stockForm: FormContract<StockInput>
declare const stockTable: NativeTable<StockRow, { currency: string }>
const stockEditor = {
  id: 'stock-editor',
  fields: [
    { field: 'code', label: 'Code', control: 'textarea' },
    { field: 'available', label: 'Available', control: 'checkbox' },
    { field: 'price', label: 'Price', control: 'custom' },
  ],
} as const satisfies FormDescription<StockInput>
const stockBindings = {
  form: stockForm,
  fields: { price: (props) => props.value.toFixed(2) },
} satisfies FormViewBindings<StockInput, typeof stockEditor>
const stockRecords = {
  id: 'stock',
  columns: {
    sku: { label: 'Code' },
    'net-cost': { label: 'Total cost', renderer: 'currency' },
  },
  controls: { filtering: true, grouping: true },
  controlsPlacement: 'right',
} as const satisfies TableDescription
const stockRows = {
  table: stockTable,
  cells: {
    currency: (props) =>
      typeof props.value === 'number' ? props.value.toFixed(2) : '',
  },
  status: () => ({ loading: false }),
} satisfies TableViewBindings<
  StockRow,
  { currency: string },
  typeof stockRecords
>
const stockLayout = {
  id: 'stock-workspace',
  columns: 2,
  panels: [
    { id: 'stock-edit', view: 'stock-editor' },
    { id: 'stock-list', view: 'stock-list' },
  ],
} as const satisfies LayoutDescription<'stock-editor' | 'stock-list'>
const stockViews = {
  views: { 'stock-editor': () => 'Editor', 'stock-list': () => 'Stock' },
} satisfies LayoutViewBindings<typeof stockLayout>

const invalidField: FormDescription<MemberInput> = {
  id: 'invalid',
  // @ts-expect-error Boolean fields do not accept text controls.
  fields: [{ field: 'enabled', label: 'Enabled', control: 'text' }],
}
const unknownField: FormDescription<MemberInput> = {
  id: 'invalid',
  // @ts-expect-error Unknown field names do not belong to this form.
  fields: [{ field: 'missing', label: 'Missing', control: 'text' }],
}
const numericField: FormDescription<StockInput> = {
  id: 'invalid',
  // @ts-expect-error Text controls cannot edit numeric values.
  fields: [{ field: 'price', label: 'Price', control: 'text' }],
}
// @ts-expect-error The reset action binding is required.
const missingAction: FormViewBindings<MemberInput, typeof memberEditor> = {
  form: memberForm,
  choices: memberBindings.choices,
  fields: memberBindings.fields,
}
// @ts-expect-error Select choices are required.
const missingChoices: FormViewBindings<MemberInput, typeof memberEditor> = {
  form: memberForm,
  actions: memberBindings.actions,
  fields: memberBindings.fields,
}
// @ts-expect-error The custom field renderer is required.
const missingField: FormViewBindings<StockInput, typeof stockEditor> = {
  form: stockForm,
}
// @ts-expect-error The currency renderer is required.
const missingCell: TableViewBindings<
  StockRow,
  { currency: string },
  typeof stockRecords
> = { table: stockTable }
const missingView: LayoutViewBindings<typeof memberLayout> = {
  // @ts-expect-error Every referenced layout view needs a binding.
  views: { records: () => 'Records' },
}
const unknownView: LayoutDescription<'editor' | 'records'> = {
  id: 'invalid',
  // @ts-expect-error The unknown view does not belong to this layout.
  panels: [{ id: 'bad', view: 'missing' }],
}
const wrongChoice: FormViewBindings<MemberInput, typeof memberEditor> = {
  ...memberBindings,
  // @ts-expect-error Choice values must match the field's union.
  choices: { role: () => [{ value: 'administrator', label: 'Administrator' }] },
}
const wrongField: FormViewBindings<StockInput, typeof stockEditor> = {
  form: stockForm,
  fields: {
    price: (props) => {
      // @ts-expect-error A numeric field cannot request a string value.
      props.onValueChange('invalid')
      return props.value.toFixed(2)
    },
  },
}
const wrongAlias: TableViewBindings<MemberRow, never, typeof memberRecords> = {
  ...memberRows,
  // @ts-expect-error Aliases refer to declared column identities.
  headerAliases: () => ({ missing: 'Missing' }),
}
const narrowText: FormDescription<MemberInput> = {
  id: 'invalid',
  // @ts-expect-error Text controls emit arbitrary strings, not a role union.
  fields: [{ field: 'role', label: 'Role', control: 'text' }],
}
const literalToggle: FormDescription<{ locked: true }> = {
  id: 'invalid',
  // @ts-expect-error Toggles emit both booleans, not only true.
  fields: [{ field: 'locked', label: 'Locked', control: 'switch' }],
}
const wrongForm: FormViewBindings<MemberInput, typeof memberEditor> = {
  ...memberBindings,
  // @ts-expect-error This coordinator accepts another record shape.
  form: stockForm,
}
const wrongTable: TableViewBindings<MemberRow, never, typeof memberRecords> = {
  ...memberRows,
  // @ts-expect-error This table supplies another row and metadata shape.
  table: stockTable,
}
// @ts-expect-error The first form contract accepts only flat scalar values.
const nestedForm: FormDescription<{ details: { text: string } }> = {
  id: 'invalid',
  fields: [],
}

void [
  memberEditor,
  memberRecords,
  memberLayout,
  stockEditor,
  stockRecords,
  stockLayout,
  narrowText,
  literalToggle,
  wrongForm,
  wrongTable,
  nestedForm,
  memberBindings,
  memberRows,
  memberViews,
  stockBindings,
  stockRows,
  stockViews,
  invalidField,
  unknownField,
  numericField,
  missingAction,
  missingChoices,
  missingField,
  missingCell,
  missingView,
  unknownView,
  wrongChoice,
  wrongField,
  wrongAlias,
]

const dateEditor = {
  id: 'dates',
  fields: [
    {
      field: 'date',
      label: 'Date',
      control: 'date',
      dateFormat: 'dd/MM/yyyy',
      locale: 'en-GB',
    },
    {
      field: 'instant',
      label: 'Instant',
      control: 'datetime',
      timeZone: 'America/New_York',
      timeFormat: 'hh:mm a',
      disambiguation: 'reject',
    },
  ],
} as const satisfies FormDescription<{ date: string; instant: string }>
const wrongDate: FormDescription<{ date: number }> = {
  id: 'invalid',
  // @ts-expect-error Date inputs request canonical strings.
  fields: [{ field: 'date', label: 'Date', control: 'date' }],
}
const narrowDate: FormDescription<{ date: 'today' | 'tomorrow' }> = {
  id: 'invalid',
  // @ts-expect-error Date input strings cannot fit a fixed literal union.
  fields: [{ field: 'date', label: 'Date', control: 'date' }],
}
const wrongTime: FormDescription<{ date: string }> = {
  id: 'invalid',
  fields: [
    // @ts-expect-error Time formats use the supported numeric input grammar.
    { field: 'date', label: 'Date', control: 'datetime', timeFormat: 'h:mm' },
  ],
}
void [dateEditor, wrongDate, narrowDate, wrongTime]

type Numbers = {
  count: number
  optional: number | undefined
  nullable: number | null
  both: number | null | undefined
}
const numericEditor = {
  id: 'numeric-editor',
  fields: [
    { field: 'count', label: 'Count', control: 'number' },
    {
      field: 'optional',
      label: 'Optional',
      control: 'number',
      empty: 'undefined',
    },
    { field: 'nullable', label: 'Nullable', control: 'number', empty: 'null' },
    { field: 'both', label: 'Both', control: 'number', empty: 'null' },
  ],
} as const satisfies FormDescription<Numbers>
const missingEmpty: FormDescription<Numbers> = {
  id: 'invalid',
  // @ts-expect-error Optional numeric fields require an explicit empty policy.
  fields: [{ field: 'optional', label: 'Optional', control: 'number' }],
}
const wrongEmpty: FormDescription<Numbers> = {
  id: 'invalid',
  fields: [
    {
      field: 'nullable',
      label: 'Nullable',
      control: 'number',
      // @ts-expect-error Undefined cannot enter a nullable numeric value.
      empty: 'undefined',
    },
  ],
}
const requiredEmpty: FormDescription<Numbers> = {
  id: 'invalid',
  fields: [
    // @ts-expect-error Plain numbers cannot accept an empty sentinel.
    { field: 'count', label: 'Count', control: 'number', empty: 'null' },
  ],
}
const undefinedPolicy: FormDescription<Numbers> = {
  id: 'invalid',
  fields: [
    {
      field: 'optional',
      label: 'Optional',
      control: 'number',
      // @ts-expect-error Optional numeric fields require a literal policy, including with non-exact optional types.
      empty: undefined,
    },
  ],
}
const literalNumber: FormDescription<{ count: 1 | 2 }> = {
  id: 'invalid',
  // @ts-expect-error Numeric inputs emit arbitrary finite numbers.
  fields: [{ field: 'count', label: 'Count', control: 'number' }],
}
const nullNumber: FormDescription<{ count: null }> = {
  id: 'invalid',
  fields: [
    // @ts-expect-error An empty-only value cannot accept a numeric edit.
    { field: 'count', label: 'Count', control: 'number', empty: 'null' },
  ],
}
void [
  numericEditor,
  missingEmpty,
  wrongEmpty,
  requiredEmpty,
  undefinedPolicy,
  literalNumber,
  nullNumber,
]

const groupedEditor = {
  ...memberEditor,
  layout: {
    columns: 2,
    groups: [
      {
        id: 'identity',
        title: 'Identity',
        columns: 2,
        fields: ['name', 'nickname'],
      },
      {
        id: 'access',
        title: 'Access',
        fields: ['enabled', 'role'],
        span: 'full',
      },
    ],
  },
} as const satisfies FormDescription<MemberInput>
const groupedBindings = memberBindings satisfies FormViewBindings<
  MemberInput,
  typeof groupedEditor
>
const unknownGroupedField: FormDescription<MemberInput> = {
  ...memberEditor,
  layout: {
    groups: [
      {
        id: 'bad',
        title: 'Bad',
        fields: [
          // @ts-expect-error Group references use this form's field keys.
          'missing',
        ],
      },
    ],
  },
}
const badColumns: FormDescription<MemberInput> = {
  ...memberEditor,
  // @ts-expect-error Form layouts support one, two or three columns.
  layout: { columns: 4 },
}
const badSpan: FormDescription<MemberInput> = {
  ...memberEditor,
  // @ts-expect-error Field spans use supported column counts or full width.
  fields: [{ field: 'name', label: 'Name', control: 'text', span: 0 }],
}
void [groupedEditor, groupedBindings, unknownGroupedField, badColumns, badSpan]

const workspaceRegions = {
  id: 'organization',
  title: 'ACME',
  panels: [{ id: 'main', view: 'records' }],
  navigation: [{ id: 'menu', view: 'menu' }],
  context: [{ id: 'context', view: 'project' }],
  footer: [{ id: 'footer', view: 'status' }],
} as const satisfies LayoutDescription
const workspaceRegionBindings: LayoutViewBindings<typeof workspaceRegions> = {
  views: {
    records: () => null,
    menu: () => null,
    project: () => null,
    status: () => null,
  },
}
const missingWorkspaceRegion: LayoutViewBindings<typeof workspaceRegions> = {
  // @ts-expect-error Context and footer descriptions require their own view bindings.
  views: { records: () => null, menu: () => null },
}
void [workspaceRegions, workspaceRegionBindings, missingWorkspaceRegion]

const unlabeledForm = {
  id: 'unlabeled',
  fields: [{ field: 'code', control: 'text' }],
  submit: { id: 'save' },
  actions: [{ id: 'reset' }],
} as const satisfies FormDescription<{ code: string }>
const unlabeledBindings: FormViewBindings<
  { code: string },
  typeof unlabeledForm
> = {
  form: null as unknown as FormContract<{ code: string }>,
  actions: { reset: { run: () => {} } },
}
void [unlabeledForm, unlabeledBindings]
const unlabeledTable = {
  id: 'records',
  columns: { code: {} },
  actions: [{ id: 'export' }],
} as const satisfies TableDescription
void unlabeledTable

const nontextLabel: FormDescription<{ code: string }> = {
  id: 'invalid-label',
  fields: [
    {
      field: 'code',
      control: 'text',
      // @ts-expect-error Optional labels still require text when present.
      label: 1,
    },
  ],
}
void nontextLabel

const formattedFields = {
  id: 'formatted',
  fields: [
    { field: 'code', control: 'text', format: 'short-hash' },
    {
      field: 'day',
      control: 'text',
      format: 'date',
      formatOptions: { dateFormat: 'dd/MM/yyyy', timeZone: 'UTC' },
    },
    { field: 'active', control: 'checkbox', format: 'boolean-symbol' },
  ],
} as const satisfies FormDescription<{
  code: string
  day: string
  active: boolean
}>
const formattedColumns = {
  id: 'formatted-columns',
  columns: {
    code: { format: 'short-hash' },
    active: { format: 'boolean-symbol' },
    day: { format: 'datetime', formatOptions: { timeZone: 'browser' } },
  },
} as const satisfies TableDescription
const invalidFormat: TableDescription = {
  id: 'bad-format',
  columns: {
    code: {
      // @ts-expect-error Unsupported formats are not part of the shared value contract.
      format: 'invented',
    },
  },
}
void [formattedFields, formattedColumns, invalidFormat]

interface RepeatedRow {
  key: string
  name: string
  quantity: number | null
  active: boolean
}
interface RepeatedValues {
  title: string
  entries: readonly RepeatedRow[]
}
const repeatedBindings: FormBindings<RepeatedValues> = {
  values: () => ({ title: 'List', entries: [] }),
  defaults: () => ({ title: 'List', entries: [] }),
  onValuesChange(next) {
    void next.entries[0]?.quantity
  },
  validate: () => ({
    rows: {
      entries: { first: { fields: { name: 'Required' }, row: 'Review row' } },
    },
  }),
  onSubmit(snapshot) {
    // @ts-expect-error Callback row fields are immutable.
    snapshot.entries[0]!.name = 'Mutation'
    // @ts-expect-error Callback arrays are immutable.
    snapshot.entries.push({
      key: 'extra',
      name: '',
      quantity: null,
      active: false,
    })
    return { ok: true }
  },
}
declare const repeatedContract: FormContract<RepeatedValues>
repeatedContract.setValue('entries', [
  { key: 'first', name: 'Name', quantity: 0, active: false },
])
const badRepeatedErrors: FormErrors<RepeatedValues> = {
  rows: {
    // @ts-expect-error Only repeated fields accept row messages.
    title: {},
  },
}
const badRowFields: FormErrors<RepeatedValues> = {
  rows: {
    entries: {
      first: {
        fields: {
          // @ts-expect-error Row field errors use keys from the scalar row interface.
          unknown: 'Error',
        },
      },
    },
  },
}
// @ts-expect-error Repeated rows cannot contain nested records.
declare const nestedRepeated: FormContract<{
  entries: readonly { nested: { name: string } }[]
}>
// @ts-expect-error Repeated groups require records rather than scalar arrays.
declare const scalarRepeated: FormContract<{ entries: readonly string[] }>
void [
  repeatedBindings,
  repeatedContract,
  badRepeatedErrors,
  badRowFields,
  nestedRepeated,
  scalarRepeated,
]

const mutableRepeatedBindings: FormBindings<{ entries: RepeatedRow[] }> = {
  values: () => ({ entries: [] }),
  defaults: () => ({ entries: [] }),
  onValuesChange() {},
  validate(snapshot) {
    // @ts-expect-error A mutable accepted-state array still creates an immutable callback snapshot.
    snapshot.entries.push({
      key: 'extra',
      name: '',
      quantity: null,
      active: false,
    })
    return {}
  },
  onSubmit: () => ({ ok: true }),
}
void mutableRepeatedBindings

const initiallyEmptyBindings: FormBindings<{ entries: never[] }> = {
  values: () => ({ entries: [] }),
  defaults: () => ({ entries: [] }),
  onValuesChange() {},
  validate: () => ({}),
  onSubmit: () => ({ ok: true }),
}
void initiallyEmptyBindings

const repeatedDescription = {
  id: 'repeated-form',
  fields: [
    { field: 'title', control: 'text' },
    {
      field: 'entries',
      control: 'repeat',
      columns: 2,
      fields: [
        { field: 'name', control: 'text' },
        { field: 'quantity', control: 'number', empty: 'null' },
        { field: 'active', control: 'checkbox' },
      ],
    },
  ],
} as const satisfies FormDescription<RepeatedValues>
const repeatedViewBindings: FormViewBindings<
  RepeatedValues,
  typeof repeatedDescription
> = {
  form: repeatedContract,
  repeated: {
    entries: {
      rowKey: (row) => row.key,
      createRow: () => ({
        key: 'next',
        name: '',
        quantity: null,
        active: false,
      }),
    },
  },
}
// @ts-expect-error A repeated group needs its application key and factory binding.
const missingRepeated: FormViewBindings<
  RepeatedValues,
  typeof repeatedDescription
> = { form: repeatedContract }
const invalidRepeatedControl: FormDescription<RepeatedValues> = {
  id: 'bad-repeat',
  fields: [
    // @ts-expect-error Array fields use repeat controls rather than scalar text controls.
    { field: 'entries', control: 'text' },
  ],
}
interface ChoiceRow {
  key: string
  mode: 'alpha' | 'beta'
  amount: number | undefined
}
interface ChoiceRows {
  rows: readonly ChoiceRow[]
}
declare const choiceRowsForm: FormContract<ChoiceRows>
const choiceRowsDescription = {
  id: 'choice-rows',
  fields: [
    {
      field: 'rows',
      control: 'repeat',
      fields: [
        { field: 'mode', control: 'select' },
        { field: 'amount', control: 'custom' },
      ],
    },
  ],
} as const satisfies FormDescription<ChoiceRows>
const choiceRowsBindings: FormViewBindings<
  ChoiceRows,
  typeof choiceRowsDescription
> = {
  form: choiceRowsForm,
  repeated: {
    rows: {
      rowKey: (row) => row.key,
      createRow: () => ({ key: 'next', mode: 'alpha', amount: undefined }),
      choices: { mode: () => [{ value: 'alpha', label: 'Alpha' }] },
      fields: {
        amount: (props) => {
          const value: number | undefined = props.value
          props.onValueChange(value)
          // @ts-expect-error Nested custom fields preserve the scalar field value type.
          props.onValueChange('wrong')
          return null
        },
      },
    },
  },
}
const missingNestedChoices: FormViewBindings<
  ChoiceRows,
  typeof choiceRowsDescription
> = {
  form: choiceRowsForm,
  repeated: {
    // @ts-expect-error Nested selects require their own typed choices.
    rows: {
      rowKey: (row) => row.key,
      createRow: () => ({ key: 'next', mode: 'alpha', amount: undefined }),
      fields: { amount: () => null },
    },
  },
}
void [
  repeatedDescription,
  repeatedViewBindings,
  missingRepeated,
  invalidRepeatedControl,
  choiceRowsDescription,
  choiceRowsBindings,
  missingNestedChoices,
]

// Detail views read records without a form contract.
const detailDescription = {
  id: 'record-detail',
  fields: [
    { field: 'key', format: 'short-hash' },
    { field: 'active', format: 'boolean-symbol' },
  ],
  actions: [{ id: 'open' }],
} as const satisfies import('@wfe/generator').DetailDescription<{
  key: string
  active: boolean
}>
const detailBindings: import('@wfe/generator').DetailViewBindings<
  { key: string; active: boolean },
  typeof detailDescription
> = {
  record: () => ({ key: 'record', active: true }),
  actions: { open: { run() {} } },
}
// @ts-expect-error The described action requires its application callback.
const missingDetailAction: typeof detailBindings = {
  record: detailBindings.record,
}
const badDetail: import('@wfe/generator').DetailDescription<{ key: string }> = {
  id: 'bad',
  // @ts-expect-error Detail fields must belong to the record.
  fields: [{ field: 'missing' }],
}
const deleteDescription: import('@wfe/generator').DeleteDescription = {
  id: 'delete-record',
  title: 'Delete record?',
  confirmation: 'Delete this record?',
}
const deleteBindings: import('@wfe/generator').DeleteViewBindings<number> = {
  recordKey: () => 0,
  onConfirm: (key) => {
    const accepted: number = key
    void accepted
  },
}
// @ts-expect-error One confirmation callback is required.
const missingDeleteCallback: typeof deleteBindings = { recordKey: () => 1 }
// @ts-expect-error Delete keys are strings or numbers, not records.
type InvalidDeleteKey = import('@wfe/generator').DeleteViewBindings<{
  id: string
}>
void [
  detailBindings,
  missingDetailAction,
  badDetail,
  deleteDescription,
  deleteBindings,
  missingDeleteCallback,
]
export type { InvalidDeleteKey }

void detailDescription
