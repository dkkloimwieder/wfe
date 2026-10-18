import type {
  FormDescription,
  FormViewBindings,
  TableDescription,
  TableViewBindings,
  LayoutDescription,
  LayoutViewBindings,
} from '@wfe/generator'
import type { FormContract } from '@wfe/form'
import type { NativeTable } from '@wfe/components/table'

type MemberInput = {
  name: string
  enabled: boolean
  role: 'reader' | 'author'
  nickname: string
}
type MemberRow = { key: string; first: string; last: string; points: number }
declare const memberForm: FormContract<MemberInput>
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
