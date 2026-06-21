import type { CreateAuthChallengeTriggerHandler } from 'aws-lambda';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

const ses = new SESv2Client();
const SENDER = process.env.OTP_SENDER_EMAIL ?? 'no-reply@example.com';

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generates the 6-digit code on the first challenge in a session and emails
 * it via SES. On a retry within the same session (e.g. after a wrong digit),
 * reuses the same code rather than minting a new one out from under the user.
 */
export const handler: CreateAuthChallengeTriggerHandler = async (event) => {
  const session = event.request.session ?? [];
  const previous = session[session.length - 1];
  const reusedCode = previous?.challengeMetadata?.startsWith('CODE-')
    ? previous.challengeMetadata.slice('CODE-'.length)
    : undefined;

  const code = reusedCode ?? generateCode();

  if (!reusedCode) {
    const email = event.request.userAttributes.email;
    await ses.send(
      new SendEmailCommand({
        FromEmailAddress: SENDER,
        Destination: { ToAddresses: [email] },
        Content: {
          Simple: {
            Subject: { Data: 'Your Kindred sign-in code' },
            Body: {
              Text: { Data: `Your sign-in code is ${code}. It expires in 10 minutes.` },
            },
          },
        },
      }),
    );
  }

  event.response.publicChallengeParameters = { email: event.request.userAttributes.email };
  event.response.privateChallengeParameters = { code };
  event.response.challengeMetadata = `CODE-${code}`;
  return event;
};
