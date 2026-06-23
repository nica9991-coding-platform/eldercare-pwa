# Kindred — Eldercare Coordination PWA

A mobile-first Progressive Web App for **eldercare coordination**, built around a **Care Circle** (one circle per senior). It serves two very different audiences from one product:

- **Caregivers / adult children** — quick reassurance and tools to manage a parent's care.
- **The senior** — a near-zero-friction, kiosk-simple way to confirm they took their medication.

The core daily loop: **doses get logged → family sees a plain-language daily summary → if something's off, a severity-styled alert surfaces.**

> Built from a hi-fi design handoff. This is the implementation of four specced screens plus a scaffolded backend.

---

## Quick start (no account or backend needed)

```bash
npm install
npm run dev
```

Open the printed `localhost` URL. The app runs in **demo mode** against mock data — no AWS account, no sign-up.

- **Sign-in code is `123456`** (any email works).
- A floating **gear button** (bottom-right) opens "preview controls" — jump between screens and force every design state (quiet/alert day, loading, offline, missed dose, empty circle, etc.). It's a dev affordance, not part of the product.
- Try an invite link with `?invite=demo-token-1` (or `?invite=expired-x` for the expired state).

## Tech stack

- **React 19 + TypeScript + Vite**, installable PWA (`vite-plugin-pwa`)
- **react-router-dom** for routing
- **IndexedDB** (`idb-keyval`) for the offline dose-log queue
- Styling is inline against CSS-variable design tokens in `src/styles/tokens.css` (faithful to the handoff spec — colors, type scale, radii, shadows, WCAG AA/AAA contrast)
- **AWS Amplify Gen 2** backend (Cognito / AppSync / DynamoDB / Lambda) — scaffolded but not deployed; the app auto-detects it and falls back to demo mode when absent

## The four screens

Bottom nav has five tabs (Today / History / Radar / Circle / More); other screens are reached by navigation.

| Route | Screen | Notes |
|---|---|---|
| `/` | **Entry** | Email → 6-digit code sign-in + accept-invite (6 states) |
| `/onboard` | **Onboard** | 3-step create-circle: name senior → add meds w/ schedules → review |
| `/today` | **Today (Senior)** ★ | The hero screen — kiosk-simple dose confirmation, AAA contrast, 76px buttons, offline-first (6 states), zero nav chrome |
| `/dashboard` | **Dashboard (Family)** | "Today" tab — reassurance + AI summary hero + severity alerts (4 states) |
| `/history` | **History** | 7-day adherence + expandable per-day detail |
| `/radar` | **Radar** | Read-only conversational Q&A over the circle's data |
| `/alert/:id` | **Alert detail** | Severity, suggested actions, mark-resolved |
| `/members` | **Members & Invite** | Care-circle roster + role/permission management (4 states) |
| `/more` | **More** | Menu: Radar, History, Circle, open senior view, sign out |

## Project layout

```
src/
  screens/        the screens above
  components/     shared UI (Button, Avatar, Icons, AppHeader, BottomTabBar, DevPanel)
  lib/            Auth/Circle contexts, types, mock data, offline queue, Amplify client, summary + radar generators
  styles/         design tokens
amplify/          AWS Amplify Gen 2 backend (see amplify/README.md) + amplify.yml hosting build spec
```

## Backend (scaffolded, deploy-ready, not yet deployed)

Everything in `amplify/` is a working backend: Cognito email-code auth, a membership/role-guarded AppSync+DynamoDB API, onboarding, dose logging, invites, dashboard/history aggregation, an **AI daily summary and Radar Q&A via Claude on Bedrock** (with deterministic fallbacks), alert resolve, and a 15-min missed-dose sweep. It is **not deployed** — the app runs fully in demo mode until `amplify_outputs.json` exists, then `src/lib/amplifyClient.ts` auto-detects it and flips to live with no code change.

**To deploy:** follow **[`amplify/README.md`](amplify/README.md)** — it has the pre-deploy checklist (3 values in `backend.ts` → `DEPLOY_CONFIG`), the Bedrock/SES setup, and both the sandbox and Amplify Hosting paths.

The backend choice (AWS Amplify) came from the design handoff's architecture recommendation. It's swappable — a simpler backend (Supabase/Firebase) could serve the same frontend with changes confined to `src/lib/AuthContext.tsx` and `src/lib/CircleContext.tsx`.

## Status / known gaps

Implemented and verified (typechecks, production build, runs):
- All nine screens + five-tab nav, faithful to the design spec
- Offline dose logging with IndexedDB queue + replay
- Demo mode and a live-Amplify code path behind one interface
- AI summary + Radar (Bedrock in live; data-derived in demo)

Deliberately simplified (flagged in code + `amplify/README.md`):
- Full invite-acceptance token flow (membership row uses a placeholder userId until accept)
- "No check-in" presence alerts (needs a heartbeat field in the schema)
