import { createSignal } from 'solid-js'
import {
  Button,
  Field,
  Input,
  Label,
  Popover,
  SelectField,
} from '@wfe/components'
import { Theme } from '@wfe/components/theme'
import type { ThemeMode } from '@wfe/components/theme'
import './theme-review.css'

function ThemeControls(props: {
  name: string
  draft: string
  onDraftChange: (value: string) => void
  count: number
  onAction: () => void
}) {
  return (
    <section class="theme-review-controls" aria-label={props.name}>
      <h3>{props.name}</h3>
      <Field>
        <Label>{props.name} draft</Label>
        <Input value={props.draft} onValueChange={props.onDraftChange} />
      </Field>
      <div class="example-actions">
        <Button onClick={props.onAction}>Action · {props.count}</Button>
        <Popover>
          <Popover.Trigger>{props.name} details</Popover.Trigger>
          <Popover.Portal>
            <Popover.Content data-theme-review-popup={props.name}>
              <Popover.Title>{props.name} details</Popover.Title>
              <Popover.Description>
                This popup belongs to the nearest theme.
              </Popover.Description>
              <Field>
                <Label>{props.name} popup draft</Label>
                <Input
                  value={props.draft}
                  onValueChange={props.onDraftChange}
                />
              </Field>
              <Popover.CloseButton>Close</Popover.CloseButton>
            </Popover.Content>
          </Popover.Portal>
        </Popover>
      </div>
    </section>
  )
}

/** The same application state and controls under independent theme owners. */
export function ThemeReview() {
  const [mode, setMode] = createSignal<ThemeMode>('light')
  const [draft, setDraft] = createSignal('Shared draft')
  const [count, setCount] = createSignal(0)
  const controls = {
    get draft() {
      return draft()
    },
    onDraftChange: setDraft,
    get count() {
      return count()
    },
    onAction: () => setCount((value) => value + 1),
  }
  return (
    <section class="example-stack theme-review">
      <h2>Theme boundaries</h2>
      <p>
        Each boundary owns its controls and popups. All examples share one draft
        and action count. The review mode below applies to these boundaries
        independently of the gallery frame.
      </p>
      <Field>
        <Label>Review mode</Label>
        <SelectField
          label="Review mode"
          value={mode()}
          onValueChange={(value) =>
            setMode(value === 'dark' ? 'dark' : 'light')
          }
          choices={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
      </Field>
      <div class="theme-review-grid">
        <Theme
          id="theme-review-default"
          mode={mode()}
          class="theme-review-boundary"
        >
          <ThemeControls name="Sketchy outer" {...controls} />
          <Theme
            id="theme-review-vanilla-inner"
            preset="vanilla"
            mode={mode()}
            class="theme-review-boundary"
          >
            <ThemeControls name="Vanilla inner" {...controls} />
          </Theme>
        </Theme>
        <Theme
          id="theme-review-vanilla"
          preset="vanilla"
          mode={mode()}
          class="theme-review-boundary"
        >
          <ThemeControls name="Vanilla outer" {...controls} />
          <Theme
            id="theme-review-default-inner"
            mode={mode()}
            class="theme-review-boundary"
          >
            <ThemeControls name="Sketchy inner" {...controls} />
          </Theme>
        </Theme>
      </div>
      <Theme
        id="theme-review-custom"
        preset="vanilla"
        mode={mode()}
        class="theme-review-boundary theme-review-custom"
        style={{
          '--ui-font-family': 'Georgia, serif',
          '--ui-radius': '1rem',
          '--ui-panel-radius': '1.25rem',
          '--ui-border-width': '2px',
        }}
      >
        <h2>Consumer stylesheet example</h2>
        <p>
          This example extends Vanilla with a serif font, larger corners and
          thicker borders through public variables. It uses the same controls
          and application state above.
        </p>
        <ThemeControls name="Custom vanilla" {...controls} />
      </Theme>
    </section>
  )
}
