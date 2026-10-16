import { Button } from '@wfe/components/fields'
import { uiScope } from '@wfe/components'
import { createSignal, flush } from 'solid-js'
import { nativeEvents } from '@wfe/components/events'
import { popupFields } from '../table-editing/fields'
import { PopupPriorityEditor } from './PopupPriorityEditor'

export function Standalone() {
  const [value, setValue] = createSignal('normal')
  const [disabled, setDisabled] = createSignal(false)
  const [invalid, setInvalid] = createSignal(false)
  let changes = 0
  window.popupFixture = {
    configure(next) {
      if ('value' in next) setValue(next.value!)
      if ('disabled' in next) setDisabled(next.disabled!)
      if ('invalid' in next) setInvalid(next.invalid!)
      flush()
    },
    read: () => ({
      value: value(),
      disabled: disabled(),
      invalid: invalid(),
      changes,
    }),
  }
  return (
    <main data-ui-portal-root="" {...uiScope()}>
      <h1>Popup compatibility</h1>
      <div class="standalone-controls">
        <Button>Before popup</Button>
        <PopupPriorityEditor
          value={value()}
          disabled={disabled()}
          invalid={invalid()}
          label="Priority"
          choices={popupFields.priority.choices}
          placeholder={popupFields.priority.placeholder}
          editorId="standalone/priority"
          ownerId="standalone"
          describedBy="standalone-message"
          onFocus={() => undefined}
          onValueChange={(value) => {
            changes++
            setValue(value)
          }}
        />
        <Button>After popup</Button>
      </div>
      <p id="standalone-message">{invalid() ? 'Choose a priority.' : ''}</p>
      <output>{value() || '(empty)'}</output>
      <Button ref={nativeEvents({ click: () => setValue('low') })}>
        Set Low externally
      </Button>
    </main>
  )
}

declare global {
  interface Window {
    popupFixture:
      | {
          configure: (next: {
            value?: string
            disabled?: boolean
            invalid?: boolean
          }) => void
          read: () => {
            value: string
            disabled: boolean
            invalid: boolean
            changes: number
          }
        }
      | undefined
  }
}
