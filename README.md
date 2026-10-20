# Notme

**Pause before you pay.** AI voice cloning lets scammers sound like a family member and push an elder to send money urgently. Notme does not try to detect fake voices. Instead, the elder sends the exact request (amount and recipient) to a family member they linked in advance, who confirms or rejects it on their own device.

> **Hackathon prototype.** Uses made-up demo data only. It never sends real money and is not an emergency or payment-safety guarantee.

## Current status

Phase 1 of 9: the app shell with mock screens. Not yet connected to a database, so nothing is shared between devices. See [`docs/PLAN.md`](docs/PLAN.md) for progress and [`docs/BUILD_LOG.md`](docs/BUILD_LOG.md) for what was done and tested.

## Run it locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173). Use the **Elder / Family** switch in the header to see both sides; this switch is demo-only and will be replaced by real sign-in in Phase 4.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server with live reload |
| `npm run lint` | Check code for common mistakes (oxlint) |
| `npm run typecheck` | Check TypeScript types (`tsc -b`) |
| `npm test` | Run automated tests once (Vitest) |
| `npm run test:watch` | Re-run tests whenever a file changes |
| `npm run build` | Typecheck, then build production files into `dist/` |

## Environment variables

Not needed until Phase 4. `.env.example` lists the placeholders; copy it to `.env.local` (ignored by Git). Never put a Supabase service-role key in this project.

## Learning

[`docs/LEARNING_GUIDE.md`](docs/LEARNING_GUIDE.md) teaches how to rebuild this app from an empty folder, one phase at a time.
