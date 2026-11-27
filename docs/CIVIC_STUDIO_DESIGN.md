# Civic Studio

NWDCMS's visual system prioritizes readable district information, a distinctive bilingual identity, and fast daily work.

## Directions considered

- **Civic Studio — selected:** evergreen navigation, crisp light surfaces, generous typography, restrained amber details, and department accents. Professional enough for district administration and approachable enough for everyday reporting.
- **District Atlas:** cartographic rules, compact labels, and an analytical, map-first identity. Less suitable for the portal's many forms and registers.
- **Quiet Signal:** minimal, muted surfaces with emphasis almost exclusively on alerts. Clear, but less distinctive and less helpful for separating departments.

## Tokens

All colours live in `src/styles.css`; components consume semantic tokens. The dark theme remaps the same tokens and preserves status semantics.

| Role                  | Token                                                          | Treatment                                                |
| --------------------- | -------------------------------------------------------------- | -------------------------------------------------------- |
| Brand / primary       | `kurram`, `kurram-soft`                                        | Evergreen and a pale companion tint                      |
| Navigation            | `topbar`, `topbar-raised`, `topbar-muted`, `topbar-foreground` | Deep evergreen, raised selection, muted text, light text |
| Education / secondary | `edu`, `edu-tint`                                              | Indigo                                                   |
| Health / secondary    | `health`, `health-tint`                                        | Teal                                                     |
| Accent                | `wheat`                                                        | Amber details and keyboard focus                         |
| Success               | `verified`, `verified-tint`                                    | Green                                                    |
| Informational         | `sent`, `sent-tint`                                            | Blue                                                     |
| Warning               | `pending`, `pending-tint`                                      | Amber                                                    |
| Error                 | `problem`, `problem-tint`                                      | Red                                                      |
| Neutral               | `neutral`, `neutral-tint`                                      | Slate                                                    |
| Foundations           | `canvas`, `surface`, `subtle`, `line`, `ink`, `ink-muted`      | Workspace, cards, insets, boundaries, text               |

Report statuses always retain their glyph and word; colour supplements meaning.

## Type, spacing and shape

- **English:** Manrope, with system fallbacks. **Figures / codes:** Atkinson Hyperlegible Mono. **Urdu:** Noto Nastaliq Urdu.
- **Type scale:** 12px secondary metadata; 14px labels and table copy; 15–16px body; 16–20px section titles; 30–36px page titles and metrics; 46px register total. Small navigation group labels are uppercase with tracking.
- **Spacing:** a 4px base with 8, 12, 16, 20, 24, 32 and 48px steps. Workspace gutters reduce on phones.
- **Radius:** 6px small, 9px controls, 12px panels, 18px feature panels; status badges are pills.
- **Elevation:** panels have no shadows. Borders, contrast, spacing, and small hover translations establish hierarchy. Only floating overlays use the existing `shadow-pop` elevation.

## Interaction

- Grouped, fixed desktop sidebar with an optional compact icon view. Navigation labels become tooltips in compact mode. A focus-trapped drawer serves phones and tablets.
- Search entry points share one dialog and one Ctrl/Cmd+K shortcut. Search continues to respect role scope.
- Theme and sidebar width are optional browser-local presentation preferences. Application data and workflows remain in the existing state layer.
- Buttons use restrained press feedback; cards and shortcuts use brief hover motion. Page transitions and section reveals never delay navigation or hide content pending an observer.
- Existing asynchronous skeletons use a neutral sweep. Empty and error states have a recognizable icon, readable explanation, and existing recovery actions.
- Reduced-motion preferences disable custom transitions, reveals, and smooth scrolling. Focus rings, labels, the skip link, print exports, and stacked mobile ledger rows remain available.

## Scope

This redesign changes presentation and navigation affordances. It does not change seeded data, reporting calculations, role-scope rules, persistence of application data, API integrations, or report and complaint workflows.

## Verification

### Navigation reliability

