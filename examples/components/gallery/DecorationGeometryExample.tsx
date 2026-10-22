import { createSignal, For, Show } from 'solid-js'
import type { JSX } from '@solidjs/web'
import {
  Button,
  Checkbox,
  Field,
  FieldGroup,
  FormActions,
  Input,
  Label,
  Theme,
  SelectField,
  defaultDecorationGeometry,
  themeStyle,
} from '@wfe/components'
import type { DecorationGeometry } from '@wfe/components'

// The nested owner changes geometry while keeping the gallery appearance.
const inheritedAppearance = Object.fromEntries(
  Object.keys(themeStyle()).map((key) => [key, 'inherit']),
) as JSX.CSSProperties
const ranges = [
  {
    key: 'taperReduction',
    label: 'Taper reduction',
    min: 0,
    max: 8,
    step: 0.1,
  },
  {
    key: 'rotationReduction',
    label: 'Rotation reduction',
    min: 0,
    max: 8,
    step: 0.05,
  },
] as const
export function DecorationGeometryExample() {
  const [geometry, setGeometry] = createSignal<DecorationGeometry>({
    ...defaultDecorationGeometry,
    randomizeOnHover: false,
  })
  const [width, setWidth] = createSignal(360)
  const [height, setHeight] = createSignal(720)
  const [draft, setDraft] = createSignal(
    'Keep this draft while adjusting the shape',
  )
  const [revision, setRevision] = createSignal(1)
  const [clicks, setClicks] = createSignal(0)
  return (
    <div class="example-stack">
      <FieldGroup
        title="Decoration geometry"
        columns={2}
        help="Zero keeps the full default effect. Higher values reduce it more as size grows. Taper uses each side; rotation uses the longest side."
      >
        <For each={ranges}>
          {(range) => (
            <Field>
              <Label>{range.label}</Label>
              <Input
                type="range"
                min={range.min}
                max={range.max}
                step={range.step}
                value={geometry()[range.key]}
                onValueChange={(value) =>
                  setGeometry((current) => ({
                    ...current,
                    [range.key]: Number(value),
                  }))
                }
              />
              <output>
                {geometry()[range.key].toFixed(
                  range.key === 'rotationReduction' ? 2 : 1,
                )}
              </output>
            </Field>
          )}
        </For>
        <SelectField
          label="Scale"
          value={geometry().scale}
          choices={[
            { value: 'linear', label: 'Linear (proportional)' },
            { value: 'power', label: 'Exponent' },
          ]}
          onValueChange={(scale) => {
            if (scale === 'linear' || scale === 'power')
              setGeometry((current) => ({ ...current, scale }))
          }}
        />
        <Show when={geometry().scale === 'power'}>
          <Field>
            <Label>Exponent</Label>
            <Input
              type="range"
              min={0.1}
              max={4}
              step={0.1}
              value={geometry().exponent}
              onValueChange={(value) =>
                setGeometry((current) => ({
                  ...current,
                  exponent: Number(value),
                }))
              }
            />
            <output>{geometry().exponent.toFixed(1)}</output>
          </Field>
        </Show>
        <Checkbox
          checked={!geometry().randomizeOnHover}
          onChange={(checked) =>
            setGeometry((current) => ({
              ...current,
              randomizeOnHover: !checked,
            }))
          }
        >
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Hold random samples</Checkbox.Label>
        </Checkbox>
        <Field>
          <Label>Preview width</Label>
          <Input
            type="range"
            min="240"
            max="1000"
            step="10"
            value={width()}
            onValueChange={(value) => setWidth(Number(value))}
          />
          <output>{width()}px maximum</output>
        </Field>
        <Field>
          <Label>Preview height</Label>
          <Input
            type="range"
            min="240"
            max="1000"
            step="10"
            value={height()}
            onValueChange={(value) => setHeight(Number(value))}
          />
          <output>{height()}px</output>
        </Field>
        <FormActions>
          <Button
            onClick={() => {
              setWidth(300)
              setHeight(800)
            }}
          >
            Tall
          </Button>
          <Button
            onClick={() => {
              setWidth(800)
              setHeight(240)
            }}
          >
            Wide
          </Button>
          <Button
            onClick={() => {
              setWidth(400)
              setHeight(400)
            }}
          >
            Square
          </Button>
          <Button onClick={() => setRevision((value) => value + 1)}>
            New samples
          </Button>
          <Button
            onClick={() =>
              setGeometry({
                ...defaultDecorationGeometry,
                randomizeOnHover: false,
              })
            }
          >
            Reset geometry
          </Button>
        </FormActions>
      </FieldGroup>
      <Show when={revision()} keyed>
        {(sampleId) => (
          <Theme
            id={`geometry-preview-${sampleId}`}
            decorationGeometry={geometry()}
            style={inheritedAppearance}
            class="geometry-preview"
          >
            <FormActions>
              <Button
                class="geometry-fixed-sample"
                onClick={() => setClicks((value) => value + 1)}
              >
                Small action
              </Button>
              <output role="status" aria-label="Sample actions">
                {clicks()} actions
              </output>
            </FormActions>
            <div class="geometry-stage">
              <FieldGroup
                title="Preview section"
                decoration
                class="geometry-sample"
                style={{ width: `${width()}px`, 'min-height': `${height()}px` }}
              >
                <Field>
                  <Label>Preview draft</Label>
                  <Input value={draft()} onValueChange={setDraft} />
                </Field>
                <Button onClick={() => setClicks((value) => value + 1)}>
                  Section action
                </Button>
              </FieldGroup>
            </div>
          </Theme>
        )}
      </Show>
      <code>{JSON.stringify(geometry(), null, 2)}</code>
    </div>
  )
}
