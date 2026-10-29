import { isCardanoCustodyAccount } from '@lace-contract/cardano-context';
import { Serializable } from '@lace-lib/util-store';
import { firstValueFrom, from, map, mergeMap } from 'rxjs';

import { buildCustodyTransaction } from './build-custody-transaction';
import { CustodyBuildFailure, messageOf } from './build-failure';
import { makeCustodyCreatorIndexProbing } from './creator-index-probe-side-effect';

import type { CustodyAccountSnapshot } from './custody-account';
import type { CustodySideEffect } from '../../custody-contracts';
import type {
  CardanoCustodyBuildError,
  CardanoCustodyBuildRequest,
  CardanoCustodyBuildResult,
} from '@lace-contract/cardano-context';
import type { AccountId, AnyAccount } from '@lace-contract/wallet-repo';
import type { Logger } from 'ts-log';

// =====================================================================
// Cardano custody account — transaction build.
// =====================================================================
// Answers `buildCustodyTransaction` with the unsigned transaction and the
// context its signers need, or a typed failure, under the request's id.
// Every chain read (full protocol parameters, reward balances, the account
// address, script evaluation) goes through the injected provider (ADR 19),
// so a headless SDK caller dispatches the request and awaits the answer the
// way `submitCardanoTx` does. Nothing here reaches tx-executor, so the SDK
// store composes it too (ADR 30).
//
// `mergeMap`: requests carry their own ids and never supersede each other.
// =====================================================================

type Outcome =
  | { readonly error: CardanoCustodyBuildError; readonly ok: false }
  | { readonly ok: true; readonly result: CardanoCustodyBuildResult };

const failureOf = (
  error: unknown,
  logger: Logger,
): CardanoCustodyBuildError => {
  if (error instanceof CustodyBuildFailure) return error.reason;
  logger.error('Custody transaction build failed unexpectedly', error);
  return { code: 'build-failed', message: messageOf(error) };
};

export const makeCustodyTransactionBuilding =
  (): CustodySideEffect =>
  (
    { cardanoCustody: { buildCustodyTransaction$ } },
    { cardanoContext, cardanoCustody, wallets },
    { cardanoProvider, actions, logger },
  ) => {
    const snapshot = async (
      accountId: AccountId,
    ): Promise<CustodyAccountSnapshot> => {
      const [allWallets, accountStateOf, settledUtxos] = await Promise.all([
        firstValueFrom(wallets.selectAll$),
        firstValueFrom(cardanoCustody.selectCardanoCustodyAccountState$),
        firstValueFrom(cardanoContext.selectAccountUtxos$),
      ]);
      return {
        account: allWallets
          .flatMap(wallet => wallet.accounts as AnyAccount[])
          .filter(isCardanoCustodyAccount)
          .find(account => account.accountId === accountId),
        accountState: accountStateOf(accountId),
        settledUtxos: settledUtxos[accountId] ?? [],
      };
    };

    const build = async (
      request: Serializable<CardanoCustodyBuildRequest>,
    ): Promise<Outcome> => {
      try {
        const [chainId, eraSummaries] = await Promise.all([
          firstValueFrom(cardanoContext.selectChainId$),
          firstValueFrom(cardanoContext.selectEraSummaries$),
        ]);
        return {
          ok: true,
          result: await buildCustodyTransaction(Serializable.from(request), {
            chainId,
            eraSummaries,
            snapshot,
            provider: cardanoProvider,
            now: Date.now(),
          }),
        };
      } catch (error) {
        return { ok: false, error: failureOf(error, logger) };
      }
    };

    return buildCustodyTransaction$.pipe(
      mergeMap(({ payload: { requestId, request } }) =>
        from(build(request)).pipe(
          map(outcome =>
            outcome.ok
              ? actions.cardanoCustody.buildCustodyTransactionCompleted({
                  requestId,
                  result: outcome.result,
                })
              : actions.cardanoCustody.buildCustodyTransactionFailed({
                  requestId,
                  error: outcome.error,
                }),
          ),
        ),
      ),
    );
  };

export const custodyTransactionSideEffects: CustodySideEffect[] = [
  makeCustodyTransactionBuilding(),
  makeCustodyCreatorIndexProbing(),
];
