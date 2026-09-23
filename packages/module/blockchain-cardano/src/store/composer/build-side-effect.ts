import {
  LOVELACE_TOKEN_ID,
  filterSpendableUtxos,
} from '@lace-contract/cardano-context';
import { BigNumber } from '@lace-lib/util';
import { firstStateOfStatus } from '@lace-lib/util-store';
import { firstValueFrom, from, map, switchMap } from 'rxjs';

import { buildComposerTx, toPaymentAddress } from './build-composer-tx';

import type { SideEffect } from '../..';
import type { Cardano } from '@cardano-sdk/core';
import type { AnyAddress } from '@lace-contract/addresses';
import type {
  ComposerBuildResult,
  ComposerFlowStateBuilding,
} from '@lace-contract/cardano-context';
import type { SideEffectDependencies } from '@lace-contract/module';
import type { TxErrorTranslationKeys } from '@lace-contract/tx-executor';

// =====================================================================
// Composer — build orchestrator.
// =====================================================================
// Drives the `Building` state: gathers the account's chain context, runs
// `buildComposerTx`, and reports the unsigned CBOR + exact fee (or a
// typed error) via `buildCompleted`.
//
// Every input comes from the store/provider stack that the sync rounds
// already keep current — protocol parameters, chain tip and era
// summaries from `cardanoContext`, UTxOs and addresses from
// `txExecutorCardano`. The composer request itself carries no chain
// data, so no caller ever has to fetch any, and the build needs no
// network round-trip of its own.
//
// `switchMap`, not `exhaustMap`: `firstStateOfStatus` already collapses
// consecutive `Building` states, so a second trigger means the user
// re-composed after a `reset` and the in-flight build is stale. Dropping
// it (exhaustMap) would let the stale CBOR resolve into the NEW
// `Building`, and the confirmation surface would describe a transaction
// the user never asked to sign.
// =====================================================================

const GENERIC_BUILD_ERROR_KEYS: TxErrorTranslationKeys = {
  title: 'v2.composer.build.error.title',
  subtitle: 'v2.composer.build.error.subtitle',
};

// Codes raised by `buildComposerTx`. Everything else — balancing
// failures, validity-interval errors, missing network data — falls back
// to the generic pair.
const BUILD_ERROR_KEYS_BY_CODE: Record<string, TxErrorTranslationKeys> = {
  'no-utxos': {
    title: 'v2.composer.build.error.no-utxos.title',
    subtitle: 'v2.composer.build.error.no-utxos.subtitle',
  },
  'no-outputs': {
    title: 'v2.composer.build.error.invalid-request.title',
    subtitle: 'v2.composer.build.error.invalid-request.subtitle',
  },
  'invalid-output': {
    title: 'v2.composer.build.error.invalid-request.title',
    subtitle: 'v2.composer.build.error.invalid-request.subtitle',
  },
  'invalid-metadata': {
    title: 'v2.composer.build.error.invalid-request.title',
    subtitle: 'v2.composer.build.error.invalid-request.subtitle',
  },
  'input-unavailable': {
    title: 'v2.composer.build.error.invalid-request.title',
    subtitle: 'v2.composer.build.error.invalid-request.subtitle',
  },
  'invalid-address': {
    title: 'v2.composer.build.error.invalid-request.title',
    subtitle: 'v2.composer.build.error.invalid-request.subtitle',
  },
  // The account holds SOMETHING but not enough, so `no-utxos` ("no funds
  // available") would be untrue; what the user can act on is the amount.
  'insufficient-funds': {
    title: 'v2.composer.build.error.invalid-request.title',
    subtitle: 'v2.composer.build.error.invalid-request.subtitle',
  },
};

const failure = (error: Error, code?: string): ComposerBuildResult => ({
  success: false,
  error: { name: error.name, message: error.message },
  errorTranslationKeys:
    (code ? BUILD_ERROR_KEYS_BY_CODE[code] : undefined) ??
    GENERIC_BUILD_ERROR_KEYS,
});

const buildComposition = async (
  state: ComposerFlowStateBuilding,
  stateObservables: Parameters<SideEffect>[1],
  dependencies: SideEffectDependencies,
): Promise<ComposerBuildResult> => {
  try {
    const { accountId, request } = state;
    const cardano = dependencies.txExecutorCardano;
    const cardanoContext = stateObservables.cardanoContext;

    // These state selectors emit the current value on subscribe — an
    // absent one emits `undefined`, so a build that runs before the sync
    // round has landed fails fast below instead of hanging in `Building`.
    const [
      networkMagic,
      protocolParameters,
      tip,
      eraSummaries,
      accountUtxos,
      unspendableUtxos,
      addresses,
    ] = await Promise.all([
      firstValueFrom(cardano.cardanoNetworkMagic$),
      firstValueFrom(cardanoContext.selectProtocolParameters$),
      firstValueFrom(cardanoContext.selectTip$),
      firstValueFrom(cardanoContext.selectEraSummaries$),
      firstValueFrom(cardano.cardanoAccountUtxos$),
      firstValueFrom(cardano.cardanoAccountUnspendableUtxos$),
      firstValueFrom(cardano.cardanoAddresses$),
    ]);

    if (networkMagic === undefined) {
      throw new Error('Cardano network magic not available');
    }
    if (!protocolParameters) {
      throw new Error('Cardano protocol parameters not available');
    }
    if (!tip) throw new Error('Cardano chain tip not available');
    if (!eraSummaries) throw new Error('Cardano era summaries not available');

    const accountAddresses = addresses.filter(
      (address: AnyAddress) =>
        address.accountId === accountId && address.blockchainName === 'Cardano',
    );
    const primary = accountAddresses[0];
    if (!primary) throw new Error('No Cardano addresses found for account');

    const changeAddress = toPaymentAddress(
      (request.changeAddress ?? primary.address) as unknown as string,
      'The change address',
    );

    const result = await buildComposerTx({
      request,
      changeAddress,
      networkMagic: networkMagic as Cardano.NetworkMagics,
      protocolParameters,
      spendableUtxos: filterSpendableUtxos(
        accountUtxos[accountId] ?? [],
        unspendableUtxos[accountId] ?? [],
      ),
      tipSlot: Number(tip.slot),
      eraSummaries,
    });

    return {
      success: true,
      serializedTx: result.cbor,
      txId: result.txId,
      fees: [{ tokenId: LOVELACE_TOKEN_ID, amount: BigNumber(result.fee) }],
    };
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error(String(error)),
      (error as { code?: string }).code,
    );
  }
};

export const makeComposerBuilding =
  (): SideEffect => (_, stateObservables, dependencies) =>
    firstStateOfStatus(
      stateObservables.composerFlow.selectState$,
      'Building',
    ).pipe(
      switchMap(state =>
        from(buildComposition(state, stateObservables, dependencies)).pipe(
          map(result =>
            dependencies.actions.composerFlow.buildCompleted({
              accountId: state.accountId,
              result,
            }),
          ),
        ),
      ),
    );
