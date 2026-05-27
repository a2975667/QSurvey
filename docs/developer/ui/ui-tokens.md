Design Language: Color & Surfaces (QV/QS)
=========================================

Purpose
- Define how color, shape, and spacing communicate meaning across the QV/QS app, starting from abstract roles and mapping to current implementations.
- This is a guiding document, not a finished token library; future work can extract concrete variables from these concepts.
- The canonical visual reference for the palette and roles is `docs/developer/ui/ui-design-system.html`; this page summarizes those decisions for engineers.

Design Principles
- Semantic first: colors represent roles (Positive/Negative/Neutral, Accent, Background), not arbitrary hex values.
- Consistency: the same semantic role should look the same across bins, vote cards, and results.
- Legibility: neutral surfaces and clear contrast so QV-specific cues (bidirectional votes, bins) are easy to understand.
- Progressive refinement: start from the palette we already use; centralize and simplify over time rather than introduce new colors ad hoc.

System Roles (Material-Style Mapping)
------------------------------------

We treat the core palette in `ui-design-system.html` as a Material-3-style system:
- Primary (`--sys-primary`): blue-grey `#6E799C`
- Primary container (`--sys-primary-container`): light blue-grey `#A6C2CE`
- Secondary (`--sys-secondary`): olive `#A6C29B`
- Tertiary (`--sys-tertiary`): gold `#EBC57C`
- Background (`--sys-background`): very light neutral `#F7F7FA`
- Surface (`--sys-surface`): white `#FFFFFF`
- Surface variant / outline (`--sys-surface-variant` / `--sys-outline`): `#DDDDDD`
- On-surface text (`--sys-on-surface`): dark neutral `#20222A`
- On-surface variant (`--sys-on-surface-variant`): blue-grey `#6E799C`

Use these roles conceptually even when we are not literally using CSS variables yet.

1) Outcome Polarity (used in bins and vote cards)
- Positive (benefit / support):
  - Mental model: “Good / chosen / supported”.
  - Current family: soft green/olive (`#A6C29B` and variants).
  - Where it appears:
    - Positive bin headers and borders in `Category.css` (organize view).
    - Left border and drag-area backgrounds for Positive vote cards in `DraggableItem.css`.
  - Guidance:
    - Use for categories or outcomes that indicate positive allocation of credits or “good” outcomes in results.
    - Do not reuse for generic success banners; keep it about QV choices / responses.

- Negative (cost / opposition):
  - Mental model: “Cost / penalty / push away”.
  - Current family: amber/gold (`#EBC57C`).
  - Where it appears:
    - Negative bin styling in `Category.css`.
    - Negative vote card borders and drag-area in `DraggableItem.css`.
  - Guidance:
    - Use for negative votes or “push away” categories.
    - Avoid using this gold for unrelated warnings to keep QV semantics clear.

- Neutral:
  - Mental model: “Middle / reference option”.
  - Current family: blue-grey (`#A6C2CE`).
  - Where it appears:
    - Neutral bin styling in `Category.css`.
    - Neutral vote card status in `DraggableItem.css`.
  - Guidance:
    - Use for bins/options that are neither strongly favored nor opposed.

- Undecided / Skip:
  - Mental model: “Not yet placed / intentionally skipped”.
  - Current family: mauve/grey (`#6B799E` for undecided, `#9C8F96` for skip).
  - Where it appears:
    - Undecided/Skip bin headers and card borders.
  - Guidance:
    - Use for “no decision yet” states; do not mix with neutral.

2) Accent & Interaction
- Primary accent (links, selected controls, primary buttons):
  - Mental model: “Active control / primary selection”.
  - Current family: blue-grey primary (`#6E799C`) with white text (`#FFFFFF`) or on-surface text (`#20222A`) depending on context.
  - Where it appears:
    - Filled/elevated primary buttons and key CTAs.
    - High-emphasis nav or toggles that represent the main action.
  - Guidance:
    - Use `#6E799C` for the strongest interactive focus.
    - Avoid using this color for bins or polarity; keep it reserved for interaction and “primary”.

