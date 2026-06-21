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

| Route | Screen | Notes |
|---|---|---|
| `/` | **Entry** | Email → 6-digit code sign-in + accept-invite (6 states) |
| `/today` | **Today (Senior)** ★ | The hero screen — kiosk-simple dose confirmation, AAA contrast, 76px buttons, offline-first (6 states) |
| `/dashboard` | **Dashboard (Family)** | At-a-glance reassurance + AI summary hero + severity alerts (4 states) |
| `/members` | **Members & Invite** | Care-circle roster + role/permission management (4 states) |

## Project layout

```
src/
  screens/        the four screens above
  components/     shared UI (Button, Avatar, Icons, AppHeader, BottomTabBar, DevPanel)
  lib/            AuthContext, CircleContext, types, mock data, offline queue, Amplify client
  styles/         design tokens
amplify/          AWS Amplify Gen 2 backend (see amplify/README.md)
```

## Backend (optional, not deployed)

Everything in `amplify/` is a working scaffold of the cloud backend — multi-party role-based auth, the membership-guarded API, and a scheduled missed-dose alert sweep. It is **not deployed**; the app works fully without it. To stand it up against a real AWS account, follow **[`amplify/README.md`](amplify/README.md)**.

The backend choice (AWS Amplify) came from the design handoff's architecture recommendation. It's swappable — a simpler backend (Supabase/Firebase) could serve the same frontend with modest changes to `src/lib/AuthContext.tsx` and `src/lib/CircleContext.tsx`.

## Status / known gaps

Implemented and verified (typechecks, lints, runs):
- All four screens, all design states, faithful to the spec
- Offline dose logging with IndexedDB queue + replay
- Demo mode and a live-Amplify code path behind one interface

Deliberately deferred (flagged in code + `amplify/README.md`):
- Onboarding / "create circle" screen (wasn't in the four-screen handoff)
- Full invite-acceptance token flow
- "No check-in" presence alerts (needs a heartbeat field)
- LLM-generated daily summary (currently a deterministic rule; the AI route is a drop-in replacement)
