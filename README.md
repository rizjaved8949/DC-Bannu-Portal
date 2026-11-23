# DCMS Bannu

Bilingual district monitoring prototype for school reports, health shifts, staff attendance, facility infrastructure, report verification and offline reporting.

React 19, TypeScript, TanStack Start, Vite and Nitro. All records are illustrative, generated deterministically from seed 2311. The reporting date is 23 November 2026. Role changes, review decisions and simulated submissions last for the browser session; this prototype does not send real SMS or persist records to a backend.

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
