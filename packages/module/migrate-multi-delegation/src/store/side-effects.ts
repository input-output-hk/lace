import { Cardano, Serialization } from '@cardano-sdk/core';
import { type GroupedAddress } from '@cardano-sdk/key-management';
import { isNotNil } from '@cardano-sdk/util';
import {
  COLLATERAL_AMOUNT_LOVELACES,
  getEligibleCollateralUtxo,
  isCardanoAddress,
  TransactionBuilder,
  type CardanoTransactionSignerContext,
} from '@lace-contract/cardano-context';
import { signerAuthFromPrompt } from '@lace-contract/signer';
import { type AnyWallet } from '@lace-contract/wallet-repo';
import { mapHwSigningError } from '@lace-lib/util-hw';
import { Serializable } from '@lace-lib/util-store';
import { BigNumber, HexBytes } from '@lace-sdk/util';
import {
  catchError,
  combineLatest,
  concat,
  EMPTY,
  endWith,
  exhaustMap,
  filter,
  map,
  mergeMap,
  of,
  race,
  switchMap,
  take,
  timer,
} from 'rxjs';

import type { Action, SideEffect } from '..';
import type { HwErrorTranslationKeys, MultiDelegationAccount } from './slice';
import type { ProviderError } from '@cardano-sdk/core';
import type {
  AccountUtxoMap,
  CardanoNetworkId,
  CardanoProviderContext,
  RequiredProtocolParameters,
  RewardAccountInfo,
} from '@lace-contract/cardano-context';
import type {
  LaceInitSync,
  SideEffectDependencies,
} from '@lace-contract/module';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Result } from '@lace-sdk/util';
import type { Observable } from 'rxjs';

type SideEffectDeps = Parameters<SideEffect>[2];

export const buildMultidelegationMigrationTx =
  (
    { utxos, rewardAccounts }: MultiDelegationAccount,
    { logger }: SideEffectDependencies,
    hasCollateral: boolean,
  ) =>
  ([{ builder, protocolParameters }, otherAccountsInfoResults]: [
    {
      builder: TransactionBuilder;
      protocolParameters: RequiredProtocolParameters;
    },
    Array<
      Result<
        RewardAccountInfo & { rewardAccount: Cardano.RewardAccount },
        ProviderError<unknown>
      >
    >,
  ]): Observable<Serialization.Transaction> => {
    const otherAccountsInfo = otherAccountsInfoResults
      .map(result => result.unwrapOr(null))
      .filter(isNotNil);
    if (otherAccountsInfo.length !== otherAccountsInfoResults.length) {
      logger.error(
        'Failed to fetch reward account info, try again later',
        otherAccountsInfoResults.find(result => result.isErr())?.unwrapErr(),
      );
      return EMPTY;
    }
    for (const utxo of Serializable.from(utxos)) {
      builder.addInput(utxo);
    }
    for (const otherAccount of otherAccountsInfo) {
      if (otherAccount.isRegistered) {
        builder.addStakeDeregistrationCertificate(
          {
            type: Cardano.CredentialType.KeyHash,
            hash: Cardano.RewardAccount.toHash(otherAccount.rewardAccount),
          },
          BigInt(protocolParameters.stakeKeyDeposit),
        );
      }
      const withdrawableAmount = BigNumber.valueOf(
        otherAccount.withdrawableAmount,
      );
      if (withdrawableAmount > 0n) {
        builder.addRewardsWithdrawal(
          otherAccount.rewardAccount,
          withdrawableAmount,
        );
      }
    }
    const primaryRewardAccountAddress = rewardAccounts.find(
      ({ stakeKeyIndex }) => stakeKeyIndex === 0,
    )!.address;
    builder.setChangeAddress(primaryRewardAccountAddress);

    if (hasCollateral) {
      builder.addOutput({
        address: primaryRewardAccountAddress,
        value: { coins: BigInt(COLLATERAL_AMOUNT_LOVELACES) },
      });
    }

    return of(builder.build());
  };

export type SignTxResult = {
  tx: Serialization.Transaction;
  chainId: Cardano.ChainId;
  hasCollateral: boolean;
};

export type SignTxEmission =
  | { type: 'action'; action: Action }
  | { type: 'signed'; result: SignTxResult };

export type AccountContext = {
  account: MultiDelegationAccount['account'];
  wallet$: Observable<AnyWallet>;
  accountAddresses$: Observable<GroupedAddress[]>;
  accountUtxo$: Observable<Cardano.Utxo[]>;
};

const isHardwareAccount = (
  account: MultiDelegationAccount['account'],
): boolean =>
  account.accountType === 'HardwareLedger' ||
  account.accountType === 'HardwareTrezor';

