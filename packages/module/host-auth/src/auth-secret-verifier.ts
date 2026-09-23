import type { AuthSecretVerifier } from '@lace-contract/authentication-prompt';

// The host owns authentication (ADR 34); no password-verify path is reachable in
// the guest. Always reject so a stray verify can never accept an arbitrary secret.
const loadAuthSecretVerifier = (): AuthSecretVerifier => ({
  verifyAuthSecret: async () => false,
});

export default loadAuthSecretVerifier;
