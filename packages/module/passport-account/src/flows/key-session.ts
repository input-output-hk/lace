import type { PassportAuthoriser } from '@lace-contract/passport';

/**
 * Runs an operation under a single key ceremony, so a flow that reaches
 * for the device key several times costs one user prompt instead of one
 * per authoriser call. An authoriser with no interactive ceremony exposes
 * no session, and the operation runs directly. The session function is
 * used detached, so implementations must not rely on `this`.
 */
export const inKeySession = async <T>(
  authoriser: PassportAuthoriser,
  operation: () => Promise<T>,
): Promise<T> => {
  const { withKeySession } = authoriser;
  return withKeySession ? withKeySession(operation) : operation();
};
