import { defineAuth } from '@aws-amplify/backend';
import { defineAuthChallenge } from './define-auth-challenge/resource';
import { createAuthChallenge } from './create-auth-challenge/resource';
import { verifyAuthChallengeResponse } from './verify-auth-challenge-response/resource';

/**
 * Email + 6-digit code, no password — Cognito's USER_AUTH/custom-challenge
 * flow driven by the three triggers below. Matches the Entry screen design
 * (email entry -> code entry -> verify) one-to-one.
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  triggers: {
    defineAuthChallenge,
    createAuthChallenge,
    verifyAuthChallengeResponse,
  },
});
