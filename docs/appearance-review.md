# Appearance review

The default Table example at `http://127.0.0.1:7786/` has three neutral modes:
BLACK / WHITE, LIGHT, and DARK. The initial mode remains BLACK / WHITE.
LIGHT and DARK use the neutral roles from Open Props.
LIGHT Surface 1 uses `#fcfcfd`, between its original `#f8f9fa` and white, for lighter content. Color applies only to
accents. Each mode keeps APPLY at full contrast.

The top row separates surface modes, accent colors, and shadow depth.
Use Tab to focus a control. Press Enter or Space to activate it.
BASE, PANES, and CONTENT each offer SURFACE 1, 2, or 3.
BASE sets the backdrop. PANES sets both pane backgrounds.
CONTENT sets control sections, table content, and popup backgrounds.
LEFT, TOP, and RIGHT select the controls placement.
One shared header centers RECORDS across the workspace.
Its sliders icon and APPLY sit at the left for LEFT/TOP placement and at the right for RIGHT placement.
The sliders icon hides or shows the controls pane.
The sample row shows SURFACE 1–4 and TEXT 1–2 with their exact values.
All control rows scroll horizontally on narrow screens.
The Table fills the remaining height.
ROW LINES and COLUMN LINES each offer SURFACE 1 through 4.
Both start at SURFACE 1. BLACK / WHITE uses the LIGHT neutral surfaces for these lines.
These choices affect table dividers, while pane borders keep their current color.

The backdrop, panes, and content start with SURFACE 1.
The controls preserve these choices across mode changes.
Pane titles, section summaries, and table headings remain unfilled.
SURFACE 3 supplies hover and selection backgrounds.
SURFACE 4 supplies neutral borders. TEXT 1 supplies primary text.
TEXT 2 supplies secondary text.
BLACK / WHITE keeps white surfaces and black text and borders.

DEPTH offers OFF and three increasing shadow levels. It starts at level 1.
The continuous workspace frame uses the selected shadow level.
Its panes and control sections have no separate shadows. Popups use level 3.
OFF removes these shadows. The sample shadows show the available levels.
The workspace allows shadows beyond its edges. The page contains overflow.
Corners stay square.

The accent controls change focus and selection marks. They preserve every
neutral surface and text value. The preview changes CSS properties without
changing records, pending filters, sorting, grouping, formatting, or column order.
Reloading restores BLACK / WHITE, a neutral accent, depth 1, and the initial surface choices.
No preview saves or approves a final theme.

The application owns the review controls. The components expose shared surface,
text, border, focus, and shadow properties. No remote stylesheet or new runtime
dependency is required.

The samples come from [Open Props](https://open-props.style/#color), commit
`f39ab7c377a0e047f930982e3611bbc95254a260`. The source URLs and SHA-256 hashes
remain in `examples/dashboard/appearance.ts` and `review-shadows.css`.
The exact MIT license remains in `examples/dashboard/OPEN-PROPS-LICENSE`.
The shadow subset changes only its variable prefix.
