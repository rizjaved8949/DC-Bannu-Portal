# DCMS Bannu

Bilingual district monitoring prototype for school reports, health shifts, staff attendance, facility infrastructure, report verification and offline reporting.

React 19, TypeScript, TanStack Start, Vite and Nitro. Institutional records are generated deterministically from seed 2311; they are not an official district census. The reporting date is 23 November 2026. Role settings, reports, attendance changes, outbox entries and review decisions are saved in browser storage and survive refreshes. No backend, government database or real SMS provider is contacted.

## Client presentation walkthrough

The primary screens use normal operational language. The **Workspace controls** button in the top bar contains presentation journeys, the saved outbox, background activity and the environment explanation. Use **Reset presentation** there to restore the starting records before a meeting.

1. Open **Overview**. The district register includes all 62 registered institutions, with reporting completeness shown separately. Open **Schools** or **Health facilities** to inspect any institution, including one with no daily report.
2. Open an institution's profile. Show its administrative record, full roster, capacity, asset register, monitoring schedule and follow-ups. **Create follow-up** creates an assigned review item; **Export profile** downloads its register fields.
3. Choose **Open field report**, or select a journey from Workspace controls. Every institution in the current role's scope is selectable. School forms include the full roster and all classes, including Classes 11–12 where applicable. Hospital forms include duty statuses, OPD, beds, service availability and handover notes.
4. Choose **No signal**, enter attendance and **Save on phone**. Refresh to demonstrate recovery of the saved report. Switching to an available connection acknowledges and delivers the queued record. Alternatively, send directly with **SMS only**, then choose **Receive acknowledgement** to demonstrate the difference between sending and acceptance.
5. Follow **Track in reports inbox**, inspect the coded payload, parsed data, checks and lifecycle, then **Accept report**. The same submission updates the institution record, attendance, district metrics and review queue. Corrections are submitted as new revisions and earlier reports remain in the register.
6. Create an inspection follow-up or request a correction, assign its owner and close it with a note. Switch roles to show district, departmental and tehsil views. Refresh to show that decisions and role settings remain saved.
7. Open **Complaints → New complaint**, or **Raise complaint** on an institution profile. Filter the institution picker by tehsil, locality and type, select one institution or use **Select all matching** for a joint complaint across schools and health facilities. Enter details, priority and an assigned office. Filter the complaint register by area, locality, institution, type, status, priority, category or search; CSV exports the matching records. Open a complaint to record progress, reassignment or resolution with an action note. Complaints and their audit history survive refresh. Departmental roles see institutions in their scope; joint complaints crossing those scopes require district-wide authority to update.

Incoming background activity is paused initially so presentation figures stay stable. Manual reporting actions always update the interface. Start automatic activity from Workspace controls when wanted. Browser storage is private to that browser and origin, and is not a replacement for a shared production database.

## Usable field application

The **Field app** displays a mobile handset with live content inside its screen, an independent content scroller and fixed bottom navigation. It stays at phone width on desktop and adapts to narrow screens. Changing section or reporting step returns the screen content to the top.

Open **Field app → Open app view** for a focused interface without the portal navigation. It supports school and hospital administrators and uses the same institution and reporting state as the district portal. Its six sections are **Home**, **Report**, **My reports**, **Institution**, **Complaints** and **Help**. Direct examples are `/field-app?facility=SCH108&view=app` and `/field-app?facility=HF204&view=app`.

- **Home:** institution reporting status, outbox count, open review tasks, complaints and reporting shortcuts.
- **Report:** a usable four-step form with previous-step navigation. Unsent edits remain mounted while switching app sections. Save or send before refreshing or switching institution. **Show full journey** displays the four screens together for a client presentation; **Use step-by-step app** restores the normal form.
- **My reports:** institution-specific submissions and revisions, status and outbox filters, CSV export, receipt timestamps, SMS lifecycle, rejection reasons and acknowledgement controls. Select a connection before sending a saved report.
- **Institution:** registration details, reporting contact, hours, capacity, staff roster and current attendance, infrastructure checks, assets and monitoring dates.
- **Complaints:** register an institution complaint or open its progress, ownership and resolution record.
- **Help:** reporting instructions, status meanings, connection behavior, saving and correction guidance, staff mark definitions, role scope, privacy and simulator capabilities.

This is a responsive browser application, not a native Android package. Connectivity choices simulate delivery; no real SMS, GPS, camera or biometrics are used.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ff4691ed-2024-42bb-bb26-65ba7b9436d6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development and validation

Use Node.js 24 and npm. `package-lock.json` is the dependency lockfile.

```sh
npm ci
npm run dev
```

```sh
npm run check
npm run build
npm run test:production
npm audit --audit-level=high
```

`check` runs TypeScript and the automated tests. `test:production` invokes the built Vercel function for every main page, facility and employee detail pages, query-string views, bundled assets and unknown-route handling. Run the build before this check. GitHub Actions repeats these checks on pushes to `main` and pull requests.

## Deploy to Vercel

1. In Vercel, create a project and import `ZainAhm4d/DC-Portal-Bannu`.
2. Use the repository root, framework **TanStack Start**, production branch **main**, and Node.js **24.x**.
3. The checked-in `vercel.json` sets install command **npm ci** and build command **npm run build**. Leave the Output Directory override disabled; Nitro emits `.vercel/output`, including static assets and the SSR function.
4. Deploy. No environment variables, database or API keys are needed for this prototype.

Vercel's SSR routing supports opening and refreshing nested URLs such as `/schools/SCH101`, `/health/HF201`, `/staff/ST0145`, `/inbox?report=RPT-SCH102-20261123-012` and `/review?item=RV-1022`. After deployment, check these URLs as well as `/map` and `/field-app`. Leaflet loads only in the browser.

Standalone builds explicitly target Vercel. The existing Lovable configuration wrapper continues selecting its managed target inside Lovable. Keep the generated `.vercel/` directory and local environment files out of Git.

Deployment references: [Vercel's TanStack Start guide](https://vercel.com/kb/guide/deploy-a-tanstack-start-app-to-vercel) and [Nitro's Vercel provider](https://nitro.build/deploy/providers/vercel).
