import type { VerifyAuthChallengeResponseTriggerHandler } from 'aws-lambda';

export const handler: VerifyAuthChallengeResponseTriggerHandler = async (event) => {
  const expected = event.request.privateChallengeParameters.code;
  const submitted = event.request.challengeAnswer;
  event.response.answerCorrect = expected === submitted;
  return event;
};
