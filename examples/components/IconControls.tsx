import { Checkbox, Combobox, Icon, Select, uiScope } from '@wfe/components'
import type { IconName } from '@wfe/components'
import { createSignal, flush } from 'solid-js'

type Configuration = {
  dir?: 'ltr' | 'rtl'
  content?: 'default' | 'custom' | 'empty'
}
declare global {
  interface Window {
    iconFixture: { configure: (value: Configuration) => void }
  }
}
const names = [
  'check',
  'minus',
  'cross',
  'chevron-down',
  'chevron-right',
  'chevron-left',
  'refresh',
  'controls',
  'filter',
  'calendar',
] satisfies IconName[]
export function IconControls() {
  const [dir, setDir] = createSignal<'ltr' | 'rtl'>('ltr')
  const [content, setContent] = createSignal<'default' | 'custom' | 'empty'>(
    'default',
  )
  const custom = () =>
    content() === 'custom' ? (
      <span data-custom-icon>Custom</span>
    ) : content() === 'empty' ? (
      ''
    ) : undefined
  window.iconFixture = {
    configure: (value) => {
      if (value.dir) setDir(value.dir)
      if (value.content) setContent(value.content)
      flush()
    },
  }
  return (
    <main {...uiScope()} dir={dir()}>
      <h1>Shared icons</h1>
      <div data-glyphs>
        {names.map((name) => (
          <span>
            <Icon name={name} /> {name}{' '}
          </span>
        ))}
      </div>
      <div data-default-select>
        <Select options={['One', 'Two']} defaultValue="One">
          <Select.Label>Automatic caret</Select.Label>
          <Select.Trigger>
            <Select.Value<string>>
              {(state) => state.selectedOption()}
            </Select.Value>
          </Select.Trigger>
        </Select>
      </div>
      <div data-slot-select>
        <Select options={['One', 'Two']} defaultValue="One">
          <Select.Label>Explicit icon</Select.Label>
          <Select.Trigger>
            <Select.Value<string>>
              {(state) => state.selectedOption()}
            </Select.Value>
            <Select.Icon>{custom()}</Select.Icon>
          </Select.Trigger>
        </Select>
      </div>
      <Combobox options={['One', 'Two']}>
        <Combobox.Label>Combobox icon</Combobox.Label>
        <Combobox.Control>
          <Combobox.Input />
          <Combobox.Trigger aria-label="Open choices">
            <Combobox.Icon>{custom()}</Combobox.Icon>
          </Combobox.Trigger>
        </Combobox.Control>
      </Combobox>
      <Checkbox defaultChecked indeterminate>
        <Checkbox.Input />
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <Checkbox.Label>Mixed checkbox</Checkbox.Label>
      </Checkbox>
    </main>
  )
}
