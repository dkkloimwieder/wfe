import { expect, test } from 'vitest'
import { TableColumnFilter, TableHeaderFilter } from '@wfe/components'
import type {
  TableColumnFilterConfig,
  TableColumnFilterProps,
  TableColumnFilterValue,
  TableFilterValue,
} from '@wfe/components'

// Compiled by the strict unit type gate; these controls need no DOM to prove inference.
function filterTypes(config: TableColumnFilterConfig) {
  const contextual: TableColumnFilterProps = {
    label: 'Named structured',
    config: { kind: 'text' },
    value: undefined,
    onValueChange: (value) => {
      const operator: TableColumnFilterValue['operator'] | undefined =
        value?.operator
      void operator
      // @ts-expect-error Named legacy props must not infer any or boolean.
      const wrong: boolean | undefined = value
      void wrong
    },
  }
  const namedBoolean: TableColumnFilterProps<{ kind: 'boolean' }> = {
    label: 'Named boolean',
    config: { kind: 'boolean' },
    value: false,
    onValueChange: (value) => {
      const boolean: boolean | undefined = value
      void boolean
    },
  }
  const namedBroad: TableColumnFilterProps<TableColumnFilterConfig> = {
    label: 'Named broad',
    config,
    value: undefined,
    onValueChange: (value) => {
      const criterion: TableFilterValue | undefined = value
      void criterion
    },
  }
  void [contextual, namedBoolean, namedBroad]
  const narrow = (value: TableColumnFilterValue | undefined) => void value
  const broad = (value: TableFilterValue | undefined) => void value
  const oldProps: TableColumnFilterProps = {
    label: 'Old',
    config: { kind: 'text' },
    value: undefined,
    onValueChange: narrow,
  }
  const invalid = (
    <TableColumnFilter
      label="Invalid"
      config={{ kind: 'text' }}
      value={undefined}
      // @ts-expect-error A boolean callback cannot handle structured text criteria.
      onValueChange={(_value: boolean | undefined) => void _value}
    />
  )
  void invalid
  return (
    <>
      <TableColumnFilter
        label="Text"
        config={{ kind: 'text' }}
        value={undefined}
        onValueChange={(value) => {
          const structured: TableColumnFilterValue | undefined = value
          void structured
          // @ts-expect-error Text criteria are not booleans.
          const wrong: boolean | undefined = value
          void wrong
        }}
      />
      <TableColumnFilter
        label="Boolean"
        config={{ kind: 'boolean' }}
        value={false}
        onValueChange={(value) => {
          const boolean: boolean | undefined = value
          void boolean
        }}
      />
      <TableColumnFilter
        label="Date"
        config={{ kind: 'date-range' }}
        value={undefined}
        onValueChange={(value) => {
          const boundary: string | undefined = value?.start
          void boundary
        }}
      />
      <TableColumnFilter {...oldProps} />
      <TableColumnFilter
        label="Broad"
        config={config}
        value={undefined}
        onValueChange={(value) => broad(value)}
      />
      <TableHeaderFilter
        columnId="text"
        columnLabel="Text"
        label="Text"
        config={{ kind: 'text' }}
        value={undefined}
        onValueChange={(value) => narrow(value)}
      />
      <TableHeaderFilter
        columnId="bool"
        columnLabel="Bool"
        label="Bool"
        config={{ kind: 'boolean' }}
        value={false}
        onValueChange={(value) => {
          const boolean: boolean | undefined = value
          void boolean
        }}
      />
      <TableHeaderFilter
        columnId="date"
        columnLabel="Date"
        label="Date"
        config={{ kind: 'date-range' }}
        value={undefined}
        onValueChange={(value) => {
          const boundary: string | undefined = value?.end
          void boundary
        }}
      />
      <TableHeaderFilter columnId="old" columnLabel="Old" {...oldProps} />
      <TableHeaderFilter
        columnId="broad"
        columnLabel="Broad"
        label="Broad"
        config={config}
        value={undefined}
        onValueChange={(value) => broad(value)}
      />
      <TableHeaderFilter
        columnId="legacy"
        columnLabel="Legacy"
        label="Legacy"
        value=""
        onValueChange={(value) => {
          const legacy: string = value
          void legacy
        }}
      />
    </>
  )
}

test('filter callback inference fixtures are included in the strict type gate', () => {
  expect(typeof filterTypes).toBe('function')
})
