import { Cardano, Serialization } from '@cardano-sdk/core';
import { type GroupedAddress } from '@cardano-sdk/key-management';
import { isNotNil } from '@cardano-sdk/util';
import {
  CardanoPaymentAddress,
  COLLATERAL_AMOUNT_LOVELACES,
  derivePendingActivityFromCbor,
  getEligibleCollateralUtxo,
  isCardanoAddress,
  TransactionBuilder,
  type CardanoTransactionSignerContext,
} from '@lace-contract/cardano-context';
import { signerAuthFromPrompt } from '@lace-contract/signer';
import { type AnyWallet } from '@lace-contract/wallet-repo';
import { mapHwSigningError } from '@lace-lib/util-hw';
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

import type { MigrateMultiDelegationAction, SideEffect } from '..';
import type { HwErrorTranslationKeys, MultiDelegationAccount } from './slice';
import type { ProviderError } from '@cardano-sdk/core';
import type { AnyAddress } from '@lace-contract/addresses';
import type {
  AccountUtxoMap,
  CardanoNetworkId,
  CardanoNetworkInfo,
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

export const createBuilder$ = (
  multiDelegationAccount: MultiDelegationAccount,
  selectAllNetworkInfo$: Observable<
    Partial<Record<CardanoNetworkId, CardanoNetworkInfo>>
  >,
) =>
  selectAllNetworkInfo$.pipe(
    map(
      networkInfos =>
        networkInfos[
          multiDelegationAccount.account.blockchainNetworkId as CardanoNetworkId
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

export const createProviderContext = (
  multiDelegationAccount: MultiDelegationAccount,
): CardanoProviderContext => ({
  chainId: multiDelegationAccount.account.blockchainSpecific.chainId,
});

export const fetchSecondaryAccountsInfo$ = (
  multiDelegationAccount: MultiDelegationAccount,
  providerContext: CardanoProviderContext,
  cardanoProvider: SideEffectDependencies['cardanoProvider'],
) =>
  combineLatest(
    multiDelegationAccount.rewardAccounts
      .filter(({ stakeKeyIndex }) => stakeKeyIndex > 0)
      .map(({ rewardAccount }) =>
        cardanoProvider
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

export const createAccountObservables = ({
  multiDelegationAccount,
  selectWalletById$,
  selectByAccountId$,
  selectAvailableAccountUtxos$,
}: {
  multiDelegationAccount: MultiDelegationAccount;
  selectWalletById$: Observable<
    (
      walletId: MultiDelegationAccount['account']['walletId'],
    ) => AnyWallet | undefined
  >;
  selectByAccountId$: Observable<(accountId: AccountId) => AnyAddress[]>;
  selectAvailableAccountUtxos$: Observable<AccountUtxoMap>;
}) => {
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

  const accountUtxo$ = selectAvailableAccountUtxos$.pipe(
    map(utxoMap => utxoMap[multiDelegationAccount.account.accountId]),
    filter(isNotNil),
  );

  return { wallet$, accountAddresses$, accountUtxo$ };
};

export const buildMultidelegationMigrationTx =
  (
    { rewardAccounts }: MultiDelegationAccount,
    { logger }: SideEffectDependencies,
    hasCollateral: boolean,
  ) =>
  ([{ builder, protocolParameters }, otherAccountsInfoResults, utxos]: [
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
    Cardano.Utxo[],
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
    for (const utxo of utxos) {
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
  accountId: AccountId;
  accountAddresses: CardanoPaymentAddress[];
  accountUtxos: Cardano.Utxo[];
};

export type SignTxEmission =
  | { type: 'action'; action: MigrateMultiDelegationAction }
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
                accountId: account.accountId,
                accountAddresses: knownAddresses.map(a =>
                  CardanoPaymentAddress(a.address),
                ),
                accountUtxos: utxo,
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
  }) => MigrateMultiDelegationAction;
  logger: SideEffectDependencies['logger'];
}): Observable<MigrateMultiDelegationAction> => {
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
      }) => MigrateMultiDelegationAction;
    },
  ) =>
  (signingResult: SignTxResult): Observable<MigrateMultiDelegationAction> => {
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
            const pendingActivity = derivePendingActivityFromCbor({
              serializedTx: HexBytes(signingResult.tx.toCbor()),
              accountId: signingResult.accountId,
              accountAddresses: signingResult.accountAddresses,
              accountUtxos: signingResult.accountUtxos,
            });
            const upsert$ = pendingActivity
              ? of(
                  dependencies.actions.activities.upsertActivities({
                    accountId: signingResult.accountId,
                    activities: [pendingActivity],
                  }),
                )
              : EMPTY;
            if (signingResult.hasCollateral && collateralContext) {
              return concat(
                upsert$,
                awaitAndMarkCollateral({
                  accountId: collateralContext.accountId,
                  selectAccountUtxos$: collateralContext.selectAccountUtxos$,
                  setAccountUnspendableUtxos:
                    collateralContext.setAccountUnspendableUtxos,
                  logger: dependencies.logger,
                }),
              );
            }
            return upsert$;
          }
          dependencies.logger.warn('Failed to submit tx', signingResult.tx);
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
        selectAvailableAccountUtxos$,
        selectAccountUnspendableUtxos$,
      },
    },
    dependencies,
  ) => {
    const accountId = multiDelegationAccount.account.accountId;

    const builder$ = createBuilder$(
      multiDelegationAccount,
      selectAllNetworkInfo$,
    );
    const providerContext = createProviderContext(multiDelegationAccount);
    const otherAccountsInfo$ = fetchSecondaryAccountsInfo$(
      multiDelegationAccount,
      providerContext,
      dependencies.cardanoProvider,
    );

    const { wallet$, accountAddresses$, accountUtxo$ } =
      createAccountObservables({
        multiDelegationAccount,
        selectWalletById$,
        selectByAccountId$,
        selectAvailableAccountUtxos$,
      });

    return selectAccountUnspendableUtxos$.pipe(
      take(1),
      mergeMap(unspendableUtxos => {
        const oldCollateralUtxos = unspendableUtxos[accountId] ?? [];
        const hasCollateral = oldCollateralUtxos.length > 0;

        // Include old collateral UTXOs as inputs so they are spent by the
        // migration tx rather than stranded on chain at a secondary stake
        // key address that the wallet will stop tracking after de-registration.
        const effectiveAccountUtxo$ = hasCollateral
          ? accountUtxo$.pipe(map(utxos => [...utxos, ...oldCollateralUtxos]))
          : accountUtxo$;

        const accountContext: AccountContext = {
          wallet$,
          accountAddresses$,
          accountUtxo$: effectiveAccountUtxo$,
          account: multiDelegationAccount.account,
        };

        const submit = submitTxFn(
          dependencies,
          hasCollateral
            ? {
                selectAccountUtxos$: selectAvailableAccountUtxos$,
                accountId,
                setAccountUnspendableUtxos:
                  dependencies.actions.cardanoContext
                    .setAccountUnspendableUtxos,
              }
            : undefined,
        );
        return combineLatest([
          builder$,
          otherAccountsInfo$,
          effectiveAccountUtxo$,
        ]).pipe(
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

const ALWAYS_ABSTAIN_DREP: Cardano.DelegateRepresentative = {
  __typename: 'AlwaysAbstain',
};

type AffectedRewardAccount = RewardAccountInfo & {
  rewardAccount: Cardano.RewardAccount;
};

export const buildVoteDelegationTx =
  (
    { rewardAccounts }: MultiDelegationAccount,
    affectedKeys: AffectedRewardAccount[],
  ) =>
  ([{ builder }, utxos]: [
    {
      builder: TransactionBuilder;
      protocolParameters: RequiredProtocolParameters;
    },
    Cardano.Utxo[],
  ]): Observable<Serialization.Transaction> => {
    builder.setUnspentOutputs(utxos);

    for (const affectedKey of affectedKeys) {
      builder.addVoteDelegationCertificate(
        {
          type: Cardano.CredentialType.KeyHash,
          hash: Cardano.RewardAccount.toHash(affectedKey.rewardAccount),
        },
        ALWAYS_ABSTAIN_DREP,
      );
    }

    const primaryRewardAccountAddress = rewardAccounts.find(
      ({ stakeKeyIndex }) => stakeKeyIndex === 0,
    )!.address;
    builder.setChangeAddress(primaryRewardAccountAddress);

    return of(builder.build());
  };

export const makePrepareVoteDelegation =
  ({
    buildVoteDelegationTxFn,
    signTxFn,
  }: {
    buildVoteDelegationTxFn: typeof buildVoteDelegationTx;
    signTxFn: typeof signTx;
  }): SideEffect =>
  (
    actionObservables,
    {
      wallets: { selectWalletById$ },
      addresses: { selectByAccountId$ },
      cardanoContext: { selectAllNetworkInfo$, selectAvailableAccountUtxos$ },
    },
    dependencies,
  ) =>
    actionObservables.migrateMultiDelegation.startMigration$.pipe(
      exhaustMap(({ payload: multiDelegationAccount }) => {
        const providerContext = createProviderContext(multiDelegationAccount);

        const otherAccountsInfo$ = fetchSecondaryAccountsInfo$(
          multiDelegationAccount,
          providerContext,
          dependencies.cardanoProvider,
        );

        return otherAccountsInfo$.pipe(
          take(1),
          mergeMap(otherAccountsInfoResults => {
            const otherAccountsInfo = otherAccountsInfoResults
              .map(result => result.unwrapOr(null))
              .filter(isNotNil);
            if (otherAccountsInfo.length !== otherAccountsInfoResults.length) {
              dependencies.logger.error(
                'Failed to fetch reward account info for vote delegation, try again later',
                otherAccountsInfoResults
                  .find(result => result.isErr())
                  ?.unwrapErr(),
              );
              return EMPTY;
            }

            const affectedKeys = otherAccountsInfo.filter(
              account =>
                account.isRegistered &&
                account.drepId === undefined &&
                BigNumber.valueOf(account.withdrawableAmount) > 0n,
            );

            if (affectedKeys.length === 0) {
              return of(
                dependencies.actions.migrateMultiDelegation.migrate(
                  multiDelegationAccount,
                ),
              );
            }

            const builder$ = createBuilder$(
              multiDelegationAccount,
              selectAllNetworkInfo$,
            );

            const { wallet$, accountAddresses$, accountUtxo$ } =
              createAccountObservables({
                multiDelegationAccount,
                selectWalletById$,
                selectByAccountId$,
                selectAvailableAccountUtxos$,
              });

            const accountContext: AccountContext = {
              account: multiDelegationAccount.account,
              wallet$,
              accountAddresses$,
              accountUtxo$,
            };

            return combineLatest([builder$, accountUtxo$]).pipe(
              take(1),
              mergeMap(
                buildVoteDelegationTxFn(multiDelegationAccount, affectedKeys),
              ),
              mergeMap(signTxFn(accountContext, dependencies, false)),
              mergeMap(emission => {
                if (emission.type === 'action') {
                  return of(emission.action);
                }
                return dependencies.cardanoProvider
                  .submitTx(
                    { signedTransaction: emission.result.tx.toCbor() },
                    { chainId: emission.result.chainId },
                  )
                  .pipe(
                    mergeMap(result => {
                      if (result.isOk()) {
                        dependencies.logger.debug(
                          'Vote delegation tx submitted:',
                          result.value,
                        );
                        const pendingActivity = derivePendingActivityFromCbor({
                          serializedTx: HexBytes(emission.result.tx.toCbor()),
                          accountId: emission.result.accountId,
                          accountAddresses: emission.result.accountAddresses,
                          accountUtxos: emission.result.accountUtxos,
                        });
                        const upsert$ = pendingActivity
                          ? of(
                              dependencies.actions.activities.upsertActivities({
                                accountId: emission.result.accountId,
                                activities: [pendingActivity],
                              }),
                            )
                          : EMPTY;
                        return concat(
                          upsert$,
                          of(
                            dependencies.actions.migrateMultiDelegation.migrate(
                              multiDelegationAccount,
                            ),
                          ),
                        );
                      }
                      dependencies.logger.warn(
                        'Failed to submit vote delegation tx',
                      );
                      return of(
                        dependencies.actions.migrateMultiDelegation.reset(),
                      );
                    }),
                  );
              }),
            );
          }),
        );
      }),
    );

const prepareVoteDelegation = makePrepareVoteDelegation({
  buildVoteDelegationTxFn: buildVoteDelegationTx,
  signTxFn: signTx,
});

export const initializeSideEffects: LaceInitSync<SideEffect[]> = () => [
  prepareVoteDelegation,
  makeCoordinateAccountMigrations({ migrateAccountFunction: migrateAccount }),
];
