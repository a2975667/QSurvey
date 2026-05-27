QV/QS UI CSS Overview
=====================

Scope
-----
- Cheatsheet for CSS that shapes the QV/QS flows (bins/organize, vote cards, dropdown) and related survey/designer surfaces in the client.
- Files live under `client/src/components` and `client/src/pages/survey/components`.

Quick Map
---------
- QV / Organize surfaces:
  - Bins and organize view (`client/src/components/Category/Category.css`).
  - Draggable option cards (`client/src/components/DraggableItem/DraggableItem.css`).
  - Vote selector dropdown (`client/src/components/VoteSelection/Dropdown.css`).
- Generic survey layouts:
  - Multi-question page structure (`client/src/pages/survey/components/multiQuestionSurvey.css`).
  - Shared survey layout wrappers (`client/src/pages/survey/components/surveyLayout.css`).
- Designer surfaces:
  - Survey edit info panel and collaborators row (`client/src/pages/survey/surveyEdit.css`).

QV / Organize CSS
-----------------

1) `client/src/components/Category/Category.css` (Bins / Organize view)
- Bins layout:
  - `.category-container-parent.organize.*` styles the bin columns with scroll-snap, shadows, padding; color-coded borders for Positive (`#a6c29b`), Negative (`#ebc47c`), Neutral (`#A6C2CE`), Skip (`#9c8f96`), Undecided (`#6b799e`).
  - Responsive breakpoints:
    - <768px: one bin visible (`width: 90vw`), swipe hint (`.mobile-swipe-hint`), scroll padding.
    - 768–1023px: two bins side-by-side (`width: 48vw`).
    - ≥1024px: three bins (`width: 31%`, min-width 350px); ≥1600px centers the bins.
  - Scroll containers: `.scrollable-bins`, `.categoryCanvas.organize` hide scrollbars, use snap, and add swipe hint via `::after` on `.category-separator`.
  - Bin separator and indicator (`.bin-separator`, `.bin-indicator`) add a divider and arrow cue between card area and bins.
  - Titles: `.viewCategoryTitle-*` sets colored headers per bin; `h2.*` adds colored borders and block before text.

2) `client/src/components/DraggableItem/DraggableItem.css` (Option cards/voting)
- Card shell: `.item-wrapper` with hover lift/shadow; variants `.vote`/`.organize` adjust layout.
- Status colors: border-left colors match bin palette (Positive/Negative/Neutral/Skip/Undecided).
- Drag handle: `.draggable-area` with dots columns; colored background per status.
- Layout: `.optionCard` two-column (info + controls), responsive to single column <500px.
- Vote area: `.vote-interaction-area`, `.vote-current-state` (min widths), `.credit-summary-box` for remaining credits summary.
- Responsive tweaks <768px: stack controls, enlarge vote-current-state, show “Tap to change” hint on active vote-display.

3) `client/src/components/VoteSelection/Dropdown.css` (Vote selector)
- Container widths (`.select-dropdown-container`) with breakpoints at 1080/768/500px.
  - `.select__control/menu` sized to ~95%; selected option adds left border highlight (`#A6C2CE`).
- Labels `.vote-label`/`.cost-label` center-align values.

Generic Survey Layout CSS
-------------------------
- `client/src/pages/survey/components/multiQuestionSurvey.css`: container/card spacing for multi-question surveys (generic, not QV-specific).
- `client/src/pages/survey/components/surveyLayout.css`: question title/description/controls styling used across question types.

Designer Surfaces
-----------------

Survey Edit Info Panel
- File: `client/src/pages/survey/surveyEdit.css`
- Status chips:
  - Live/Not Live chip uses primary and neutral roles for background/border; survey/unique key chips reuse muted surface tokens.
  - Key pill (`.survey-key-pill`) shows the active sKey with rounded border and small label text.

Collaborators UI (Designer)
- Same file: `client/src/pages/survey/surveyEdit.css`
- Collaborators row under survey description:
  - Inline pills aligned with “Collaborators:” label; Edit/Save button trails on the same line.
  - Pills: compact 11px text, ~3px/7px padding, subtle border; self pill uses primary container color (#A6C2CE) and is non-removable.
  - In edit mode, input appears inline; remove buttons are small to keep pill height consistent.
  - The Edit button toggles into Save when editing; any loading status is shown just below the row.

Selection Question Authoring (Designer)
- File: `client/src/pages/survey/surveyEdit.css`
- Key classes:
  - `.selection-settings-section`, `.selection-settings-card` — container + card layout.
  - `.selection-setting-row`, `.selection-setting-label`, `.selection-setting-control` — label/control grid rows.
  - `.selection-summary-row`, `.selection-summary-text` — compact summary line.
  - `.selection-advanced`, `.selection-advanced-toggle` — “auto” control threshold UI.
  - `.selection-option-item`, `.selection-option-details` — per-option UI and details toggle.

Projects List (Designer)
- Files:
  - UI: `client/src/pages/designer/DesignerPage.tsx`
  - Styles: `client/src/pages/designer/designer.css`
- Responsive layout lessons:
  - When using flex rows with “label + input/button”, apply `min-width: 0` to the flex child that must shrink; otherwise long labels/buttons can force unexpected wrapping.
  - Avoid `width: 100%` on inputs inside a flex row unless you explicitly want a forced line break; prefer `flex: 1` and allow shrink.
  - If project count gates actions (e.g., “Limit reached”), disable create/sort while the initial list is loading to avoid briefly showing an incorrect state.

Notes
- Colors for bins/votes should stay in sync across Category and DraggableItem to avoid visual mismatch.
- Scroll hints and snap behavior can conflict with new wrappers; verify on mobile if modifying container padding/overflow.
- No Tailwind/utility framework; styles are plain CSS with media queries.
