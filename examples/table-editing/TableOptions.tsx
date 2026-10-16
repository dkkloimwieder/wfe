import { Checkbox, SelectField } from '@wfe/components'
import type { TableControls } from './Table'

export function TableOptions(props: {
  disabled?: boolean
  controls: TableControls
  configure: (value: Partial<TableControls>) => void
}) {
  return (
    <details class="display-options">
      <summary>Display options</summary>
      <fieldset class="display-fields" disabled={props.disabled}>
        <label>
          Column filter controls
          <SelectField
            label="Column filter controls"
            data-ui-text="system"
            value={props.controls.filters}
            disabled={props.disabled}
            choices={[
              { value: 'external', label: 'Above the table' },
              { value: 'headers', label: 'In column headers' },
              { value: 'both', label: 'Both' },
              { value: 'none', label: 'Hidden' },
            ]}
            onValueChange={(value) =>
              props.configure({ filters: value as TableControls['filters'] })
            }
          />
        </label>
        <Checkbox
          class="check-option"
          checked={props.controls.headerSorting}
          disabled={props.disabled}
          onChange={(checked) => props.configure({ headerSorting: checked })}
        >
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Header sorting</Checkbox.Label>
        </Checkbox>
        <Checkbox
          class="check-option"
          checked={props.controls.globalSearch}
          disabled={props.disabled}
          onChange={(checked) => props.configure({ globalSearch: checked })}
        >
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Global search</Checkbox.Label>
        </Checkbox>
        <Checkbox
          class="check-option"
          checked={props.controls.grouping}
          disabled={props.disabled}
          onChange={(checked) => props.configure({ grouping: checked })}
        >
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Grouping controls</Checkbox.Label>
        </Checkbox>
        <Checkbox
          class="check-option"
          checked={props.controls.columnResizing}
          disabled={props.disabled}
          onChange={(checked) => props.configure({ columnResizing: checked })}
        >
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Column resizing</Checkbox.Label>
        </Checkbox>
        <label>
          Resize behavior
          <SelectField
            label="Resize behavior"
            data-ui-text="system"
            value={props.controls.resizeBehavior}
            disabled={props.disabled}
            choices={[
              { value: 'grow', label: 'Grow table' },
              { value: 'fixed', label: 'Keep table width' },
            ]}
            onValueChange={(value) =>
              props.configure({
                resizeBehavior: value as TableControls['resizeBehavior'],
              })
            }
          />
        </label>
        <Checkbox
          class="check-option"
          checked={props.controls.columnReordering}
          disabled={props.disabled}
          onChange={(checked) => props.configure({ columnReordering: checked })}
        >
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Column rearrangement</Checkbox.Label>
        </Checkbox>
      </fieldset>
    </details>
  )
}