export const signTx =
  (
    { account, wallet$, accountAddresses$, accountUtxo$ }: AccountContext,
    dependencies: SideEffectDeps,
    hasCollateral: boolean,
  ) =>
  (tx: Serialization.Transaction): Observable<SignTxEmission> => {
    const { actions, accessAuthSecret, authenticate, logger, signerFactory } =
      dependencies;

    const auth = signerAuthFromPrompt(
      { accessAuthSecret, authenticate },
      {
        cancellable: false,
        confirmButtonLabel: 'migrate-multi-delegation.migrate',
        message: 'migrate-multi-delegation.auth-message',
      },
    );

    const isHw = isHardwareAccount(account);

    const sign$: Observable<SignTxEmission> = combineLatest([
      wallet$,
      accountAddresses$,
      accountUtxo$,
    ]).pipe(
      take(1),
      switchMap(([wallet, knownAddresses, utxo]) => {
        const context: CardanoTransactionSignerContext = {
          wallet,
          accountId: account.accountId,
          knownAddresses,
          utxo,
          auth,
        };
        const signer = signerFactory.createTransactionSigner(context);
        return signer.sign({ serializedTx: HexBytes(tx.toCbor()) }).pipe(
          map(
            (result): SignTxEmission => ({
              type: 'signed',
              result: {
                tx: Serialization.Transaction.fromCbor(
                  Serialization.TxCBOR(result.serializedTx),
                ),
                chainId: account.blockchainSpecific.chainId,
                hasCollateral,
              },
            }),
          ),
          catchError(error => {
            logger.warn('Failed to sign migration tx', error);
            if (isHw) {
              const errorTranslationKeys: HwErrorTranslationKeys =
                mapHwSigningError(error);
              return of<SignTxEmission>({
                type: 'action',
                action: actions.migrateMultiDelegation.hwSigningFailed({
                  errorTranslationKeys,
                }),
              });
            }
            return EMPTY;
          }),
        );
      }),
    );

    if (isHw) {
      return concat(
        of<SignTxEmission>({
          type: 'action',
          action: actions.migrateMultiDelegation.hwSigningStarted(),
        }),
        sign$,
      );
    }
    return sign$;
  };

const AWAIT_COLLATERAL_UTXO_TIMEOUT_MS = 120_000;

export const awaitAndMarkCollateral = ({
  accountId,
  selectAccountUtxos$,
  setAccountUnspendableUtxos,
  logger,
}: {
  accountId: AccountId;
  selectAccountUtxos$: Observable<AccountUtxoMap>;
  setAccountUnspendableUtxos: (params: {
    accountId: AccountId;
    utxos: Cardano.Utxo[];
  }) => Action;
  logger: SideEffectDependencies['logger'];
}): Observable<Action> => {
  const utxoFound$ = selectAccountUtxos$.pipe(
    map(utxos => getEligibleCollateralUtxo(utxos[accountId] ?? [])),
    filter(isNotNil),
    take(1),
    map(utxo => setAccountUnspendableUtxos({ accountId, utxos: [utxo] })),
  );

  const timeout$ = timer(AWAIT_COLLATERAL_UTXO_TIMEOUT_MS).pipe(
    mergeMap(() => {
      logger.warn(
        'Timeout waiting for migrated collateral UTXO to appear (2 min exceeded)',
      );
      return EMPTY;
    }),
  );

  return race(utxoFound$, timeout$);
};

export const submitTx =
  (
    dependencies: SideEffectDeps,
    collateralContext?: {
      selectAccountUtxos$: Observable<AccountUtxoMap>;
      accountId: AccountId;
      setAccountUnspendableUtxos: (params: {
        accountId: AccountId;
        utxos: Cardano.Utxo[];
      }) => Action;
    },
  ) =>
  (signingResult: SignTxResult): Observable<Action> => {
    dependencies.logger.debug(
      'Submit multi-delegation migration tx',
      signingResult.tx.toCore(),
    );
    return dependencies.cardanoProvider
      .submitTx(
        { signedTransaction: signingResult.tx.toCbor() },
        { chainId: signingResult.chainId },
      )
      .pipe(
        mergeMap(result => {
          if (result.isOk()) {
            dependencies.logger.debug('Tx submitted:', result.value);
            if (signingResult.hasCollateral && collateralContext) {
              return awaitAndMarkCollateral({
                accountId: collateralContext.accountId,
                selectAccountUtxos$: collateralContext.selectAccountUtxos$,
                setAccountUnspendableUtxos:
                  collateralContext.setAccountUnspendableUtxos,
                logger: dependencies.logger,
              });
            }
          } else {
            dependencies.logger.warn('Failed to submit tx', signingResult.tx);
          }
          return EMPTY;
        }),
        endWith(dependencies.actions.migrateMultiDelegation.reset()),
      );
  };

