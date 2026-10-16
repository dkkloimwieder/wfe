import {
  Button,
  Checkbox,
  Dialog,
  DropdownMenu,
  Field,
  Input,
  Popover,
  SelectField,
  Tooltip,
  uiScope,
} from '@wfe/components'
import {
  TableHeaderFilter,
  TableChoiceEditor,
  TableColumnFilter,
  TableDateFilter,
  TableFilter,
} from '@wfe/components/table'
import type {
  TableColumnFilterValue,
  TableDateRange,
} from '@wfe/components/table'
import { Show, createSignal, flush, onCleanup } from 'solid-js'

const choices = [
  { value: 'alpha', label: 'Alpha' },
  { value: 'beta', label: 'Beta' },
  { value: 'unavailable', label: 'Unavailable', disabled: true },
  { value: 'gamma', label: 'Gamma' },
]
export function ConsistencyControls() {
  const params = new URLSearchParams(location.search)
  const [disabled, setDisabled] = createSignal(false)
  const [readonly, setReadonly] = createSignal(false)
  const [invalid, setInvalid] = createSignal(false)
  const [accept, setAccept] = createSignal(true)
  const [text, setText] = createSignal('Initial')
  const [choice, setChoice] = createSignal('alpha')
  const [checked, setChecked] = createSignal(false)
  const [filter, setFilter] = createSignal<TableColumnFilterValue | undefined>()
  const [range, setRange] = createSignal<TableDateRange | undefined>()
  const [mounted, setMounted] = createSignal(true)
  let changes = 0,
    cleanups = 0
  let native: HTMLDivElement | undefined
  const changeText = (value: string) => {
    changes++
    if (accept()) setText(value)
  }
  const changeChoice = (value: string) => {
    changes++
    if (accept()) setChoice(value)
  }
  window.consistencyFixture = {
    configure(next) {
      if ('disabled' in next) setDisabled(next.disabled!)
      if ('readonly' in next) setReadonly(next.readonly!)
      if ('invalid' in next) setInvalid(next.invalid!)
      if ('accept' in next) setAccept(next.accept!)
      if ('text' in next) setText(next.text!)
      if ('choice' in next) setChoice(next.choice!)
      if ('mounted' in next) setMounted(next.mounted!)
      flush()
    },
    read: () => ({
      text: text(),
      choice: choice(),
      checked: checked(),
      changes,
      cleanups,
    }),
  }
  onCleanup(() => {
    cleanups++
  })
  const fields = (name: string) => (
    <div
      data-consumer={name}
      style={{ width: '260px', display: 'grid', gap: '6px' }}
    >
      <Field disabled={disabled()} readonly={readonly()} invalid={invalid()}>
        <Input
          aria-label={`${name} text`}
          value={text()}
          onValueChange={changeText}
        />
      </Field>
      <Field disabled={disabled()} readonly={readonly()} invalid={invalid()}>
        <SelectField
          label={`${name} choice`}
          choices={choices}
          value={choice()}
          onValueChange={changeChoice}
        />
      </Field>
      <Checkbox
        checked={checked()}
        disabled={disabled()}
        readOnly={readonly()}
        validationState={invalid() ? 'invalid' : 'valid'}
        onChange={(value) => {
          changes++
          if (accept()) setChecked(value)
        }}
      >
        <Checkbox.Input />
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <Checkbox.Label>{name} flag</Checkbox.Label>
      </Checkbox>
      <Button disabled={disabled()} onClick={() => changeChoice('alpha')}>
        {name} action
      </Button>
    </div>
  )
  return (
    <main
      {...uiScope(
        params.has('comfortable') ? 'comfortable' : 'compact',
        params.has('dark') ? 'dark' : undefined,
      )}
      data-ui-portal-root=""
    >
      <h1>Control consistency</h1>
      <Button id="consistency-outside">Outside action</Button>
      <Show when={mounted()}>
        <div style={{ display: 'flex', 'align-items': 'start', gap: '24px' }}>
          <div
            data-consumer="table"
            style={{ width: '260px', display: 'grid', gap: '6px' }}
          >
            <Field
              disabled={disabled()}
              readonly={readonly()}
              invalid={invalid()}
            >
              <TableFilter
                label="table text"
                clearLabel="Clear table text"
                value={text()}
                disabled={disabled()}
                onValueChange={changeText}
              />
            </Field>
            <Field
              disabled={disabled()}
              readonly={readonly()}
              invalid={invalid()}
            >
              <TableChoiceEditor
                label="table choice"
                value={choice()}
                disabled={disabled()}
                invalid={invalid()}
                choices={choices}
                onValueChange={changeChoice}
              />
            </Field>
            <TableFilter
              kind="boolean"
              label="table flag"
              clearLabel="Clear table flag"
              value={checked() ? 'true' : 'false'}
              disabled={disabled()}
              onValueChange={(value) => {
                changes++
                if (accept()) setChecked(value === 'true')
              }}
            />
            <Button disabled={disabled()} onClick={() => changeChoice('alpha')}>
              table action
            </Button>
          </div>
          {fields('form')}
          <Popover placement="bottom-start">
            <Popover.Trigger>Open matrix popup</Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                onFocusOutside={(event) => event.preventDefault()}
                onPointerDownOutside={(event) => event.preventDefault()}
              >
                <Popover.Title>Matrix popup</Popover.Title>
                {fields('overlay')}
                <Popover.CloseButton aria-label="Close matrix popup">
                  Close matrix popup
                </Popover.CloseButton>
              </Popover.Content>
            </Popover.Portal>
          </Popover>
        </div>
        <section aria-label="Filter families" style={{ width: '260px' }}>
          <TableColumnFilter
            label="Choice filter"
            clearLabel="Clear choice filter"
            config={{ kind: 'select', choices }}
            value={filter()}
            disabled={disabled()}
            onValueChange={setFilter}
          />
          <TableColumnFilter
            label="Multiple filter"
            clearLabel="Clear multiple filter"
            config={{ kind: 'multi-select', choices }}
            value={filter()}
            disabled={disabled()}
            onValueChange={setFilter}
          />
          <TableColumnFilter
            label="Tags filter"
            clearLabel="Clear tags filter"
            config={{ kind: 'tags', choices }}
            value={filter()}
            disabled={disabled()}
            onValueChange={setFilter}
          />
          <TableColumnFilter
            label="Number filter"
            clearLabel="Clear number filter"
            config={{ kind: 'number-range' }}
            value={undefined}
            disabled={disabled()}
            onValueChange={() => {}}
          />
          <TableDateFilter
            label="Date filter"
            startLabel="Date start"
            endLabel="Date end"
            clearStartLabel="Clear start"
            clearEndLabel="Clear end"
            value={range()}
            disabled={disabled()}
            onValueChange={setRange}
          />
        </section>
        <TableHeaderFilter
          columnId="matrix"
          columnLabel="Header choice"
          disabled={disabled()}
          label="Header selection"
          clearLabel="Clear header selection"
          choices={choices}
          value={choice()}
          onValueChange={changeChoice}
        />
        <Button onClick={() => native?.showPopover()}>
          Open native parent
        </Button>
        <div
          ref={(node) => {
            native = node
          }}
          popover="auto"
          data-native-parent=""
          style={{ padding: '12px', overflow: 'visible' }}
        >
          <Input aria-label="Native parent text" defaultValue="Parent" />
          <SelectField
            label="Native choice"
            choices={choices}
            value={choice()}
            onValueChange={changeChoice}
          />
          <Popover>
            <Popover.Trigger>Nested popover</Popover.Trigger>
            <Popover.Portal>
              <Popover.Content data-nested="popover">
                <Popover.Title>Nested display</Popover.Title>
                <SelectField
                  label="Nested choice"
                  choices={choices}
                  value={choice()}
                  onValueChange={changeChoice}
                />
                <Popover.CloseButton>Close nested display</Popover.CloseButton>
              </Popover.Content>
            </Popover.Portal>
          </Popover>
          <DropdownMenu>
            <DropdownMenu.Trigger>Nested menu</DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content data-nested="menu">
                <DropdownMenu.Item onSelect={() => changeChoice('beta')}>
                  Choose Beta
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu>
          <Tooltip openDelay={0} closeDelay={0}>
            <Tooltip.Trigger>Nested help</Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content data-nested="tooltip">
                Nested description
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip>
          <Dialog>
            <Dialog.Trigger>Nested dialog</Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay />
              <Dialog.Content data-nested="dialog">
                <Dialog.Title>Nested edit</Dialog.Title>
                <Input aria-label="Nested dialog text" defaultValue="Dialog" />
                <SelectField
                  label="Dialog choice"
                  choices={choices}
                  value={choice()}
                  onValueChange={changeChoice}
                />
                <Dialog.CloseButton>Close nested edit</Dialog.CloseButton>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog>
          <Button onClick={() => native?.hidePopover()}>
            Close native parent
          </Button>
        </div>
      </Show>
    </main>
  )
}
declare global {
  interface Window {
    consistencyFixture: {
      configure: (next: {
        disabled?: boolean
        readonly?: boolean
        invalid?: boolean
        accept?: boolean
        text?: string
        choice?: string
        mounted?: boolean
      }) => void
      read: () => {
        text: string
        choice: string
        checked: boolean
        changes: number
        cleanups: number
      }
      stop?: () => void
    }
  }
}
