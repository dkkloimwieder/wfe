# Toggles and groups

Import `Toggle` and `ToggleGroup` from `@wfe/components` or `@wfe/components/toggle`.
Both controls use the shared Button implementation and stylesheet.

`Toggle` accepts `pressed` and `onPressedChange`.
The callback proposes the next state. The application decides whether to accept it.
The visible label stays the same in both states.
The pressed state uses the filled Button variant by default.
`variant` controls the unpressed appearance. `pressedVariant` controls the pressed appearance.

`ToggleGroup` accepts uniquely keyed `items` and a controlled `value`.
Single selection uses a string or `undefined`.
With `multiple`, the value is an array of strings.
`allowEmpty={false}` prevents removal of the final selected value.
Item values keep button nodes stable across record replacement and reordering.

Space and Enter activate the focused button.
Arrow keys, Home, and End move focus without selecting a value.
Disabled items leave that navigation sequence.
`orientation="vertical"` uses Up and Down. `direction="rtl"` reverses horizontal navigation.
`loop={false}` stops navigation at the ends.
Readonly buttons retain focus and expose an unavailable activation state.

A standalone toggle gets its accessible name from its children or `aria-label`.
Name a group with `aria-label`, `aria-labelledby`, or the shared Field and Label.
Provide an accessible name for each icon-only item.
A `name` adds hidden form values for accepted selections.
Disabled controls and disabled items omit their values from submission.
Readonly selections still submit their accepted values.

The implementation follows the [WAI toggle button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/).
The gallery route `?gallery=toggles` demonstrates toolbar toggles, view selection, multiple formatting choices, rejection, and retained drafts.
Gallery acceptance remains a user review step.
