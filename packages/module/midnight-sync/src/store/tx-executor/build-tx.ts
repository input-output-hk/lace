import { getDustTokenIdByNetwork } from '@lace-contract/midnight-context';
import { genericErrorResults } from '@lace-contract/tx-executor';
import { BigNumber, HexBytes } from '@lace-lib/util';
import { nativeToken } from '@midnight-ntwrk/ledger-v8';
import {
  catchError,
  map,
  of,
  switchMap,
  take,
  tap,
  throwError,
  withLatestFrom,
} from 'rxjs';

import {
  constructDustDesignationTransaction,
  constructShieldedTransaction,
  constructUnshieldedTransaction,
  normalizeMidnightTransfers,
  estimatePreparedMidnightFee,
} from '../prepare-midnight-tx';

import { discardTx } from './discard-tx';
import { mapMidnightBuildError } from './error-mapping';

import type { DustDesignationDependencies } from '../prepare-midnight-tx';
import type {
  MidnightSideEffectsDependencies,
  MidnightWalletsByAccountId,
  MidnightSpecificTokenMetadata,
  MidnightTokenKind,
  MidnightSpecificSendFlowData,
  MidnightSDKNetworkId,
} from '@lace-contract/midnight-context';
import type {
  TxBuildResult,
  TxExecutorImplementation,
  TxParamsBundle,
} from '@lace-contract/tx-executor';
import type { WithLogger } from '@lace-lib/util';
import type { UtxoWithMeta } from '@midnightntwrk/wallet-sdk/facade';
import type { Observable } from 'rxjs';

const isNativeNightCoin = (coin: UtxoWithMeta) =>
  coin.utxo.type === nativeToken().raw;

type MidnightTransferParameters = {
  amount: BigNumber;
  receiverAddress: string;
  type: string;
  tokenKind: MidnightTokenKind;
};

/**
 * Serialized form of everything the user approved in the send flow. The signer
 * reconstructs the transaction from this alone, so it must carry every
 * transfer — a transfer absent here is silently not sent.
 */
export type MidnightTxParameters = {
  transfers: readonly [
    MidnightTransferParameters,
    ...MidnightTransferParameters[],
  ];
};

const asNonEmpty = <T>(items: readonly T[]): readonly [T, ...T[]] => {
  if (items.length === 0)
    throw new Error('At least one token transfer is required');
  return items as readonly [T, ...T[]];
};

/**
 * Flattens the bundle into one entry per token transfer, preserving every
 * transfer and its recipient. Throws when any token lacks metadata or when
 * shielded and unshielded tokens are mixed — the two kinds require different
 * signing paths and recipient address formats, and the send flow's address
 * validation prevents composing such a selection.
 */
const flattenTransfers = (
  txParams: TxParamsBundle<MidnightSpecificTokenMetadata>,
): MidnightTxParameters['transfers'] => {
  const transfers = asNonEmpty(
    txParams.flatMap(({ address, tokenTransfers }) =>
      tokenTransfers.map(
        ({ normalizedAmount, token: { metadata, tokenId } }) => {
          if (!metadata)
            throw new Error(`Token metadata required for ${tokenId}`);
          return {
            amount: normalizedAmount,
            receiverAddress: address,
            type: tokenId,
            tokenKind: metadata.blockchainSpecific.kind,
          };
        },
      ),
    ),
  );

  if (new Set(transfers.map(({ tokenKind }) => tokenKind)).size > 1) {
    throw new Error(
      'Mixed shielded and unshielded transfers in one transaction are not supported',
    );
  }

  return transfers;
};

const buildTransaction = ({
  blockchainSpecificSendFlowData: { flowType },
  networkId,
  nightUtxos,
  nightVerifyingKey,
  txParams,
}: DustDesignationDependencies & {
  blockchainSpecificSendFlowData: MidnightSpecificSendFlowData;
  networkId: MidnightSDKNetworkId;
  txParams: TxParamsBundle<MidnightSpecificTokenMetadata>;
}) => {
  if (flowType === 'dust-designation') {
    return constructDustDesignationTransaction({
      address: txParams[0].address,
      networkId,
      nightUtxos,
      nightVerifyingKey,
    });
  }

  const transfers = flattenTransfers(txParams);

  const normalized = normalizeMidnightTransfers(
    networkId,
    transfers[0].tokenKind,
    transfers.map(({ amount, receiverAddress, type }) => ({
      to: receiverAddress,
      tokenId: type,
      amount: BigNumber.valueOf(amount),
    })),
  );
  const construct =
    transfers[0].tokenKind === 'shielded'
      ? constructShieldedTransaction
      : constructUnshieldedTransaction;
  return construct({ networkId, transfers: normalized });
};

