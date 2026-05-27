Header, Footer, and App Shell
=============================

Overview
--------
- The app uses a shared shell for most pages and a minimal chrome for survey-taking.
- This ensures consistent branding/navigation while keeping the respondent experience focused.

Quick Map
---------
- App shell: shared header + footer wrapper (`AppShell`) used on home, designer, survey edit, and designer results.
- Header:
  - `TopAppBar` with title, breadcrumbs, optional leading/back button, and user menu actions.
- Designer pages:
  - Survey edit info panel shows title, description, status chips, key pill, and collaborators row under the same shell.
- Footer:
  - Demo disclaimer and version string; shared across shell pages only.
- Survey-taking:
  - Minimal chrome (no app header/footer), only an `Exit survey` control.

App Shell (Non‑Survey Pages)
----------------------------
- Component: `client/src/layout/AppShell.tsx`
  - Wraps pages with:
    - `TopAppBar` (header).
    - `<main>` content area.
    - Shared footer (`components/footer/Footer.tsx`).
  - Used on:
    - Home: `HomePage` (`/`).
    - Designer: `DesignerPage` (`/designer`).
    - Survey edit: `SurveyEdit` (`/survey/:id/edit`).
    - Designer results: `SurveyResultsPage` (`/designer/results/:id`).

Top App Bar
-----------
- Component: `client/src/layout/TopAppBar.tsx`
- Props (key ones):
  - `title`: left-hand brand/context, e.g. `QSurvey System`.
  - `breadcrumbs?: ReadonlyArray<{ label: string; onClick?: () => void }>`:
    - Rendered inline as `Title / Crumb1 / Crumb2 ...`.
    - Crumbs with `onClick` are styled as links; others are labels.
    - Last crumb is clickable by default (visual affordance) even if it has no `onClick`.
  - `leading?: React.ReactNode`:
    - Typically a back icon button (Material‑style chevron) for “up” navigation.
  - `actions?: React.ReactNode`:
    - Right‑aligned actions (login button or user menu).
  - `onTitleClick?: () => void`:
    - Used to navigate the brand/title (e.g., `QSurvey System`) back to home.

Current routing usage:
- Designer workspace:
  - `/designer`:
    - `title: 'QSurvey System'`
    - `breadcrumbs: [{ label: 'Projects', onClick: () => navigate('/designer') }]`.
  - `/survey/:id/edit`:
    - `title: 'QSurvey System'`
    - `breadcrumbs: [{ label: 'Projects', onClick: () => navigate('/designer') }, { label: 'Edit <survey title>' }]`.
    - `leading`: back icon button → `/designer`.
  - `/designer/results/:id`:
    - `title: 'QSurvey System'`
    - `breadcrumbs: [{ label: 'Projects', onClick: () => navigate('/designer') }, { label: 'Results' }]`.
    - `leading`: back icon button → `/designer`.
- Home:
  - `title: 'QSurvey System'`, no breadcrumbs; `actions` determined by auth state.

User Menu (Avatar + Dropdown)
-----------------------------
- Component: `client/src/layout/UserMenu.tsx`
- Usage:
  - Home:
    - When logged out: header shows a simple `Login` button.
    - When logged in:
      - `UserMenu` with `email`, `onLogout`, `onProjects` (navigates to `/designer`).
  - Designer workspace pages:
    - `UserMenu` with `email` and `onLogout`; `My Projects` entry omitted (already in Projects).
- Behavior:
  - Avatar shows the first character of the email (upper‑cased).
  - Dropdown items:
    - Top label row with full email (truncated visually with ellipsis, full in `title`).
    - Optional `My Projects` (when `onProjects` is provided).
    - `Logout`.
  - Clicking outside closes the dropdown.

Footer
------
- Component: `client/src/components/footer/Footer.tsx`
- Styles: `client/src/components/footer/Footer.css`
  - Slimmed down padding and font size:
    - `padding: 0.5rem 0;`
    - `font-size: 0.85rem;`
    - Reduced paragraph margin for tighter vertical footprint.
- Content:
  - Demo disclaimer and version text; version lives here and should use the existing version stamp format.
- The footer is only present on `AppShell` pages (not on the survey-taking flow).

Collaborators Row (Survey Edit)
-------------------------------
- Location: `client/src/pages/survey/SurveyEdit.tsx` with styling in `client/src/pages/survey/surveyEdit.css`.
- Pattern: “Collaborators:” label + inline pills + trailing Edit/Save button on one line; input only appears when editing.
- Pills:
  - Compact 11px text with small padding; self pill uses primary container color and cannot be removed.
  - Remove affordance appears only in edit mode for non-self pills.
- Buttons:
  - Edit toggles into inline edit mode; Save reuses the same button when editing and preserves collaborator order.
 - For behavior details (tokenization, lookup, saving), see `docs/developer/frontend/survey-frontend.md` under “SurveyEdit: Collaborators Row”.

Survey‑Taking Layout
--------------------
- File: `client/src/pages/survey/SurveyView.tsx`
- No global header:
  - The old `Banner` header was removed to keep the respondent view focused.
- Exit control:
  - A small `Exit survey` control in the top‑right:
    - Styles: `.survey-exit-bar`, `.survey-exit-button`, `.survey-exit-button-icon` in `client/src/pages/survey/survey.css`.
    - Uses `MdExitToApp` icon and “Exit survey” label.
    - On click: `navigate('/')` (returns to home).
- Layout:
  - `loading-container` and `survey-container` use flex column with `min-height: 100vh` so the exit control and content are well defined.

Button Colors & Design Tokens
-----------------------------
- Designer “Edit Survey” button:
  - Styles: `.edit-survey-btn` in `client/src/pages/designer/designer.css`.
  - Uses design‑system tertiary gold: `#EBC57C` with a slightly darker hover `#E0B86F`.
  - Rationale: align with `--sys-tertiary` (gold) as defined in `docs/developer/ui/ui-tokens.md` instead of ad‑hoc hex codes.
- Primary/secondary accents:
  - Continue to use `#6E799C` (primary) and `#A6C2CE` (primary container) as described in `ui-tokens.md`.

Guidelines for New Pages
------------------------
- For new “app” pages (non‑survey):
  - Wrap in `AppShell`.
  - Use `TopAppBar` with:
    - `title: 'QSurvey System'`.
    - Breadcrumbs for section/context (e.g., `Projects`, `Settings`, etc.).
    - `leading` chevron for “up one level” when appropriate.
    - `actions` wired through `UserMenu` or a simple `Login` button.
  - Rely on the shared footer; do not introduce new footers per page.
- For new respondent/survey flows:
  - Prefer minimal chrome; if an exit/back control is needed, follow the `survey-exit-bar` pattern:
    - Small, right‑aligned icon+label.
    - No full app header unless explicitly required for that flow.
