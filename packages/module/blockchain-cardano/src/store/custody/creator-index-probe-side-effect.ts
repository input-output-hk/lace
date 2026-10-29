import { findCustodyContractVersion } from '@lace-lib/cardano-custody';
import { firstValueFrom, from, map, mergeMap } from 'rxjs';

import { CustodyBuildFailure, messageOf } from './build-failure';
import { FIRST_HARDENED_INDEX } from './create-custody-account';
import { readCustodyCreatorIndex } from './custody-creator-index';

import type { CustodyCreatorIndexState } from './custody-creator-index';
import type { CustodySideEffect } from '../../custody-contracts';
import type { Cardano } from '@cardano-sdk/core';
import type {
  CardanoCustodyBuildError,
  CardanoCustodyCreatorIndexProbeError,
  CardanoCustodyCreatorIndexProbeRequest,
  CardanoCustodyCreatorIndexProbeResult,
  CardanoProvider,
} from '@lace-contract/cardano-context';
import type { Logger } from 'ts-log';

// =====================================================================
// Cardano custody account — creator index probe.
// =====================================================================
// Answers `probeCustodyCreatorIndex` with what the chain holds at one
// creator index of one contract version: no account, the creator's
// account, or a credential someone else registered first. Recovery asks
// it index by index; nothing is built and no sponsor takes part. Chain
// reads go through the injected provider (ADR 19).
//
// `mergeMap`: probes carry their own ids and never supersede each other.
// =====================================================================

type Outcome =
  | {
      readonly error: CardanoCustodyCreatorIndexProbeError;
      readonly ok: false;
    }
  | {
      readonly ok: true;
      readonly result: CardanoCustodyCreatorIndexProbeResult;
    };

const isSoftIndex = (index: number): boolean =>
  Number.isSafeInteger(index) && index >= 0 && index < FIRST_HARDENED_INDEX;

const probeErrorOf = (
  reason: CardanoCustodyBuildError,
): CardanoCustodyCreatorIndexProbeError => {
  if (reason.code === 'unavailable' || reason.code === 'build-failed') {
    return reason;
  }
  if (
    reason.code === 'invalid-operation' &&
    reason.reason === 'invalid-device-key'
  ) {
    return { ...reason, reason: reason.reason };
  }
  return {
    code: 'build-failed',
    message: `Unexpected creator index probe failure: ${reason.code}`,
  };
};

const resultOf = (
  {
    accountValidatorHash,
    creatorIndex,
  }: CardanoCustodyCreatorIndexProbeRequest,
  state: CustodyCreatorIndexState,
): CardanoCustodyCreatorIndexProbeResult => {
  const probed = { accountValidatorHash, creatorIndex };
  return state.status === 'account'
    ? { ...probed, status: 'account', record: state.record }
    : { ...probed, status: state.status };
};

const probe = async (
  request: CardanoCustodyCreatorIndexProbeRequest,
  {
    chainId,
    provider,
    logger,
  }: {
    chainId: Cardano.ChainId | undefined;
    provider: CardanoProvider;
    logger: Logger;
  },
): Promise<Outcome> => {
  const contractVersion = findCustodyContractVersion(
    request.accountValidatorHash,
  );
  if (!contractVersion.ok) {
    return { ok: false, error: contractVersion.error };
  }
  if (!isSoftIndex(request.creatorIndex)) {
    return {
      ok: false,
      error: {
        code: 'invalid-operation',
        reason: 'invalid-start-index',
        message: `Invalid creator index ${request.creatorIndex}`,
      },
    };
  }
  if (!chainId) {
    return {
      ok: false,
      error: { code: 'unavailable', message: 'Cardano chain id not available' },
    };
  }
  try {
    const state = await readCustodyCreatorIndex(
      {
        contractVersion: contractVersion.value,
        deviceAccountPublicKey: request.deviceAccountPublicKey,
        creatorIndex: request.creatorIndex,
      },
      { chainId, provider },
    );
    return { ok: true, result: resultOf(request, state) };
  } catch (error) {
    if (error instanceof CustodyBuildFailure) {
      return { ok: false, error: probeErrorOf(error.reason) };
    }
    logger.error('Custody creator index probe failed unexpectedly', error);
    return {
      ok: false,
      error: { code: 'build-failed', message: messageOf(error) },
    };
  }
};

export const makeCustodyCreatorIndexProbing =
  (): CustodySideEffect =>
  (
    { cardanoCustody: { probeCustodyCreatorIndex$ } },
    { cardanoContext },
    { cardanoProvider, actions, logger },
  ) => {
    const answer = async (
      request: CardanoCustodyCreatorIndexProbeRequest,
    ): Promise<Outcome> =>
      probe(request, {
        chainId: await firstValueFrom(cardanoContext.selectChainId$),
        provider: cardanoProvider,
        logger,
      });

    return probeCustodyCreatorIndex$.pipe(
      mergeMap(({ payload: request }) =>
        from(answer(request)).pipe(
          map(outcome =>
            outcome.ok
              ? actions.cardanoCustody.probeCustodyCreatorIndexCompleted({
                  requestId: request.requestId,
                  result: outcome.result,
                })
              : actions.cardanoCustody.probeCustodyCreatorIndexFailed({
                  requestId: request.requestId,
                  error: outcome.error,
                }),
          ),
        ),
      ),
    );
  };
