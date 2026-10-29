import type { CardanoCustodyBuildError } from '@lace-contract/cardano-context';
import type {
  CustodyResult,
  CustodyStateTransitionError,
} from '@lace-lib/cardano-custody';

/**
 * Stops a custody build with a typed reason. The build side effect reports
 * it as the failure; any other error thrown during a build is a defect and
 * is reported as `build-failed`.
 */
export class CustodyBuildFailure extends Error {
  public constructor(readonly reason: CardanoCustodyBuildError) {
    super(`Custody transaction build failed: ${reason.code}`);
    this.name = 'CustodyBuildFailure';
  }
}

export const failCustodyBuild = (reason: CardanoCustodyBuildError): never => {
  throw new CustodyBuildFailure(reason);
};

/**
 * The build failure a state transition's refusal stands for. A full account
 * the owner can act on has its own code: sweep dead grants to free the
 * outstanding count or the revoked list, or wait for a grant to die.
 */
const transitionFailureOf = (
  error: CustodyStateTransitionError,
): CardanoCustodyBuildError => {
  if (error.code === 'grant-limit' || error.code === 'revoked-list-full') {
    return { code: error.code, limit: error.limit };
  }
  if (error.code === 'grant-not-dead') {
    return {
      code: 'sweep-not-dead',
      slot: error.slot,
      liveness: error.liveness,
    };
  }
  return { code: 'invalid-operation', reason: 'state-transition', error };
};

/** What a library transition produced, or the build refused with its reason. */
export const transitioned = <T>(
  result: CustodyResult<T, CustodyStateTransitionError>,
): T =>
  result.ok
    ? result.value
    : failCustodyBuild(transitionFailureOf(result.error));

export const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
