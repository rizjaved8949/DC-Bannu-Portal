<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules (NWDCMS prototype)

- Frontend-only prototype: all data comes from `src/data/mock.ts` (seeded mulberry32, seed 2311; "now" is 23 Nov 2026 11:40 PKT). Why: deterministic data renders identically on server and browser and needs no backend.
- Never call `Date.now()`/`new Date()` for "now" or `Math.random()` in render code; use `TODAY`, `NOW_MIN` and seeded helpers from mock.ts. Why: avoids hydration mismatches.
- Session state (role scope, filter bar, live report feed, report status overrides, review item edits) lives in `src/lib/app-state.tsx`; pages read it with `useApp()` and `useScopedFacilities()`. Why: switching role must filter every page.
- Report status always renders through `StatusGlyph`/`StatusBadge` in `src/components/dcms/status.tsx` (glyph + word + colour). Why: status must never be colour alone.
- Every page starts with `PageHeader` (English title + one-line description). All interface copy is English, per the user's preference.
- Tables use the `ledger` utility with `data-label` on each `<td>` so they stack on phones; figures get class `num`. Why: one responsive table pattern.
- Leaflet is browser-only: load the map component with `React.lazy` behind a client-only gate, never import `leaflet` from a route module. Why: SSR runs on workerd without `window`.
- Colours come from tokens in `src/styles.css` (canvas, surface, line, ink, ink-muted, kurram, topbar, wheat, and status pairs verified/sent/pending/problem/neutral with `-tint`). No raw colour classes, gradients or shadows on panels.
