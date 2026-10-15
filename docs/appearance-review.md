# Appearance review

The default Table example at `http://127.0.0.1:7786/` has three neutral modes:
BLACK / WHITE, LIGHT, and DARK. The initial mode remains BLACK / WHITE.
LIGHT and DARK use the neutral roles from Open Props. Color applies only to
accents. Each mode keeps APPLY at full contrast.

The top row separates surface modes from accent colors. Use Tab to focus a
control. Press Enter or Space to activate it. The second row shows SURFACE 1–4
and TEXT 1–2 with their exact values. Both rows scroll horizontally on narrow
screens. The Table fills the remaining height.

SURFACE 1 sits behind the panes and supplies content backgrounds. SURFACE 2
supplies both pane shells and their matching header bands. SURFACE 3 supplies
subsection headings, table column headings, hover, and selection backgrounds.
SURFACE 4 supplies neutral borders. Popups use SURFACE 2. TEXT 1 supplies primary text. TEXT 2 supplies secondary text.
BLACK / WHITE collapses these roles to white surfaces and black text and borders.

The DEPTH control turns shadows on or off. Surface samples show increasing
shadow depth. Panes use shadow 1. Popups use shadow 3. These shadows follow the
Open Props shadow values and their light and dark strength. Corners stay square.

The accent controls change focus and selection marks. They preserve every
neutral surface and text value. The preview changes CSS properties without
changing records, pending filters, sorting, grouping, formatting, or column order.
Reloading restores BLACK / WHITE, a neutral accent, and disabled depth.
No preview saves or approves a final theme.

The application owns the review controls. The components expose shared surface,
text, border, focus, and shadow properties. No remote stylesheet or new runtime
dependency is required.

The samples come from [Open Props](https://open-props.style/#color), commit
`f39ab7c377a0e047f930982e3611bbc95254a260`. The source URLs and SHA-256 hashes
remain in `examples/dashboard/appearance.ts` and `review-shadows.css`.
The exact MIT license remains in `examples/dashboard/OPEN-PROPS-LICENSE`.
The shadow subset changes only its variable prefix.
