# Button variants

`Button` and `IconButton` accept `variant="outline"`, `"filled"`, `"inverted"`, or `"ghost"`.
Outline remains the default. Variants preserve dimensions, square corners, focus, disabled behavior, events, and the default `type="button"`.
The application chooses the variant for each action. Variants do not imply permissions, submission, or confirmation.

Outline uses the existing surface and button border.
Filled uses `--ui-accent` and `--ui-on-accent` for its background and text.
If those properties are absent, filled uses the existing text and surface colors.
Set both accent properties together and choose readable text contrast.
Inverted uses `--ui-text` as its background and `--ui-surface` as its text.
Ghost uses a transparent border and background. Its border still reserves space.
Filled and inverted underline their text on hover. Ghost uses the existing highlight surface.
All variants retain the shared focus outline. Forced colors use system button colors and a visible border.

The Table and form previews show four button samples beside the appearance controls.
Filled follows the selected accent. The preview chooses black or white text from its existing samples for readable contrast.
Inverted follows the selected surface and text colors.
The previews do not change existing application actions or save appearance choices.
