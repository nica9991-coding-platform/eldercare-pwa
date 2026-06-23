# Deploying the backend to AWS

The app runs today against mock data with **no AWS account needed** (demo mode, sign-in code `123456`). This guide switches it to the real AWS Amplify Gen 2 backend in `amplify/`. Nothing here has to be done until you have an AWS account — the app keeps working in demo mode until `amplify_outputs.json` exists.

---

## Pre-deploy checklist (the only things you must set)

All three live in one block at the top of [`amplify/backend.ts`](backend.ts) → `DEPLOY_CONFIG`:

| Value | What to set it to | Why |
|---|---|---|
| `OTP_SENDER_EMAIL` | An email/domain you've **verified in Amazon SES** | The "From" on sign-in codes + invites. The placeholder won't send. |
| `APP_URL` | Your deployed frontend URL (Amplify Hosting or custom domain) | Used in invite-email links. Leave as localhost for sandbox testing. |
| `SUMMARY_MODEL_ID` | A Claude-on-Bedrock inference profile in a region where you've **enabled model access** (default `us.anthropic.claude-haiku-4-5`) | Powers the AI daily summary + Radar. Falls back to a deterministic sentence if Bedrock is unreachable, so this is non-fatal if skipped. |

---

## 1. One-time AWS setup

1. Create an AWS account and sign in to the console.
2. Install the AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
3. Configure credentials: `aws configure` (access key + secret from an IAM user with broad permissions for Cognito/AppSync/DynamoDB/Lambda/SES/EventBridge/Bedrock), or `aws sso login` for IAM Identity Center.
4. Verify: `aws sts get-caller-identity` should print your account.

## 2. Enable Claude model access in Bedrock (for the AI features)

Bedrock blocks model access by default — you must opt in, once per account+region:

1. AWS Console → **Bedrock** → **Model access** → **Manage model access**.
2. Enable **Anthropic → Claude Haiku 4.5** (and any others you want) in your region.
3. Make sure `SUMMARY_MODEL_ID`'s region prefix in `backend.ts` matches that region (`us.` for US, `eu.` for Europe, `apac.` for Asia-Pacific). Approval is usually instant.

> Skippable for a first deploy — without it the summary/Radar just use the built-in deterministic fallback and everything else works.

## 3. Verify an SES sender (for the sign-in code + invite emails)

SES starts in **sandbox mode**: it can only send to/from verified addresses.

1. Console → **SES** → **Verified identities** → verify an email you control.
2. Set `OTP_SENDER_EMAIL` in `backend.ts` to that address.
3. In SES sandbox you can only sign in users whose addresses you've **also** verified. To onboard real users, request **production access** (SES → Account dashboard → Request production access — usually approved within a day).

## 4. Deploy

Two paths — pick one.

### A) Personal dev sandbox (fastest, for testing)

```
npm run sandbox
```

Runs `ampx sandbox`: provisions a personal stack (Cognito User Pool, AppSync API, DynamoDB tables, the Lambdas, the 15-min alert-sweep schedule) and writes `amplify_outputs.json` to the project root. Leave it running — it watches `amplify/` and redeploys on save. `Ctrl+C` stops watching; resources stay until `npm run sandbox:delete`.

### B) Amplify Hosting (production, CI from GitHub)

1. Console → **Amplify** → **Host web app** → connect the GitHub repo + branch.
2. Amplify auto-detects [`amplify.yml`](../amplify.yml) and runs it: deploys the backend, then builds the Vite PWA. Done — every push redeploys.
3. After the first deploy, set `APP_URL` to the Amplify URL it gives you and push again.

## 5. Run / use it

- **Sandbox:** `npm run dev` — `src/lib/amplifyClient.ts` auto-detects `amplify_outputs.json`, so the app flips to live with no code change. The Entry screen now emails a real 6-digit code instead of accepting `123456`.
- **Hosting:** just visit the Amplify URL.

First sign-in lands on **"Let's set up a care circle"** → the **Onboard** screen (`/onboard`) creates the circle + meds for real via the `createCircle` mutation.

## Cost note

Light personal testing (a few users, a few hundred requests/day) fits comfortably in the AWS free tier. It's still real metered infra — Lambda, DynamoDB, SES, Bedrock tokens. Tear down a sandbox with `npm run sandbox:delete` when done.

---

## What's wired vs. still simplified

**Fully wired for live:** Cognito email-code auth · membership/role-guarded AppSync+DynamoDB · onboarding (createCircle + medications) · dose logging w/ offline replay · invites (inviteMember) · dashboard + history aggregation · **AI daily summary (Claude Haiku on Bedrock, deterministic fallback)** · **Radar Q&A (Bedrock, read-only)** · alert resolve · 15-min missed-dose sweep.

**Deliberately simplified (flagged in code):**
- **Invite acceptance** — `inviteMember` writes a Membership row with a placeholder `userId`; there's no token-resolution mutation yet to link it to the invitee's real Cognito sub on accept.
- **"No check-in" alerts** — the sweep only detects missed doses. The design's "no check-in since 9am" WARN needs a presence/heartbeat field not yet in the schema.
