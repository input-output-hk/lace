import { coalesceValueQuantities } from '@cardano-sdk/core';
import { Cardano } from '@cardano-sdk/core';
import {
  computeMinimumCoinQuantity,
  tokenBundleSizeExceedsLimit,
} from '@cardano-sdk/tx-construction';
import { BigIntMath } from '@cardano-sdk/util';
import {
  InputSelectionError,
  InputSelectionFailure,
  TransactionBuilder,
  LOVELACE_TOKEN_ID,
} from '@lace-contract/cardano-context';
import { genericErrorResults } from '@lace-contract/tx-executor';
import { BigNumber } from '@lace-lib/util';
import { defer, firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { resolveRewardWithdrawal } from './reward-withdrawal';

import type { RewardWithdrawal } from './reward-withdrawal';
import type { AnyAddress } from '@lace-contract/addresses';
import type {
  AccountUtxoMap,
  PendingRewardWithdrawals,
  CardanoBlockchainSpecificTxData,
  RequiredProtocolParameters,
} from '@lace-contract/cardano-context';
import type { SideEffectDependencies } from '@lace-contract/module';
import type {
  TxBuildResult,
  TxExecutorImplementation,
  TokenTransfer,
  TxParams,
  TxPreviewResult,
} from '@lace-contract/tx-executor';
import type { Observable } from 'rxjs';

const TWO_HOURS_IN_SECONDS = 7200;

/** Case-insensitive ADA detection, compatible with TokenId('ADA'). */
export const isAda = (tokenId: string): boolean =>
  tokenId === LOVELACE_TOKEN_ID;

/** Convert a single TokenTransfer to a Cardano.Value. */
export const tokenTransferToValue = ({
  normalizedAmount,
  token,
}: TokenTransfer): Cardano.Value => {
  const amount = BigNumber.valueOf(normalizedAmount);
  if (isAda(token.tokenId)) {
    return { coins: amount };
  }
  return {
    coins: 0n,
    assets: new Map<Cardano.AssetId, bigint>([
      [token.tokenId as unknown as Cardano.AssetId, amount],
    ]),
  };
};

/**
 * Evaluate a Cardano TxOut against protocol parameters to determine minimum ADA requirements.
 *
 * @param address - The payment address of the output
 * @param value - The value of the output
 * @param params - The protocol parameters
 */
const evaluateOutput = (
  address: Cardano.PaymentAddress,
  value: Cardano.Value,
  params: RequiredProtocolParameters,
): {
  coinMissing: bigint;
  minimumCoin: bigint;
  hasNegativeAssetQty: boolean;
  hasTokenBundleSizeExceedsLimit: boolean;
} => {
  const { coinsPerUtxoByte, maxValueSize } = params;
  const stubTxOut: Cardano.TxOut = { address, value };
  const hasNegativeAssetQty = value.assets
    ? [...value.assets.values()].some(qty => qty <= 0)
    : false;
  if (hasNegativeAssetQty) {
    return {
      coinMissing: 0n,
      minimumCoin: 0n,
      hasNegativeAssetQty,
      hasTokenBundleSizeExceedsLimit: false,
    };
  }
  const minimumCoin = BigInt(
    computeMinimumCoinQuantity(coinsPerUtxoByte)(stubTxOut),
  );
  return {
    coinMissing: BigIntMath.max([minimumCoin - value.coins, 0n])!,
    minimumCoin,
    hasNegativeAssetQty,
    hasTokenBundleSizeExceedsLimit: tokenBundleSizeExceedsLimit(maxValueSize)(
      value.assets,
    ),
  };
};

/** Aggregate all transfers in a TxParams into a single Cardano.Value. */
export const txParamsToValue = (txp: TxParams): Cardano.Value =>
  coalesceValueQuantities(txp.tokenTransfers.map(tokenTransferToValue));

const getBuildTxData = async ({
  dependencies,
  cardanoAvailableAccountUtxos$,
  pendingRewardWithdrawals$,
  txParams,
  allowRewardsWithdrawal,
}: {
  dependencies: SideEffectDependencies;
  cardanoAvailableAccountUtxos$: Observable<AccountUtxoMap>;
  pendingRewardWithdrawals$: Observable<PendingRewardWithdrawals>;
  readonly txParams: readonly TxParams[];
  allowRewardsWithdrawal?: boolean;
}) => {
  // Extract accountId from the first token in the first txParams
  const firstTokenTransfer = txParams[0]?.tokenTransfers[0];
  if (!firstTokenTransfer)
    throw new Error('No token transfers found in txParams');

  const accountId = firstTokenTransfer.token.accountId;

  // Get all required data from observables
  const [
    networkMagic,
    protocolParameters,
    availableAccountUtxos,
    cardanoAddresses,
    rewardAccountDetails,
    pendingRewardWithdrawals,
  ] = await Promise.all([
    firstValueFrom(dependencies.txExecutorCardano.cardanoNetworkMagic$),
    firstValueFrom(dependencies.txExecutorCardano.cardanoProtocolParameters$),
    firstValueFrom(cardanoAvailableAccountUtxos$),
    firstValueFrom(dependencies.txExecutorCardano.cardanoAddresses$),
    firstValueFrom(dependencies.txExecutorCardano.cardanoRewardAccountDetails$),
    firstValueFrom(pendingRewardWithdrawals$),
  ]);

  if (!networkMagic) throw new Error('Network magic not available');
  if (!protocolParameters) throw new Error('Protocol parameters not available');

  const availableUtxo = availableAccountUtxos[accountId] ?? [];

  // Get the first Cardano address for the account as change address
  const accountAddresses: AnyAddress[] = cardanoAddresses.filter(
    (addr): addr is AnyAddress =>
      addr.accountId === accountId && addr.blockchainName === 'Cardano',
  );

  if (!accountAddresses[0])
    throw new Error('No Cardano addresses found for account');

  const changeAddress = Cardano.PaymentAddress(
    accountAddresses[0].address as string,
  );

  const tokenId = LOVELACE_TOKEN_ID;

  const rewardWithdrawal = allowRewardsWithdrawal
    ? resolveRewardWithdrawal({
        accountId,
        accountAddresses,
        rewardAccountDetails,
        pendingRewardWithdrawals,
        networkMagic,
      })
    : undefined;

  return {
    networkMagic,
    protocolParameters,
    changeAddress,
    availableUtxo,
    tokenId,
    rewardWithdrawal,
  };
};

const buildTx = async ({
  networkMagic,
  protocolParameters,
  changeAddress,
  availableUtxo,
  txParams,
  withdrawal,
}: {
  networkMagic: Cardano.NetworkMagics;
  protocolParameters: RequiredProtocolParameters;
  changeAddress: Cardano.PaymentAddress;
  availableUtxo: Cardano.Utxo[];
  readonly txParams: readonly TxParams[];
  withdrawal?: RewardWithdrawal;
}) => {
  const builder = new TransactionBuilder(networkMagic, protocolParameters)
    .setChangeAddress(changeAddress)
    .expiresIn(TWO_HOURS_IN_SECONDS)
    .setUnspentOutputs(availableUtxo);

  if (withdrawal)
    builder.addRewardsWithdrawal(withdrawal.rewardAccount, withdrawal.amount);

  if (txParams[0].blockchainSpecific) {
    const { memo } = txParams[0]
      .blockchainSpecific as CardanoBlockchainSpecificTxData;
    builder.setMemo(memo);
  }

  for (const txp of txParams) {
    const value = txParamsToValue(txp);
    const address = Cardano.PaymentAddress(txp.address);
    const { coinMissing, hasNegativeAssetQty, hasTokenBundleSizeExceedsLimit } =
      evaluateOutput(address, value, protocolParameters);

    if (hasNegativeAssetQty)
      throw Error('One or more assets have a negative quantity');

    if (hasTokenBundleSizeExceedsLimit)
      throw Error('The token bundle size exceeds the maximum limit');

    value.coins += coinMissing;

    builder.transferValue(address, value);
  }

  const tx = await builder.build();
  const core = tx.toCore();

  return { core, tx, success: true as const };
};

/**
 * Funds the send from UTxOs alone first, so rewards are withdrawn only when
 * needed. A coin-selection failure (the UTxOs cannot cover the amount, the
 * fee or the change minimum) is retried once with the whole reward balance
 * withdrawn; any other failure, or a second shortfall, is surfaced as is.
 */
const buildTxWithRewardsFallback = async ({
  rewardWithdrawal,
  ...params
}: Omit<Parameters<typeof buildTx>[0], 'withdrawal'> & {
  rewardWithdrawal?: RewardWithdrawal;
}) => {
  try {
    return { ...(await buildTx(params)), withdrawal: undefined };
  } catch (error) {
    if (!rewardWithdrawal || !(error instanceof InputSelectionError))
      throw error;
    const built = await buildTx({ ...params, withdrawal: rewardWithdrawal });
    return { ...built, withdrawal: rewardWithdrawal };
  }
};

/**
 * The build failure the Send form shows. Only a shortfall of the amount plus
 * the fee (or of a token) earns the "not enough funds" message. A selection
 * that covers both but leaves change below its minimum ADA (`UtxoFullyDepleted`,
 * e.g. the ADA that must stay with the wallet's tokens) would contradict it, so
 * it keeps the generic message, as does any other error.
 */
const buildTxFailure = (error: Error): TxBuildResult =>
  error instanceof InputSelectionError &&
  error.failure === InputSelectionFailure.BalanceInsufficient
    ? {
        errorTranslationKey: 'tx-executor.building-error.insufficient-funds',
        success: false,
      }
    : genericErrorResults.buildTx({ error });

export const makeBuildTx =
  (
    dependencies: SideEffectDependencies,
    cardanoAvailableAccountUtxos$: Observable<AccountUtxoMap>,
    pendingRewardWithdrawals$: Observable<PendingRewardWithdrawals>,
  ): TxExecutorImplementation['buildTx'] =>
  ({ txParams, allowRewardsWithdrawal }) => {
    return defer(async (): Promise<TxBuildResult> => {
      const {
        networkMagic,
        protocolParameters,
        changeAddress,
        availableUtxo,
        tokenId,
        rewardWithdrawal,
      } = await getBuildTxData({
        dependencies,
        cardanoAvailableAccountUtxos$,
        pendingRewardWithdrawals$,
        txParams,
        allowRewardsWithdrawal,
      });

      const { core, tx, withdrawal } = await buildTxWithRewardsFallback({
        networkMagic,
        protocolParameters,
        changeAddress,
        availableUtxo,
        txParams,
        rewardWithdrawal,
      });

      return {
        fees: [{ amount: BigNumber(core.body.fee), tokenId }],
        success: true as const,
        serializedTx: tx.toCbor(),
        ...(withdrawal && {
          withdrawals: [{ amount: BigNumber(withdrawal.amount), tokenId }],
        }),
      };
    }).pipe(catchError((error: Error) => of(buildTxFailure(error))));
  };

export const makePreviewTx =
  (
    dependencies: SideEffectDependencies,
    cardanoAvailableAccountUtxos$: Observable<AccountUtxoMap>,
    pendingRewardWithdrawals$: Observable<PendingRewardWithdrawals>,
  ): TxExecutorImplementation['previewTx'] =>
  ({ txParams, allowRewardsWithdrawal }) => {
    return defer(async (): Promise<TxPreviewResult> => {
      const {
        networkMagic,
        protocolParameters,
        changeAddress,
        availableUtxo,
        tokenId,
        rewardWithdrawal,
      } = await getBuildTxData({
        dependencies,
        cardanoAvailableAccountUtxos$,
        pendingRewardWithdrawals$,
        txParams,
        allowRewardsWithdrawal,
      });

      const [{ address, blockchainSpecific, tokenTransfers }] = txParams;

      // Prepare preview txParams with fallback address and 1 lovelace amount
      const parameters = {
        address:
          address ||
          // Fallback address: use testnet address if not mainnet, otherwise mainnet fallback
          (networkMagic !== 764824073
            ? // cSpell:disable
              'addr_test1qrtdjvvgalpl5pxqftpf5n6mz23ksvg3gwle040z7jarvxquvv2ng0zzk9yx3q627wnledw8gsy9vuljaw0j9vyjs2yqjjnenn'
            : 'addr1q8tdjvvgalpl5pxqftpf5n6mz23ksvg3gwle040z7jarvxquvv2ng0zzk9yx3q627wnledw8gsy9vuljaw0j9vyjs2yq3ywelv'),
        // cSpell:enable

        blockchainSpecific,
        tokenTransfers: tokenTransfers.map(t => ({
          ...t,
          normalizedAmount:
            t.token.tokenId === tokenId
              ? // Use 1 lovelace so value of 1st output of built tx can be used as minimum amount
                BigNumber(1n)
              : t.normalizedAmount.match(/^[-0]/)
              ? // At least 1 token otherwise tx builder will throw and minimum amount can't be computed
                BigNumber(1n)
              : t.normalizedAmount,
        })) as [TokenTransfer, ...TokenTransfer[]],
      };

      const { core } = await buildTxWithRewardsFallback({
        networkMagic,
        protocolParameters,
        changeAddress,
        availableUtxo,
        txParams: [parameters],
        rewardWithdrawal,
      });

      return {
        minimumAmount: BigNumber(core.body.outputs[0].value.coins ?? 1n),
        success: true as const,
      };
    }).pipe(catchError(() => of(genericErrorResults.previewTx())));
  };