- Tonal / secondary accent (containers, secondary buttons, chips):
  - Mental model: “Secondary emphasis / tonal surface”.
  - Current family: primary container (`#A6C2CE`) with dark text (`#20222A` or `#666666`).
  - Where it appears:
    - Tonal buttons, filter chips, and pills that need emphasis without introducing a new color.
    - Selected states in dropdowns or toggles where a softer background is preferred.
  - Guidance:
    - Use this as the go-to “colored surface” when you want to avoid a heavy primary fill.

- Info / Structural Accents:
  - Mental model: “Supportive information / metadata”.
  - Current family: on-surface variant (`#6E799C`) on very light background (`#F7F7FA`) with `#DDDDDD` border.
  - Where it appears:
    - Designer “Question Results” info pill.
    - Small badges, tags, and meta annotations that describe the UI rather than drive actions.
  - Guidance:
    - Use for badges/tooltips that show metadata; not for primary actions or QV polarity.

3) Surfaces & Text
- Surfaces:
  - Background: `#F7F7FA` for app-level background (matches `--sys-background`).
  - Main surfaces/cards: white (`#FFFFFF`) with light borders (`#DDDDDD`), subtle shadow for elevation.
  - Muted surfaces: `#F4F4F5`/`#F5F5F5` for secondary areas (bin background, debug cards, low-emphasis panels).
- Text:
  - Primary text: dark neutral (`#20222A` / `#222`) for body copy.
  - Secondary text: mid-greys (`#666666` / `#6E799C`) for helper text, captions, placeholders.
  - Overlines: uppercase labels in mid-grey (`#6E799C` / `#666666`); used as section labels (e.g., “Survey Overview”, “Results”, “Breakdown”).

Shape & Radius
- Cards (survey results cards, vote cards, bins):
  - Radius: 8px.
  - Shadow: low elevation (1–2px blur) to keep focus on content, not chrome.
- Pills/Chips (toggles, info pill):
  - Radius: 999px (completely rounded) for pills like info and view toggles, or 6–8px for smaller toggle buttons.
- Borders:
  - Semantic emphasis often appears as a side/band (e.g., border-left color for status) instead of full card borders, to reduce visual noise.

Spacing & Density
- Results cards:
  - Padding: ~1.5rem.
  - Margin between cards: 1.5rem.
  - Summary grid: auto-fit columns with ~1rem gaps.
- Bins:
  - Visual separation between “card” (undecided) and bins via `.bin-separator` and `.bins-section` with 1em vertical spacing and a light divider.
  - Scrollable bins: horizontal padding tuned to screen size, with scroll-snap and mobile hints.
- Vote cards:
  - Outer margin: ~10px.
  - Option card gap: ~1em between info and control regions.
  - Responsive behavior: stack to single column on narrow screens; keep vote controls visible without scrolling.

How to Use This Document
- When adding a new QV/QS UI surface:
  - Choose a semantic role first (Positive/Negative/Neutral/Undecided/Primary/Tonal/Surface/Text).
  - Reuse the existing color family for that role (as defined here and in `ui-design-system.html`); avoid new hex values unless there’s a clear need.
  - Match radius and spacing to the closest existing pattern (card vs. pill vs. badge).
- When changing colors:
  - Prefer updating a semantic role definition (e.g., “Primary” / “Positive” family) and then propagating, rather than changing individual selectors.
  - Check both bins (Category.css) and vote cards (DraggableItem.css) for consistency.

Future Consolidation
- Next step is to extract these roles into actual tokens (CSS variables or a theme file), e.g.:
  - System-style tokens: `--sys-primary`, `--sys-primary-container`, `--sys-surface`, `--sys-outline`, `--sys-on-surface`.
  - Status tokens: `--color-status-positive`, `--color-status-negative`, `--color-status-neutral`.
  - Shape/spacing: `--radius-card`, `--radius-pill`, `--space-card-padding`.
- Until then, this doc and `ui-design-system.html` should be kept up to date when introducing new colors or major layout changes to QV/QS flows.
