# Deploying the backend

The app runs today against mock data with no AWS account needed. This is how to switch it to the real Amplify Gen 2 backend in `amplify/` once you're ready.

## 1. One-time AWS setup

1. Create an AWS account if you don't have one, and sign in to the console.
2. Install the AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
3. Configure credentials: `aws configure` (access key + secret from an IAM user with admin or sufficiently broad permissions for Cognito/AppSync/DynamoDB/Lambda/SES/EventBridge), or `aws sso login` if your org uses IAM Identity Center.
4. Verify it works: `aws sts get-caller-identity` should print your account.

## 2. Deploy a sandbox

From the project root:

```
npm run sandbox
```

This runs `ampx sandbox`, which provisions a personal dev stack (Cognito User Pool, AppSync API, DynamoDB tables, the three Lambda functions) under your AWS account and writes `amplify_outputs.json` to the project root. Leave it running — it watches `amplify/` and redeploys on changes. `Ctrl+C` to stop; resources stay until you delete them.

**Cost note:** everything here fits comfortably in the AWS free tier for light personal testing (a handful of users, a few hundred requests/day). It is still real metered infrastructure — Lambda invocations, DynamoDB reads/writes, SES sends. Tear it down with `npm run sandbox:delete` when you're done testing.

## 3. Verify an SES sender (required for the sign-in code emails)

SES starts in sandbox mode: it can only send *to* verified addresses, from a verified sender.

1. AWS Console → SES → "Verified identities" → verify an email address you control (e.g. your own).
2. Open `amplify/backend.ts` and change `OTP_SENDER_EMAIL: 'no-reply@example.com'` to that verified address.
3. While in SES sandbox mode, you can only sign in with email addresses you've *also* verified in SES (add them the same way). To sign in real users without that limit, request SES production access (Console → SES → "Account dashboard" → "Request production access" — usually approved within a day).

## 4. Run the app against the live backend

```
npm run dev
```

`src/lib/amplifyClient.ts` detects `amplify_outputs.json` automatically — no code changes needed. The Entry screen now sends a real 6-digit code by email instead of accepting the demo code `123456`; AuthContext and CircleContext switch to calling the real Cognito/AppSync API behind the same interface the screens already use.

## 5. Create your first care circle

There's no onboarding screen yet (it was out of scope for the four screens we built — see the architecture doc's MVP slice, screen 1). After signing in for the first time, the Dashboard will say "no care circle yet." Open the preview-controls panel (gear icon, bottom-right) and use **Create "Eleanor Alvarez" circle** to bootstrap one as a stopgap, or build the real onboarding screen next and call the already-wired `createCircle` mutation from it.

## What's deliberately simplified for this scaffold

- **Invite acceptance**: `inviteMember` creates a Membership row with a placeholder `userId` until the invited person actually signs up. There's no token-resolution mutation yet to link that row to their real Cognito sub on accept — the Entry screen's invite flow falls back to a normal sign-in in live mode rather than pretending this works.
- **"No check-in" alerts**: the sweep Lambda only detects missed doses (the data for that exists). The design's "no check-in since 9am" WARN alert needs a presence/heartbeat record that isn't in the schema yet.
- **Daily summary**: a small deterministic rule (`buildDailySummary` in `circle-resolver/handler.ts`), not an LLM call. The architecture doc's "AI Kit" route (Bedrock/Claude generating the sentence) is a drop-in replacement for that one function whenever you want it.
