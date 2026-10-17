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
  configureIds: (_suffix?: string) => {},
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
  const [idSuffix, setIdSuffix] = createSignal<string>()
  classLifecycle.configureIds = (suffix) => {
    setIdSuffix(suffix)
    flush()
  }
  const attributes = (base: string, part?: string) => ({
    ...(part ? { 'data-id-part': part } : {}),
    ...(part && idSuffix()
      ? { id: 'dynamic-' + part.replaceAll('.', '-') + '-' + idSuffix() }
      : {}),
    get class() {
      return value()
    },
    'data-class-base': base,
  })
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
    <Card data-ui="" id="class-root" {...attributes('ui-card')}>
      <Field {...attributes('ui-field')} controlId="class-input" invalid>
        <Label {...attributes('ui-label')}>Class input</Label>
        <InputGroup {...attributes('ui-input-group')}>
          <Input
            id="class-input"
            {...attributes('ui-input')}
            ref={() => refs++}
          />
          <IconButton
            {...attributes('ui-button ui-icon-button')}
            aria-label="Class action"
            onClick={() => clicks++}
          >
            +
          </IconButton>
        </InputGroup>
        <HelpText {...attributes('ui-help')}>Help</HelpText>
        <FieldError {...attributes('ui-field-error')}>Error</FieldError>
      </Field>
      <FieldSet {...attributes('ui-field-set')}>
        <Textarea {...attributes('ui-textarea')} aria-label="Class notes" />
      </FieldSet>
      <Button
        id="class-button"
        {...attributes('ui-button')}
        onClick={() => clicks++}
        ref={() => refs++}
      >
        Class button
      </Button>
      <Checkbox
        {...attributes('ui-toggle ui-checkbox', 'Checkbox')}
        checked
        validationState="invalid"
      >
        <Checkbox.Input {...attributes('ui-toggle-input', 'Checkbox.Input')} />
        <Checkbox.Control
          {...attributes('ui-check-control', 'Checkbox.Control')}
        >
          <Checkbox.Indicator
            {...attributes('ui-check-indicator', 'Checkbox.Indicator')}
          />
        </Checkbox.Control>
        <Checkbox.Label {...attributes('ui-label', 'Checkbox.Label')}>
          Class checkbox
        </Checkbox.Label>
        <Checkbox.Description
          {...attributes('ui-help', 'Checkbox.Description')}
        >
          Help
        </Checkbox.Description>
        <Checkbox.ErrorMessage
          {...attributes('ui-field-error', 'Checkbox.ErrorMessage')}
        >
          Error
        </Checkbox.ErrorMessage>
      </Checkbox>
      <Switch {...attributes('ui-toggle ui-switch', 'Switch')} checked>
        <Switch.Input {...attributes('ui-toggle-input', 'Switch.Input')} />
        <Switch.Control {...attributes('ui-switch-control', 'Switch.Control')}>
          <Switch.Thumb {...attributes('ui-switch-thumb', 'Switch.Thumb')} />
        </Switch.Control>
        <Switch.Label {...attributes('ui-label', 'Switch.Label')}>
          Class switch
        </Switch.Label>
      </Switch>
      <RadioGroup {...attributes('ui-radio-group', 'RadioGroup')} value="a">
        <RadioGroup.Label {...attributes('ui-label', 'RadioGroup.Label')}>
          Class radio
        </RadioGroup.Label>
        <RadioGroup.Item
          {...attributes('ui-radio-item', 'RadioGroup.Item')}
          value="a"
        >
          <RadioGroup.ItemInput
            {...attributes('ui-toggle-input', 'RadioGroup.ItemInput')}
          />
          <RadioGroup.ItemControl
            {...attributes('ui-radio-control', 'RadioGroup.ItemControl')}
          >
            <RadioGroup.ItemIndicator
              {...attributes('ui-radio-indicator', 'RadioGroup.ItemIndicator')}
            />
          </RadioGroup.ItemControl>
          <RadioGroup.ItemLabel
            {...attributes('ui-label', 'RadioGroup.ItemLabel')}
          >
            Alpha
          </RadioGroup.ItemLabel>
          <RadioGroup.ItemDescription
            {...attributes('ui-help', 'RadioGroup.ItemDescription')}
          >
            Radio help
          </RadioGroup.ItemDescription>
        </RadioGroup.Item>
      </RadioGroup>
      <SelectField
        {...attributes('popup-trigger')}
        label="Class select"
        value="a"
        choices={[{ value: 'a', label: 'Alpha' }]}
        onValueChange={() => {}}
      />
      <Popover>
        <Popover.Trigger
          as={Button}
          id="class-popover-trigger"
          {...attributes('ui-button')}
        >
          Class popover
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content {...attributes('ui-popover')}>
            <Popover.Title {...attributes('ui-popup-title')}>
              Class popup
            </Popover.Title>
            <Popover.Description {...attributes('ui-popup-description')}>
              Description
            </Popover.Description>
            <Popover.CloseButton {...attributes('ui-button')}>
              Close class popup
            </Popover.CloseButton>
          </Popover.Content>
        </Popover.Portal>
      </Popover>
      <Dialog>
        <Dialog.Trigger {...attributes('ui-button')} as={Button}>
          Class dialog
        </Dialog.Trigger>
      </Dialog>
      <Badge {...attributes('ui-badge')}>Badge</Badge>
      <Separator {...attributes('ui-separator')} />
      <InlineAlert {...attributes('ui-inline-alert')}>Alert</InlineAlert>
      <EmptyState {...attributes('ui-empty-state')}>Empty</EmptyState>
      <Spinner {...attributes('ui-spinner')} />
      <Skeleton {...attributes('ui-skeleton')} />
      <Progress
        {...attributes('ui-progress')}
        value={50}
        aria-label="Class progress"
      />
      <Toast.Region {...attributes('ui-toast-region')}>
        <Toast open persistent>
          <Toast.Title {...attributes('ui-toast-title')}>
            Class notification
          </Toast.Title>
          <Toast.Description {...attributes('ui-toast-description')}>
            Description
          </Toast.Description>
        </Toast>
      </Toast.Region>
      <DashboardGrid {...attributes('ui-dashboard-grid')}>
        <DashboardPanel {...attributes('ui-card ui-dashboard-panel')}>
          Panel
        </DashboardPanel>
      </DashboardGrid>
      <TableWorkspace
        toggleLabel="Class controls"
        {...attributes('table-workspace')}
        controls={<p>Controls</p>}
      >
        <p>Results</p>
      </TableWorkspace>
    </Card>
  )
}
