// Generated from built declarations by tests/consumers/generate.mjs.
// Resolve only public package exports through the workspace node_modules links.
import type {
  RangeSlider,
  RangeSliderProps,
  Slider,
  SliderChangeEvent,
  SliderCommitEvent,
  SliderProps,
} from '@wfe/components/slider'
import type { AllTyped, Assert } from '../assertions.js'

export type ExportedTypes = Assert<
  AllTyped<{
    RangeSlider: typeof RangeSlider
    RangeSliderProps: RangeSliderProps
    Slider: typeof Slider
    SliderChangeEvent: SliderChangeEvent
    SliderCommitEvent: SliderCommitEvent
    SliderProps: SliderProps
  }>
>
