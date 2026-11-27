# Civic Studio

DCMS Bannu's visual system prioritizes readable district information, a distinctive bilingual identity, and fast daily work.

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

### Finite registers and colour refinement

Schools, health facilities, staff, posts, exceptions, reports, complaints and infrastructure records now use shared presentation-only pagination: 10 rows by default, choices of 5/10/25/50, page jumps, clear ranges, boundary controls and a bounded scroll region. Filtering, sorting or changing role scope starts browsing at page one. Counts and CSV exports still use the complete filtered dataset. Print mode temporarily expands all rows and school insights, then restores the browsing layout.

School metrics sit in a native keyboard-accessible disclosure above the school list. The overview reporting board and remaining long detail tables have bounded scroll areas. Sticky column headers and the first desktop column keep context while scrolling.

Colour treatments now include indigo education, teal health, plum staff, blue inbox and coral complaints accents. Metric cards use their existing semantic tone for tinted backgrounds, figures, borders and icon badges. Brief page and disclosure transitions respect reduced motion; panels remain flat with no gradients or shadows.

Four new register tests cover navigation boundaries, filter/scope resets, page-size changes, direct jumps and full print output. The updated suite passes 40 of 41 tests, with the same pre-existing complaints scope failure noted below.

- TypeScript and the production build pass.
- The existing suite passes 36 of 37 tests. The complaints area-scope test also fails on an isolated copy of the original committed source, at `src/test/complaints.test.tsx:95`. No data, state, or test files were changed to address it.
- Browser inspection covered 390px, 768px, and 1440px viewports, light/dark themes, sidebar collapse, the mobile drawer, single-dialog search, role switching, facility records, inbox, review, complaints, field reporting, and map layout.
- The final overview and inspected mobile/tablet directory screens have no horizontal document overflow. Console inspection found no browser errors during these checks.