Primary navigation and breadcrumbs share one section catalogue. Breadcrumbs link to real parent pages and show the current record name, with role scope checked before displaying it. The mobile header keeps the section visible, and its drawer closes after choosing a destination. Sidebar selection follows the section path independently of query parameters.

School and health record sections now use validated `section` URL parameters; health shifts also use `shift`. Selected sections survive refresh and work with browser Back/Forward. Staff subviews participate in history. Tab changes and record-selection queries retain the current scroll position, and keyboard-selected record tabs scroll horizontally into view on phones. Map popups use client-side links.

Wrapped table links now have solid rectangular click targets. Registers remember their browsing page, row count and internal scroll position in the current workspace so parent links can return to the same place. This presentation memory is scoped to the matching filters/role and is not an authentication or data store. Tests cover navigation parsing, breadcrumb names/scope, returning to a register and React mount-effect replay.

Browser verification opened all nine primary sections, checking the selected sidebar item and scroll position. It also covered mouse-clicked facility names, parent links, health section Back/Forward and refresh, staff history, school deep links, mobile drawer closure, and visibility of the last keyboard-selected tab. No browser console errors were observed.

### Sign-in entry and reporting clarity

`/login` is a standalone, bilingual sign-in screen with a responsive evergreen brand panel, native keyboard-accessible role selection and a working “Continue” action. It uses the existing role state and preserves the workspace. It collects no credentials and does not provide authentication or restrict existing deep links. The header and profile menu link to it.

The overview now places critical follow-ups and an explanation of daily reporting before the directory and department summaries. The original 352/478 figure means that 352 operational facilities have a report that reached the district, including 32 rejected reports. Its three separate outcomes are 320 accepted, 32 requiring correction and 126 not yet received, totaling the same 478 expected facilities. The accepted group includes 132 reports awaiting officer verification. The other 84 registered schools are closed or non-functional and excluded from the expected total. Delivery channels are explained separately from reporting status.

The symbol-only facility matrix has been replaced with labelled, paginated area totals and named facility records. The underlying reporting calculations, status transitions, seeded data and role-scoping code are unchanged. Empty scopes explain why no reports are expected and offer a filter reset.

The updated suite passes 44 of 45 tests. Added checks cover the reporting categories, empty scope, login route and role selection. The same pre-existing complaints scope test remains the only failure. Browser checks verified phone and desktop sign-in, correct role scope, named details and reporting counts with no console errors.

### Finite registers and colour refinement

Schools, health facilities, staff, posts, exceptions, reports, complaints and infrastructure records now use shared presentation-only pagination: 10 rows by default, choices of 5/10/25/50, page jumps, clear ranges, boundary controls and a bounded scroll region. Filtering, sorting or changing role scope starts browsing at page one. Counts and CSV exports still use the complete filtered dataset. Print mode temporarily expands all rows and school insights, then restores the browsing layout.

School metrics sit in a native keyboard-accessible disclosure above the school list. The overview reporting board and remaining long detail tables have bounded scroll areas. Sticky column headers and the first desktop column keep context while scrolling.

Colour treatments now include indigo education, teal health, plum staff, blue inbox and coral complaints accents. Metric cards use their existing semantic tone for tinted backgrounds, figures, borders and icon badges. Brief page and disclosure transitions respect reduced motion; panels remain flat with no gradients or shadows.

Four new register tests cover navigation boundaries, filter/scope resets, page-size changes, direct jumps and full print output. The updated suite passes 40 of 41 tests, with the same pre-existing complaints scope failure noted below.

- TypeScript and the production build pass.
- The existing suite passes 36 of 37 tests. The complaints area-scope test also fails on an isolated copy of the original committed source, at `src/test/complaints.test.tsx:95`. No data, state, or test files were changed to address it.
- Browser inspection covered 390px, 768px, and 1440px viewports, light/dark themes, sidebar collapse, the mobile drawer, single-dialog search, role switching, facility records, inbox, review, complaints, field reporting, and map layout.
- The final overview and inspected mobile/tablet directory screens have no horizontal document overflow. Console inspection found no browser errors during these checks.
