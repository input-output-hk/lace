import { coalesceValueQuantities } from '@cardano-sdk/core';
import { Cardano } from '@cardano-sdk/core';
import {
  computeMinimumCoinQuantity,
  tokenBundleSizeExceedsLimit,
} from '@cardano-sdk/tx-construction';
import { BigIntMath } from '@cardano-sdk/util';
import {
  TransactionBuilder,
  LOVELACE_TOKEN_ID,
  filterSpendableUtxos,
} from '@lace-contract/cardano-context';
import { genericErrorResults } from '@lace-contract/tx-executor';
import { BigNumber } from '@lace-sdk/util';
import { defer, firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import type { AnyAddress } from '@lace-contract/addresses';
import type {
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
 * @param address The payment address of the output
 * @param value The value of the output
 * @param params The protocol parameters
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
  txParams,
}: {
  dependencies: SideEffectDependencies;
  readonly txParams: readonly TxParams[];
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
    allAccountUtxos,
    unspendableAccountUtxos,
    cardanoAddresses,
  ] = await Promise.all([
    firstValueFrom(dependencies.txExecutorCardano.cardanoNetworkMagic$),
    firstValueFrom(dependencies.txExecutorCardano.cardanoProtocolParameters$),
    firstValueFrom(dependencies.txExecutorCardano.cardanoAccountUtxos$),
    firstValueFrom(
      dependencies.txExecutorCardano.cardanoAccountUnspendableUtxos$,
    ),
    firstValueFrom(dependencies.txExecutorCardano.cardanoAddresses$),
  ]);

  if (!networkMagic) throw new Error('Network magic not available');
  if (!protocolParameters) throw new Error('Protocol parameters not available');

  const availableUtxo = filterSpendableUtxos(
    allAccountUtxos[accountId] ?? [],
    unspendableAccountUtxos[accountId] ?? [],
  );

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

  return {
    networkMagic,
    protocolParameters,
    changeAddress,
    availableUtxo,
    tokenId,
  };
};

const buildTx = ({
  networkMagic,
  protocolParameters,
  changeAddress,
  availableUtxo,
  txParams,
}: {
  networkMagic: Cardano.NetworkMagics;
  protocolParameters: RequiredProtocolParameters;
  changeAddress: Cardano.PaymentAddress;
  availableUtxo: Cardano.Utxo[];
  readonly txParams: readonly TxParams[];
}) => {
  const builder = new TransactionBuilder(networkMagic, protocolParameters)
    .setChangeAddress(changeAddress)
    .expiresIn(TWO_HOURS_IN_SECONDS)
    .setUnspentOutputs(availableUtxo);

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

  const tx = builder.build();
  const core = tx.toCore();

  return { core, tx, success: true as const };
};

export const makeBuildTx =
  (dependencies: SideEffectDependencies): TxExecutorImplementation['buildTx'] =>
  ({ txParams }) => {
    return defer(async (): Promise<TxBuildResult> => {
      const {
        networkMagic,
        protocolParameters,
        changeAddress,
        availableUtxo,
        tokenId,
      } = await getBuildTxData({ dependencies, txParams });

      const { core, tx } = buildTx({
        networkMagic,
        protocolParameters,
        changeAddress,
        availableUtxo,
        txParams,
      });

      return {
        fees: [{ amount: BigNumber(core.body.fee), tokenId }],
        success: true as const,
        serializedTx: tx.toCbor(),
      };
    }).pipe(
      catchError((error: Error) => of(genericErrorResults.buildTx({ error }))),
    );
  };

export const makePreviewTx =
  (
    dependencies: SideEffectDependencies,
  ): TxExecutorImplementation['previewTx'] =>
  ({ txParams }) => {
    return defer(async (): Promise<TxPreviewResult> => {
      const {
        networkMagic,
        protocolParameters,
        changeAddress,
        availableUtxo,
        tokenId,
      } = await getBuildTxData({ dependencies, txParams });

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

      const { core } = buildTx({
        networkMagic,
        protocolParameters,
        changeAddress,
        availableUtxo,
        txParams: [parameters],
      });

      return {
        minimumAmount: BigNumber(core.body.outputs[0].value.coins ?? 1n),
        success: true as const,
      };
    }).pipe(catchError(() => of(genericErrorResults.previewTx())));
  };