export const makeMigrateAccount =
  ({
    buildTxFn,
    signTxFn,
    submitTxFn,
  }: {
    buildTxFn: typeof buildMultidelegationMigrationTx;
    signTxFn: typeof signTx;
    submitTxFn: typeof submitTx;
  }) =>
  (multiDelegationAccount: MultiDelegationAccount): SideEffect =>
  (
    _,
    {
      wallets: { selectWalletById$ },
      addresses: { selectByAccountId$ },
      cardanoContext: {
        selectAllNetworkInfo$,
        selectAccountUtxos$,
        selectAccountUnspendableUtxos$,
      },
    },
    dependencies,
  ) => {
    const accountId = multiDelegationAccount.account.accountId;

    const builder$ = selectAllNetworkInfo$.pipe(
      map(
        networkInfos =>
          networkInfos[
            multiDelegationAccount.account
              .blockchainNetworkId as CardanoNetworkId
          ]?.protocolParameters,
      ),
      filter(isNotNil),
      map(protocolParameters => ({
        builder: new TransactionBuilder(
          multiDelegationAccount.account.blockchainSpecific.chainId.networkMagic,
          protocolParameters,
        ),
        protocolParameters,
      })),
    );
    const providerContext: CardanoProviderContext = {
      chainId: multiDelegationAccount.account.blockchainSpecific.chainId,
    };
    const otherAccountsInfo$ = combineLatest(
      multiDelegationAccount.rewardAccounts
        .filter(({ stakeKeyIndex }) => stakeKeyIndex > 0)
        .map(({ rewardAccount }) =>
          dependencies.cardanoProvider
            .getRewardAccountInfo({ rewardAccount }, providerContext)
            .pipe(
              map(result =>
                result.map(accountInfo => ({
                  ...accountInfo,
                  rewardAccount: Cardano.RewardAccount(rewardAccount),
                })),
              ),
            ),
        ),
    );

    const wallet$ = selectWalletById$.pipe(
      map(select => select(multiDelegationAccount.account.walletId)),
      filter(isNotNil),
    );

    const accountAddresses$ = selectByAccountId$.pipe(
      map(select =>
        select(multiDelegationAccount.account.accountId)
          .filter(isCardanoAddress)
          .map(
            ({ address, data }): GroupedAddress => ({
              accountIndex: data!.accountIndex,
              address: Cardano.PaymentAddress(address),
              index: data!.index,
              networkId: data!.networkId,
              rewardAccount: Cardano.RewardAccount(data!.rewardAccount),
              type: data!.type,
              stakeKeyDerivationPath: data!.stakeKeyDerivationPath,
            }),
          ),
      ),
    );

    const accountUtxo$ = selectAccountUtxos$.pipe(
      map(utxoMap => utxoMap[accountId]),
      filter(isNotNil),
    );

    const accountContext: AccountContext = {
      wallet$,
      accountAddresses$,
      accountUtxo$,
      account: multiDelegationAccount.account,
    };

    return selectAccountUnspendableUtxos$.pipe(
      take(1),
      mergeMap(unspendableUtxos => {
        const hasCollateral = (unspendableUtxos[accountId] ?? []).length > 0;
        const submit = submitTxFn(
          dependencies,
          hasCollateral
            ? {
                selectAccountUtxos$,
                accountId,
                setAccountUnspendableUtxos:
                  dependencies.actions.cardanoContext
                    .setAccountUnspendableUtxos,
              }
            : undefined,
        );
        return combineLatest([builder$, otherAccountsInfo$]).pipe(
          take(1),
          mergeMap(
            buildTxFn(multiDelegationAccount, dependencies, hasCollateral),
          ),
          mergeMap(signTxFn(accountContext, dependencies, hasCollateral)),
          mergeMap(emission =>
            emission.type === 'action'
              ? of(emission.action)
              : submit(emission.result),
          ),
        );
      }),
    );
  };

// Internal: wire up with real implementations
const migrateAccount = makeMigrateAccount({
  buildTxFn: buildMultidelegationMigrationTx,
  signTxFn: signTx,
  submitTxFn: submitTx,
});

export const makeCoordinateAccountMigrations =
  ({
    migrateAccountFunction,
  }: {
    migrateAccountFunction: typeof migrateAccount;
  }): SideEffect =>
  (actionObservables, stateObservables, dependencies) =>
    actionObservables.migrateMultiDelegation.migrate$.pipe(
      exhaustMap(({ payload }) =>
        migrateAccountFunction(payload)(
          actionObservables,
          stateObservables,
          dependencies,
        ),
      ),
    );

export const initializeSideEffects: LaceInitSync<SideEffect[]> = () => [
  makeCoordinateAccountMigrations({ migrateAccountFunction: migrateAccount }),
];