const serialiseTx = (
  txParams: TxParamsBundle<MidnightSpecificTokenMetadata>,
) => {
  const txParameters: MidnightTxParameters = {
    transfers: flattenTransfers(txParams),
  };
  return HexBytes.fromUTF8(JSON.stringify(txParameters));
};

export const buildTxDependencies = {
  buildTransaction,
  discardTx,
  serialiseTx,
};

export const makeBuildTx =
  (
    wallets$: Observable<MidnightWalletsByAccountId>,
    dependencies: typeof buildTxDependencies,
    { logger }: WithLogger,
  ): TxExecutorImplementation<
    MidnightSpecificSendFlowData,
    MidnightSpecificTokenMetadata
  >['buildTx'] =>
  ({ accountId, serializedTx, txParams, blockchainSpecificSendFlowData }) => {
    // Guard the transfer read (mirrors Cardano/Bitcoin): an empty
    // `tokenTransfers` makes buildTransaction/serialiseTx throw when they
    // destructure `[0]` in their parameters. Fail with the generic build error
    // rather than routing a destructuring crash through the error mapper.
    if (!txParams[0]?.tokenTransfers[0]) {
      return of(genericErrorResults.buildTx());
    }

    return wallets$.pipe(
      take(1),
      map(wallets => wallets[accountId]),
      switchMap(midnightWallet =>
        midnightWallet
          ? of(midnightWallet)
          : throwError(
              () =>
                new Error(
                  `Could not load midnight wallet for account ${accountId}`,
                ),
            ),
      ),
      tap(() =>
        dependencies.discardTx({ serializedTx, blockchainName: 'Midnight' }),
      ),
      switchMap(midnightWallet =>
        midnightWallet.state().pipe(
          take(1),
          map(({ unshielded: { availableCoins } }) =>
            availableCoins.filter(isNativeNightCoin),
          ),
          map(availableNightCoins =>
            dependencies.buildTransaction({
              blockchainSpecificSendFlowData,
              networkId: midnightWallet.networkId,
              nightUtxos: availableNightCoins,
              nightVerifyingKey: midnightWallet.nightVerifyingKey,
              txParams,
            }),
          ),
          withLatestFrom(
            midnightWallet.state().pipe(
              take(1),
              map(state => state.dust.balance(new Date())),
            ),
            midnightWallet.areKeysAvailable$.pipe(take(1)),
          ),
          switchMap(([tx, dustBalance, areKeysAvailable]) => {
            const fee$ = estimatePreparedMidnightFee(midnightWallet, tx, {
              isDustDesignation:
                blockchainSpecificSendFlowData.flowType === 'dust-designation',
              dustBalance,
              areKeysAvailable,
            });

            return fee$.pipe(map(fee => ({ fee, dustBalance })));
          }),
          map(({ fee, dustBalance }): TxBuildResult => {
            // Proactive insufficient dust check - return success with warning
            const warningTranslationKey =
              fee > dustBalance
                ? ('tx-executor.building-error.insufficient-dust' as const)
                : undefined;

            return {
              fees: [
                {
                  amount: BigNumber(fee),
                  tokenId: getDustTokenIdByNetwork(midnightWallet.networkId),
                },
              ],
              serializedTx: dependencies.serialiseTx(txParams),
              success: true,
              warningTranslationKey,
            };
          }),
        ),
      ),
      catchError((error: Error) => {
        logger.error(error);
        return of({
          success: false as const,
          errorTranslationKey: mapMidnightBuildError(error),
        });
      }),
    );
  };

/** Builds with the engine wallets of the app instance the dependencies belong to. */
export const buildTx = (
  dependencies: Pick<MidnightSideEffectsDependencies, 'midnightWallets$'> &
    WithLogger,
) =>
  makeBuildTx(dependencies.midnightWallets$, buildTxDependencies, dependencies);

// TODO LW-14770
export const makePreviewTx =
  (_: unknown): TxExecutorImplementation['previewTx'] =>
  () =>
    of({ minimumAmount: BigNumber(1n), success: true });
