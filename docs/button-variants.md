# Button variants

`Button` and `IconButton` accept `variant="outline"`, `"filled"`, `"inverted"`, or `"ghost"`.
Set `tone` to `"neutral"`, `"primary"`, `"secondary"`, or `"accent"` to choose a color independently of the variant.
Outline is the default variant. Omitting `tone` uses the theme's button color roles, including `--ui-button-color` and `--ui-button-on-color`.
This differs from explicit `tone="neutral"`, which uses the neutral text and surface roles.
The internal `data-tone="default"` marker represents the omitted-tone behavior. `"default"` is not a supported `ButtonTone` prop value.
Variants preserve dimensions, square corners, focus, disabled behavior, events, and the default `type="button"`.
The application chooses the variant for each action. Variants do not imply permissions, submission, or confirmation.

Neutral outline uses the existing surface, text, and button border.
Colored outlines use their selected role for text and borders at rest.
Filled uses the selected tone as its background, with a contrasting foreground.
Neutral filled uses the text and surface colors. A filled color role uses its matching foreground.
Set the color and foreground properties together when you choose custom colors.
If those properties are absent, colored tones fall back to the existing text and surface colors.
Inverted swaps the selected filled button's foreground and background.
A primary filled button with a blue background and white text becomes white with blue text when inverted.
Ghost uses a transparent border and background, with text in the selected tone. Its border still reserves space.
Outline and ghost use the existing highlight surface on hover.
Filled changes its fill on hover. Inverted changes its fill and text on hover. Buttons add no underline.
`--ui-primary-hover` and `--ui-primary-inverted-hover` let the application supply primary hover colors.
`--ui-button-filled-hover` and `--ui-button-inverted-hover` provide neutral hover colors.
The defaults mix existing colors. Custom themes must preserve readable contrast in both states.
All variants retain the shared focus outline. Forced colors use system button colors and a visible border.

The Table and form previews show four button samples beside the appearance controls.
The Tone controls apply Neutral, Primary, Secondary, or Accent to all four samples.
The samples start with primary tone so outline and filled show the selected primary color. The preview chooses black or white text from its existing samples for readable contrast.
Inverted reverses the selected tone, rather than switching to an unrelated neutral fill.
The previews do not change existing application actions or save appearance choices.

The variant and color split follows [Radix Themes](https://www.radix-ui.com/themes/docs/components/button).
The inverted meaning follows [Bulma](https://bulma.io/documentation/elements/button/#inverted).
Separate hover color roles follow [Mantine](https://mantine.dev/styles/css-variables/#variant-colors).

## Navigation links

`ButtonLink` renders a native anchor with the same appearance as `Button`.
Import it from `@wfe/components` or `@wfe/components/fields`.
Supply `href` and use the same `variant`, `tone`, and structured `class` properties.
Native anchor attributes, events, and refs remain available, including `target`, `rel`, and `download`.
The browser handles navigation, modified clicks, keyboard activation, and history.
Applications own routing and access decisions.
`ButtonLink` has no `disabled` property. An anchor does not support native disabled behavior.
If navigation is unavailable, render text or omit the action.
`aria-disabled` alone does not prevent navigation.
Use `Button` for submission and local actions.
