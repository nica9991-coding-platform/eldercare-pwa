import type { DefineAuthChallengeTriggerHandler } from 'aws-lambda';

const MAX_ATTEMPTS = 3;

/**
 * Drives the passwordless email-code flow: first request always issues a
 * CUSTOM_CHALLENGE, a correct answer issues tokens, a wrong answer retries
 * up to MAX_ATTEMPTS before Cognito denies the sign-in.
 */
export const handler: DefineAuthChallengeTriggerHandler = async (event) => {
  const session = event.request.session ?? [];
  const last = session[session.length - 1];

  if (!last) {
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
    event.response.challengeName = 'CUSTOM_CHALLENGE';
    return event;
  }

  if (last.challengeName === 'CUSTOM_CHALLENGE' && last.challengeResult === true) {
    event.response.issueTokens = true;
    event.response.failAuthentication = false;
    return event;
  }

  if (session.length >= MAX_ATTEMPTS) {
    event.response.issueTokens = false;
    event.response.failAuthentication = true;
    return event;
  }

  event.response.issueTokens = false;
  event.response.failAuthentication = false;
  event.response.challengeName = 'CUSTOM_CHALLENGE';
  return event;
};
