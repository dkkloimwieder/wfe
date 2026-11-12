# Sliders and ranges

Import `Slider` and `RangeSlider` from `@wfe/components` or `@wfe/components/slider`.
Import the shared stylesheet once.
Both controls use one interaction engine and the shared control frames.

`Slider` accepts a numeric `value` and an `onValueChange` callback.
`RangeSlider` accepts an ordered pair and two `thumbLabels`.
The callback proposes a value. The application decides whether to accept it.
Rejected proposals preserve the accepted value, focus, and thumb nodes.

The default bounds are 0 and 100. The default step is 1.
Bounds must be finite and increasing. The step must be positive and usable within those bounds.
The controls clamp and snap displayed values without emitting a change request.
Range thumbs keep their order and expose their current dependent limits.

Arrow keys change one step. Home and End move to the allowed limits.
Page Up and Page Down change ten steps.
`direction="rtl"` reverses horizontal navigation. `orientation="vertical"` changes the track orientation.
`getValueText` supplies an accessible description of a numeric value.

`Field`, `Label`, and `HelpText` provide shared naming and state.
Otherwise, provide `aria-label` or `aria-labelledby`.
Disabled sliders leave the tab sequence. Readonly sliders retain focus and expose their value.
A `name` adds hidden form inputs. Ranges submit two values under the same name.
Disabled sliders omit those values from submission.

`onValueCommit` reports an accepted change after pointer release, key release, or keyboard focus departure.
Rejected changes do not commit.
Pointer cancellation retains the last accepted value without a commit callback.
Escape during a drag requests the value from the start of that gesture.
The application can reject that request.
The control measures its track once per pointer gesture.

The implementation follows the [WAI slider pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/) and [multi-thumb pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider-multithumb/).
Touch assistive-technology acceptance requires a device review.
The gallery route `?gallery=sliders` demonstrates acceptance, rejection, form values, RTL, and vertical controls.
Gallery acceptance remains a user review step.
