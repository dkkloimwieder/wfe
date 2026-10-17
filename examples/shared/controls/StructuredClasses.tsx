import { createSignal, flush, onCleanup } from 'solid-js'
import type { JSX } from '@solidjs/web'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  EmptyState,
  Field,
  FieldError,
  FieldSet,
  HelpText,
  IconButton,
  InlineAlert,
  Input,
  InputGroup,
  Label,
  Popover,
  Progress,
  RadioGroup,
  SelectField,
  Separator,
  Skeleton,
  Spinner,
  Switch,
  Textarea,
  Toast,
} from '@wfe/components'
import { DashboardGrid, DashboardPanel } from '@wfe/components/layout'
import { TableWorkspace } from '@wfe/components/table'

export const initialClasses: JSX.ClassValue = [
  'caller-a caller-shared',
  { 'caller-on': true, 'caller-off': false },
  [0, 23, true, false, null, undefined, ['caller-nested']],
]
export const classLifecycle = {
  configure: (_value: JSX.ClassValue) => {},
  configureMap: (_enabled: boolean, _nested?: boolean) => {},
  read: () => ({ refs: 0, clicks: 0, cleanups: 0 }),
}

/** Shared client and hydration fixture for native class values. */
export function StructuredClasses() {
  const [value, setValue] = createSignal<JSX.ClassValue>(initialClasses)
  const [enabled, setEnabled] = createSignal(false)
  const conditional = {
    get 'caller-live'() {
      return enabled()
    },
  }
  const conditionalArray = [['caller-map-array', conditional]]
  classLifecycle.configureMap = (next, nested) => {
    setEnabled(next)
    setValue(nested ? conditionalArray : conditional)
    flush()
  }
  let refs = 0
  let clicks = 0
  let cleanups = 0
  classLifecycle.configure = (next) => {
    setValue(next)
    flush()
  }
  classLifecycle.read = () => ({ refs, clicks, cleanups })
  onCleanup(() => cleanups++)
  return (
    <Card data-ui="" id="class-root" class={value()} data-class-base="ui-card">
      <Field
        class={value()}
        data-class-base="ui-field"
        controlId="class-input"
        invalid
      >
        <Label class={value()} data-class-base="ui-label">
          Class input
        </Label>
        <InputGroup class={value()} data-class-base="ui-input-group">
          <Input
            id="class-input"
            class={value()}
            data-class-base="ui-input"
            ref={() => refs++}
          />
          <IconButton
            class={value()}
            data-class-base="ui-button ui-icon-button"
            aria-label="Class action"
            onClick={() => clicks++}
          >
            +
          </IconButton>
        </InputGroup>
        <HelpText class={value()} data-class-base="ui-help">
          Help
        </HelpText>
        <FieldError class={value()} data-class-base="ui-field-error">
          Error
        </FieldError>
      </Field>
      <FieldSet class={value()} data-class-base="ui-field-set">
        <Textarea
          class={value()}
          data-class-base="ui-textarea"
          aria-label="Class notes"
        />
      </FieldSet>
      <Button
        id="class-button"
        class={value()}
        data-class-base="ui-button"
        onClick={() => clicks++}
        ref={() => refs++}
      >
        Class button
      </Button>
      <Checkbox
        class={value()}
        data-class-base="ui-toggle ui-checkbox"
        checked
        validationState="invalid"
      >
        <Checkbox.Input class={value()} data-class-base="ui-toggle-input" />
        <Checkbox.Control class={value()} data-class-base="ui-check-control">
          <Checkbox.Indicator
            class={value()}
            data-class-base="ui-check-indicator"
          />
        </Checkbox.Control>
        <Checkbox.Label class={value()} data-class-base="ui-label">
          Class checkbox
        </Checkbox.Label>
        <Checkbox.Description class={value()} data-class-base="ui-help">
          Help
        </Checkbox.Description>
        <Checkbox.ErrorMessage class={value()} data-class-base="ui-field-error">
          Error
        </Checkbox.ErrorMessage>
      </Checkbox>
      <Switch class={value()} data-class-base="ui-toggle ui-switch" checked>
        <Switch.Input class={value()} data-class-base="ui-toggle-input" />
        <Switch.Control class={value()} data-class-base="ui-switch-control">
          <Switch.Thumb class={value()} data-class-base="ui-switch-thumb" />
        </Switch.Control>
        <Switch.Label class={value()} data-class-base="ui-label">
          Class switch
        </Switch.Label>
      </Switch>
      <RadioGroup class={value()} data-class-base="ui-radio-group" value="a">
        <RadioGroup.Label class={value()} data-class-base="ui-label">
          Class radio
        </RadioGroup.Label>
        <RadioGroup.Item
          class={value()}
          data-class-base="ui-radio-item"
          value="a"
        >
          <RadioGroup.ItemInput
            class={value()}
            data-class-base="ui-toggle-input"
          />
          <RadioGroup.ItemControl
            class={value()}
            data-class-base="ui-radio-control"
          >
            <RadioGroup.ItemIndicator
              class={value()}
              data-class-base="ui-radio-indicator"
            />
          </RadioGroup.ItemControl>
          <RadioGroup.ItemLabel class={value()} data-class-base="ui-label">
            Alpha
          </RadioGroup.ItemLabel>
        </RadioGroup.Item>
      </RadioGroup>
      <SelectField
        class={value()}
        data-class-base="popup-trigger"
        label="Class select"
        value="a"
        choices={[{ value: 'a', label: 'Alpha' }]}
        onValueChange={() => {}}
      />
      <Popover>
        <Popover.Trigger
          as={Button}
          id="class-popover-trigger"
          class={value()}
          data-class-base="ui-button"
        >
          Class popover
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content class={value()} data-class-base="ui-popover">
            <Popover.Title class={value()} data-class-base="ui-popup-title">
              Class popup
            </Popover.Title>
            <Popover.Description
              class={value()}
              data-class-base="ui-popup-description"
            >
              Description
            </Popover.Description>
            <Popover.CloseButton class={value()} data-class-base="ui-button">
              Close class popup
            </Popover.CloseButton>
          </Popover.Content>
        </Popover.Portal>
      </Popover>
      <Dialog>
        <Dialog.Trigger class={value()} data-class-base="ui-button" as={Button}>
          Class dialog
        </Dialog.Trigger>
      </Dialog>
      <Badge class={value()} data-class-base="ui-badge">
        Badge
      </Badge>
      <Separator class={value()} data-class-base="ui-separator" />
      <InlineAlert class={value()} data-class-base="ui-inline-alert">
        Alert
      </InlineAlert>
      <EmptyState class={value()} data-class-base="ui-empty-state">
        Empty
      </EmptyState>
      <Spinner class={value()} data-class-base="ui-spinner" />
      <Skeleton class={value()} data-class-base="ui-skeleton" />
      <Progress
        class={value()}
        data-class-base="ui-progress"
        value={50}
        aria-label="Class progress"
      />
      <Toast.Region class={value()} data-class-base="ui-toast-region">
        <Toast open persistent>
          <Toast.Title class={value()} data-class-base="ui-toast-title">
            Class notification
          </Toast.Title>
          <Toast.Description
            class={value()}
            data-class-base="ui-toast-description"
          >
            Description
          </Toast.Description>
        </Toast>
      </Toast.Region>
      <DashboardGrid class={value()} data-class-base="ui-dashboard-grid">
        <DashboardPanel
          class={value()}
          data-class-base="ui-card ui-dashboard-panel"
        >
          Panel
        </DashboardPanel>
      </DashboardGrid>
      <TableWorkspace
        toggleLabel="Class controls"
        class={value()}
        data-class-base="table-workspace"
        controls={<p>Controls</p>}
      >
        <p>Results</p>
      </TableWorkspace>
    </Card>
  )
}
