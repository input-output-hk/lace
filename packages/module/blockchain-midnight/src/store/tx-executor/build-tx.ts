import {
  defaultTxTtlLength,
  fromUnshieldedTokenType,
  getDustTokenIdByNetwork,
  midnightWallets$,
} from '@lace-contract/midnight-context';
import { TokenId } from '@lace-contract/tokens';
import { BigNumber, HexBytes } from '@lace-sdk/util';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import { nativeToken } from '@midnight-ntwrk/ledger-v8';
import {
  DustAddress,
  MidnightBech32m,
  ShieldedAddress,
  UnshieldedAddress,
} from '@midnight-ntwrk/wallet-sdk-address-format';
import curry from 'lodash/fp/curry';
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

import { discardTx } from './discard-tx';
import { mapMidnightBuildError } from './error-mapping';

import type {
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
import type { WithLogger } from '@lace-sdk/util';
import type {
  DustRegistration,
  SignatureEnabled,
  SignatureVerifyingKey,
} from '@midnight-ntwrk/ledger-v8';
import type { UtxoWithMeta } from '@midnight-ntwrk/wallet-sdk-facade';
import type { Observable } from 'rxjs';

export type MidnightTxParameters = {
  amount: BigNumber;
  receiverAddress: string;
  type: string;
  tokenKind: MidnightTokenKind;
};

type ConstructTxParams = {
  address: string;
  amount: bigint;
  networkId: MidnightSDKNetworkId;
  tokenId: TokenId;
};

type DustDesignationDependencies = {
  nightUtxos: UtxoWithMeta[];
  nightVerifyingKey: SignatureVerifyingKey;
};

type ConstructDustDesignationTxParams = DustDesignationDependencies & {
  address: string;
  networkId: MidnightSDKNetworkId;
};

export const constructDustDesignationTransaction = ({
  address,
  networkId,
  nightUtxos,
  nightVerifyingKey,
}: ConstructDustDesignationTxParams) => {
  const parsedAddress = MidnightBech32m.parse(address);
  const receiverData = DustAddress.codec.decode(networkId, parsedAddress).data;
  const currentTime = new Date();
  const ttl = new Date(Date.now() + defaultTxTtlLength);
  const intent = ledger.Intent.new(ttl);
  const totalNightValue = nightUtxos
    .map(({ utxo: { value } }) => BigNumber.valueOf(value))
    .reduce((total, value) => total + value, 0n);

  const inputs = nightUtxos.map(({ utxo }) => ({
    ...utxo,
    owner: nightVerifyingKey,
  }));
  const outputs = inputs.map(input => ({
    owner: ledger.addressFromKey(nightVerifyingKey),
    type: input.type,
    value: input.value,
  }));
  intent.guaranteedUnshieldedOffer = ledger.UnshieldedOffer.new(
    inputs,
    outputs,
    [],
  );

  // Eslint is wrong here. Without the type assertion here the type is more generic
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  const dustRegistration = new ledger.DustRegistration(
    'signature',
    nightVerifyingKey,
    receiverData,
    totalNightValue,
  ) as DustRegistration<SignatureEnabled>;
  intent.dustActions = new ledger.DustActions(
    'signature' as const,
    'pre-proof' as const,
    currentTime,
    [],
    [dustRegistration],
  );

  return ledger.Transaction.fromParts(networkId, undefined, undefined, intent);
};

export const constructUnshieldedTransaction = ({
  address,
  amount,
  networkId,
  tokenId,
}: ConstructTxParams) => {
  const ttl = new Date(Date.now() + defaultTxTtlLength);
  const intent = ledger.Intent.new(ttl);
  const parsedAddress = MidnightBech32m.parse(address);
  const addressDataHex = UnshieldedAddress.codec
    .decode(networkId, parsedAddress)
    .data.toString('hex');
  const ledgerOutput = {
    value: amount,
    owner: addressDataHex,
    type: tokenId,
  };
  intent.guaranteedUnshieldedOffer = ledger.UnshieldedOffer.new(
    // No inputs (will be balanced later in confirm-tx)
    [],
    [ledgerOutput],
    // No signatures (added in confirm-tx)
    [],
  );
  return ledger.Transaction.fromParts(networkId, undefined, undefined, intent);
};

export const constructShieldedTransaction = ({
  address,
  amount,
  networkId,
  tokenId,
}: ConstructTxParams) => {
  const parsedAddress = MidnightBech32m.parse(address);
  const decodedAddress = ShieldedAddress.codec.decode(networkId, parsedAddress);
  const coin = ledger.createShieldedCoinInfo(tokenId, amount);
  const output = ledger.ZswapOutput.new(
    coin,
    0,
    decodedAddress.coinPublicKey.toHexString(),
    decodedAddress.encryptionPublicKey.toHexString(),
  );
  const offer = ledger.ZswapOffer.fromOutput(output, tokenId, amount);
  return ledger.Transaction.fromParts(networkId, offer);
};

const buildTransaction = ({
  blockchainSpecificSendFlowData: { flowType },
  networkId,
  nightUtxos,
  nightVerifyingKey,
  txParams: [
    {
      address,
      tokenTransfers: [
        {
          normalizedAmount,
          token: { metadata, tokenId },
        },
      ],
    },
  ],
}: DustDesignationDependencies & {
  blockchainSpecificSendFlowData: MidnightSpecificSendFlowData;
  networkId: MidnightSDKNetworkId;
  txParams: TxParamsBundle<MidnightSpecificTokenMetadata>;
}) => {
  if (!metadata) throw new Error('Token metadata required');

  if (flowType === 'dust-designation') {
    return constructDustDesignationTransaction({
      address,
      networkId,
      nightUtxos,
      nightVerifyingKey,
    });
  }

  const params: ConstructTxParams = {
    address,
    amount: BigNumber.valueOf(normalizedAmount),
    networkId,
    tokenId,
  };

  if (metadata.blockchainSpecific.kind === 'shielded') {
    return constructShieldedTransaction(params);
  }

  return constructUnshieldedTransaction({
    ...params,
    tokenId: TokenId(fromUnshieldedTokenType(tokenId, networkId)),
  });
};

const serialiseTx = ([
  {
    address,
    tokenTransfers: [
      {
        normalizedAmount,
        token: { metadata, tokenId },
      },
    ],
  },
]: TxParamsBundle<MidnightSpecificTokenMetadata>) => {
  if (!metadata) throw new Error('Token metadata required');
  const txParameters: MidnightTxParameters = {
    amount: normalizedAmount,
    receiverAddress: address,
    type: tokenId,
    tokenKind: metadata?.blockchainSpecific.kind,
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
            availableCoins.filter(
              ({ utxo: { type } }) => type === nativeToken().raw,
            ),
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
            if (
              blockchainSpecificSendFlowData.flowType === 'dust-designation' &&
              dustBalance === 0n
            ) {
              return of({ fee: 0n, dustBalance });
            }

            const fee$ = areKeysAvailable
              ? midnightWallet.estimateTransactionFee(tx, {
                  currentTime: new Date(),
                })
              : midnightWallet.calculateTransactionFee(tx);

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

export const buildTx = curry(makeBuildTx)(
  midnightWallets$,
  buildTxDependencies,
);

// TODO LW-14770
export const makePreviewTx =
  (_: unknown): TxExecutorImplementation['previewTx'] =>
  () =>
    of({ minimumAmount: BigNumber(1n), success: true });
