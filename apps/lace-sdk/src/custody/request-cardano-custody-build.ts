import { Serializable } from '@lace-lib/util-store';
import { filter, firstValueFrom, map, merge, timeout } from 'rxjs';

import {
  CardanoCustodyBuildFailedError,
  CardanoCustodyDeviceNotListedError,
  CardanoCustodyGrantSpendError,
  CardanoCustodyIndexExhaustedError,
  CardanoCustodyInvalidOperationError,
  CardanoCustodyLogicNotRegisteredError,
  CardanoCustodyLogicRewardBalanceError,
  CardanoCustodyOperationInProgressError,
  CardanoCustodyStaleControlError,
} from './cardano-custody-errors';
import { custodyActionObservables } from './cardano-custody-wallet';

import type { WalletWithCardanoCustody } from './cardano-custody-wallet';
import type {
  CardanoCustodyBuildError,
  CardanoCustodyBuildRequest,
  CardanoCustodyBuildResult,
} from '@lace-contract/cardano-context';
import type { AccountId } from '@lace-contract/wallet-repo';
import type {
  CustodyRefusal,
  CustodySponsorRuleViolation,
} from '@lace-lib/cardano-custody';

/**
 * How long a build may take before it is given up. A build reads chain data
 * and evaluates scripts through the provider, with retries.
 */
const CUSTODY_BUILD_TIMEOUT_MS = 120_000;

type CardanoCustodyBuildOutcome =
  | { readonly error: CardanoCustodyBuildError; readonly ok: false }
  | { readonly ok: true; readonly result: CardanoCustodyBuildResult };

type BuildRequestWithoutId =
  | Omit<
      Exclude<CardanoCustodyBuildRequest, { accountId: AccountId }>,
      'requestId'
    >
  | Omit<
      Extract<CardanoCustodyBuildRequest, { accountId: AccountId }>,
      'requestId'
    >;

/**
 * Asks the wallet's Cardano module to build a custody transaction and waits
 * for its answer under a fresh request id, the way `submitCardanoTx` waits
 * for a submission. Chain reads stay in the module's provider dependencies.
 *
 * @throws {@link TimeoutError} When no module answers in time.
 */
export const requestCardanoCustodyBuild = async (
  wallet: Pick<WalletWithCardanoCustody, 'actionObservables' | 'dispatch'>,
  request: BuildRequestWithoutId,
): Promise<CardanoCustodyBuildOutcome> => {
  const requestId = crypto.randomUUID();
  const { buildCustodyTransactionCompleted$, buildCustodyTransactionFailed$ } =
    custodyActionObservables(wallet);
  // Subscribed before dispatching: a module may answer synchronously.
  const outcome = firstValueFrom(
    merge(
      buildCustodyTransactionCompleted$.pipe(
        filter(({ payload }) => payload.requestId === requestId),
        map(
          ({ payload }): CardanoCustodyBuildOutcome => ({
            ok: true,
            result: Serializable.from(payload.result),
          }),
        ),
      ),
      buildCustodyTransactionFailed$.pipe(
        filter(({ payload }) => payload.requestId === requestId),
        map(
          ({ payload }): CardanoCustodyBuildOutcome => ({
            ok: false,
            error: Serializable.from(payload.error),
          }),
        ),
      ),
    ).pipe(timeout(CUSTODY_BUILD_TIMEOUT_MS)),
  );
  wallet.dispatch('cardanoCustody.buildCustodyTransaction', {
    ...request,
    requestId,
  } as CardanoCustodyBuildRequest);
  return outcome;
};

const isLogicDraw = (
  violation: CustodySponsorRuleViolation,
): violation is Extract<
  CustodySponsorRuleViolation,
  { reason: 'logic-draw' }
> => violation.reason === 'logic-draw';

const isLogicDrawLeavingAccount = (
  refusal: CustodyRefusal,
): refusal is Extract<
  CustodyRefusal,
  { reason: 'logic-draw-leaves-account' }
> => refusal.reason === 'logic-draw-leaves-account';

/** The typed SDK error for a build failure. */
export const custodyBuildErrorOf = (
  error: CardanoCustodyBuildError,
  accountId?: AccountId,
): Error => {
  switch (error.code) {
    case 'device-not-listed':
      return new CardanoCustodyDeviceNotListedError(error.keyHash);
    case 'stale-control':
      return new CardanoCustodyStaleControlError();
    case 'operation-in-progress':
      return accountId
        ? new CardanoCustodyOperationInProgressError(accountId)
        : new CardanoCustodyBuildFailedError(error);
    case 'index-exhausted':
      return new CardanoCustodyIndexExhaustedError(
        error.startIndex,
        error.scanned,
      );
    case 'grant-spend': {
      const { reason, code: _, ...detail } = error;
      return new CardanoCustodyGrantSpendError(reason, detail);
    }
    case 'invalid-operation': {
      if (
        error.reason === 'state-transition' &&
        error.error.code === 'grantee-has-grant'
      ) {
        const { grantee, slot } = error.error;
        return new CardanoCustodyInvalidOperationError('grantee-has-grant', {
          grantee,
          slot,
        });
      }
      const { reason, code: _, ...detail } = error;
      return new CardanoCustodyInvalidOperationError(reason, detail);
    }
    case 'grant-limit':
    case 'revoked-list-full':
    case 'sweep-not-dead': {
      const { code, ...detail } = error;
      return new CardanoCustodyInvalidOperationError(code, detail);
    }
    case 'observer-account':
      return new CardanoCustodyInvalidOperationError('observer-account');
    case 'account-not-live':
      return new CardanoCustodyInvalidOperationError('account-not-live', {
        status: error.status,
      });
    case 'unknown-account':
      return new CardanoCustodyInvalidOperationError('unknown-account', {
        accountId,
      });
    case 'logic-not-registered':
      return new CardanoCustodyLogicNotRegisteredError(error.rewardAccount);
    case 'sponsor-rules': {
      // A logic draw is no builder defect: the ledger takes only the whole
      // reward balance, which the sponsor refuses to sign for.
      const draw = error.violations.find(isLogicDraw);
      return draw
        ? new CardanoCustodyLogicRewardBalanceError(draw.logic, draw.quantity)
        : new CardanoCustodyBuildFailedError(error);
    }
    case 'inspection-refused': {
      // Nor is a draw beside a payment out of the account, which inspection
      // refuses before the sponsor's rules are checked.
      const draw = error.refusals.find(isLogicDrawLeavingAccount);
      return draw
        ? new CardanoCustodyLogicRewardBalanceError(draw.logic, draw.quantity)
        : new CardanoCustodyBuildFailedError(error);
    }
    case 'account-exists':
    case 'build-failed':
    case 'collateral-fee-ceiling':
    case 'collateral-insufficient':
    case 'insufficient-funds':
    case 'owner-reserve-required':
    case 'script-evaluation-failed':
    case 'sponsor-limit':
    case 'transaction-limits':
    case 'unavailable':
    case 'validity-window':
      return new CardanoCustodyBuildFailedError(error);
  }
};
