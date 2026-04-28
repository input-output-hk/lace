import {
  Cardano,
  ProviderError,
  ProviderFailure,
  Serialization,
} from '@cardano-sdk/core';
import { createTestScheduler } from '@cardano-sdk/util-dev';
import { CardanoRewardAccount } from '@lace-contract/cardano-context';
import { BlockchainNetworkId } from '@lace-contract/network';
import { AccountId, WalletId, WalletType } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { Serializable } from '@lace-lib/util-store';
import { BigNumber, HexBytes, Ok, Err } from '@lace-sdk/util';
import { EMPTY, of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildMultidelegationMigrationTx,
  makeCoordinateAccountMigrations,
  makeMigrateAccount,
  signTx,
  submitTx,
} from '../../src/store/side-effects';
import { migrateMultiDelegationActions } from '../../src/store/slice';

import type {
  AccountContext,
  SignTxEmission,
  SignTxResult,
} from '../../src/store/side-effects';
import type { Logger } from '@cardano-sdk/util-dev';
import type {
  CardanoBip32AccountProps,
  CardanoProvider,
  CardanoTransactionSigner,
  RequiredProtocolParameters,
  RewardAccountInfo,
  TransactionBuilder,
} from '@lace-contract/cardano-context';
import type { SideEffectDependencies } from '@lace-contract/module';
import type { SignerFactory } from '@lace-contract/signer';
import type {
  HardwareWalletAccount,
  InMemoryWallet,
  InMemoryWalletAccount,
} from '@lace-contract/wallet-repo';
import type { Result } from '@lace-sdk/util';
import type { RunHelpers } from 'rxjs/testing';
import type { Mocked } from 'vitest';

/** Type-safe partial mock helper for test objects */
const mock = <T>(partial: Partial<T>): T => partial as T;

const chainId = Cardano.ChainIds.Mainnet;
const accountId = AccountId('account-1');
const walletId = WalletId('wallet-1');

const rewardAccount0 = CardanoRewardAccount(
  'stake1uxpdrerp9wrxunfh6ukyv5267j70fzxgw0fr3z8zeac5vyqhf9jhy',
);
const rewardAccount1 = CardanoRewardAccount(
  'stake1uyfz49rtntfa9h0s98f6s28sg69weemgjhc4e8hm66d5yacalmqha',
);
const address0 =
  'addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp' as Cardano.PaymentAddress;
const address1 =
  'addr1q9uxupsqq8pqfqj7hgfcjs9j0rl09k3z8hy9v8xfksf7q0nhvhqk7gy9gqf9t8dwjg3s2j5pk6nqhqy8ngfdms9yjvqsa9lhxw' as Cardano.PaymentAddress;

const createUtxo = (address: Cardano.PaymentAddress): Cardano.Utxo =>
  [
    { txId: 'tx1' as Cardano.TransactionId, index: 0 },
    { address, value: { coins: 5_000_000n } },
  ] as Cardano.Utxo;

const utxos: Cardano.Utxo[] = [createUtxo(address0), createUtxo(address1)];

const mockProtocolParameters: RequiredProtocolParameters = {
  coinsPerUtxoByte: 4310,
  collateralPercentage: 150,
  desiredNumberOfPools: 500,
  dRepDeposit: 500_000_000,
  maxCollateralInputs: 3,
  maxTxSize: 16384,
  maxValueSize: 5000,
  minFeeCoefficient: 44,
  minFeeConstant: 155381,
  minFeeRefScriptCostPerByte: '15.0',
  monetaryExpansion: '3.0/1000.0',
  poolDeposit: 500_000_000,
  poolInfluence: '3.0/10.0',
  prices: { memory: 0.0577, steps: 0.0000721 },
  stakeKeyDeposit: 2_000_000,
};

const createInMemoryAccount = (
  accountIdentifier: AccountId,
): InMemoryWalletAccount<CardanoBip32AccountProps> => ({
  accountId: accountIdentifier,
  walletId,
  accountType: 'InMemory',
  blockchainName: 'Cardano',
  networkType: 'mainnet',
  blockchainNetworkId: BlockchainNetworkId('cardano-mainnet'),
  metadata: { name: 'Account' },
  blockchainSpecific: {
    chainId,
    accountIndex: 0,
    extendedAccountPublicKey:
      'xpub1234567890abcdef' as CardanoBip32AccountProps['extendedAccountPublicKey'],
  },
});

const createHardwareAccount = (
  accountIdentifier: AccountId = accountId,
): HardwareWalletAccount<CardanoBip32AccountProps> => ({
  accountId: accountIdentifier,
  walletId,
  accountType: 'HardwareLedger',
  blockchainName: 'Cardano',
  networkType: 'mainnet',
  blockchainNetworkId: BlockchainNetworkId('cardano-mainnet'),
  metadata: { name: 'Hardware Account' },
  blockchainSpecific: {
    chainId,
    accountIndex: 0,
    extendedAccountPublicKey:
      'xpub1234567890abcdef' as CardanoBip32AccountProps['extendedAccountPublicKey'],
  },
});

const multiDelegationAccount = {
  account: createInMemoryAccount(accountId),
  utxos: Serializable.to(utxos),
  rewardAccounts: [
    {
      address: address0,
      rewardAccount: rewardAccount0,
      stakeKeyIndex: 0,
    },
    {
      address: address1,
      rewardAccount: rewardAccount1,
      stakeKeyIndex: 1,
    },
  ],
};

const actions = { ...migrateMultiDelegationActions };

const createMockTx = (cborValue = 'deadbeef'): Serialization.Transaction =>
  mock<Serialization.Transaction>({
    toCore: vi.fn().mockReturnValue({ id: 'tx-core' }),
    toCbor: vi.fn().mockReturnValue(cborValue),
  });

const createLogger = (): SideEffectDependencies['logger'] => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
});

const createMockSignerFactory = (
  signer: CardanoTransactionSigner,
): Mocked<SignerFactory> => ({
  canSign: vi.fn().mockReturnValue(true),
  createDataSigner: vi.fn(),
  createTransactionSigner: vi.fn().mockReturnValue(signer),
});

const createInMemoryWallet = (): InMemoryWallet =>
  mock<InMemoryWallet>({
    walletId,
    type: WalletType.InMemory,
    metadata: { name: 'Test Wallet', order: 0 },
    accounts: [],
    blockchainSpecific: {
      Cardano: { encryptedRootPrivateKey: 'encrypted-key' as HexBytes },
    } as unknown as InMemoryWallet['blockchainSpecific'],
  });

describe('migrate-multi-delegation side-effects', () => {
  beforeEach(() => {
    vi.spyOn(Serialization.Transaction, 'fromCbor').mockImplementation(cbor =>
      mock<Serialization.Transaction>({
        toCore: () => ({ id: `core-${cbor}` } as unknown as Cardano.Tx),
        toCbor: () => cbor as unknown as Serialization.TxCBOR,
      }),
    );
  });

  describe('buildMultidelegationMigrationTx', () => {
    const createMockBuilder = (): TransactionBuilder & {
      mockTx: Serialization.Transaction;
    } => {
      const mockTx = mock<Serialization.Transaction>({
        toCore: vi.fn().mockReturnValue({}),
        toCbor: vi.fn().mockReturnValue('cbor'),
      });

      return mock<TransactionBuilder & { mockTx: Serialization.Transaction }>({
        addInput: vi.fn().mockReturnThis(),
        addStakeDeregistrationCertificate: vi.fn().mockReturnThis(),
        addRewardsWithdrawal: vi.fn().mockReturnThis(),
        setChangeAddress: vi.fn().mockReturnThis(),
        build: vi.fn().mockReturnValue(mockTx),
        mockTx,
      });
    };

    it('builds tx with inputs, deregistration certs, withdrawals, and change address', () => {
      const mockBuilder = createMockBuilder();
      const logger = createLogger();

      const activeAccountInfo: RewardAccountInfo = {
        isActive: true,
        isRegistered: true,
        rewardsSum: BigNumber(100_000_000n),
        withdrawableAmount: BigNumber(50_000_000n),
        controlledAmount: BigNumber(500_000_000n),
      };

      const builderInput: [
        {
          builder: TransactionBuilder;
          protocolParameters: RequiredProtocolParameters;
        },
        Array<
          Result<
            RewardAccountInfo & { rewardAccount: Cardano.RewardAccount },
            never
          >
        >,
      ] = [
        { builder: mockBuilder, protocolParameters: mockProtocolParameters },
        [
          Ok({
            ...activeAccountInfo,
            rewardAccount: Cardano.RewardAccount(rewardAccount1),
          }),
        ],
      ];

      createTestScheduler().run(({ expectObservable }) => {
        const result$ = buildMultidelegationMigrationTx(
          multiDelegationAccount,
          { logger } as SideEffectDependencies,
          false,
        )(builderInput);

        expectObservable(result$).toBe('(a|)', { a: mockBuilder.mockTx });
      });

      expect(mockBuilder.addInput).toHaveBeenCalledTimes(2);
      expect(
        mockBuilder.addStakeDeregistrationCertificate,
      ).toHaveBeenCalledWith(
        {
          type: Cardano.CredentialType.KeyHash,
          hash: Cardano.RewardAccount.toHash(
            Cardano.RewardAccount(rewardAccount1),
          ),
        },
        BigInt(mockProtocolParameters.stakeKeyDeposit),
      );
      expect(mockBuilder.addRewardsWithdrawal).toHaveBeenCalledWith(
        Cardano.RewardAccount(rewardAccount1),
        50_000_000n,
      );
      expect(mockBuilder.setChangeAddress).toHaveBeenCalledWith(address0);
      expect(mockBuilder.build).toHaveBeenCalled();
    });

    it('skips withdrawal when withdrawable amount is 0', () => {
      const mockBuilder = createMockBuilder();
      const logger = createLogger();

      const accountInfoNoRewards: RewardAccountInfo = {
        isActive: true,
        isRegistered: true,
        rewardsSum: BigNumber(0n),
        withdrawableAmount: BigNumber(0n),
        controlledAmount: BigNumber(500_000_000n),
      };

      const builderInput: [
        {
          builder: TransactionBuilder;
          protocolParameters: RequiredProtocolParameters;
        },
        Array<
          Result<
            RewardAccountInfo & { rewardAccount: Cardano.RewardAccount },
            never
          >
        >,
      ] = [
        { builder: mockBuilder, protocolParameters: mockProtocolParameters },
        [
          Ok({
            ...accountInfoNoRewards,
            rewardAccount: Cardano.RewardAccount(rewardAccount1),
          }),
        ],
      ];

      createTestScheduler().run(({ expectObservable }) => {
        const result$ = buildMultidelegationMigrationTx(
          multiDelegationAccount,
          { logger } as SideEffectDependencies,
          false,
        )(builderInput);

        expectObservable(result$).toBe('(a|)', { a: mockBuilder.mockTx });
      });

      expect(
        mockBuilder.addStakeDeregistrationCertificate,
      ).toHaveBeenCalledTimes(1);
      expect(mockBuilder.addRewardsWithdrawal).not.toHaveBeenCalled();
    });

    it('returns EMPTY and logs error when any reward account info fetch fails', () => {
      const mockBuilder = createMockBuilder();
      const logger = createLogger();

      const providerError = new ProviderError(ProviderFailure.Unhealthy);

      const builderInput: [
        {
          builder: TransactionBuilder;
          protocolParameters: RequiredProtocolParameters;
        },
        Array<
          Result<
            RewardAccountInfo & { rewardAccount: Cardano.RewardAccount },
            ProviderError
          >
        >,
      ] = [
        { builder: mockBuilder, protocolParameters: mockProtocolParameters },
        [Err(providerError)],
      ];

      createTestScheduler().run(({ expectObservable }) => {
        const result$ = buildMultidelegationMigrationTx(
          multiDelegationAccount,
          { logger } as SideEffectDependencies,
          false,
        )(builderInput);

        expectObservable(result$).toBe('|');
      });

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch reward account info, try again later',
        providerError,
      );
    });
  });

  describe('makeCoordinateAccountMigrations', () => {
    it('calls migrateAccountFunction with payload and prevents concurrent migrations', () => {
      const migrationInProgress$ = new Subject<never>();
      const migrateAccountFunction = vi
        .fn()
        .mockReturnValue(() => migrationInProgress$);

      testSideEffect(
        makeCoordinateAccountMigrations({ migrateAccountFunction }),
        ({ cold, flush }) => ({
          actionObservables: {
            migrateMultiDelegation: {
              migrate$: cold('-ab', {
                a: actions.migrateMultiDelegation.migrate(
                  multiDelegationAccount,
                ),
                b: actions.migrateMultiDelegation.migrate(
                  multiDelegationAccount,
                ),
              }),
            },
          },
          stateObservables: {},
          dependencies: { actions },
          assertion: sideEffect$ => {
            sideEffect$.subscribe();
            flush();

            expect(migrateAccountFunction).toHaveBeenCalledWith(
              multiDelegationAccount,
            );
            expect(migrateAccountFunction).toHaveBeenCalledTimes(1);
          },
        }),
      );
    });
  });

  describe('makeMigrateAccount', () => {
    const createMockStateObservables = (hot: RunHelpers['hot']) => ({
      wallets: {
        selectWalletById$: hot('a', {
          a: () => createInMemoryWallet(),
        }),
      },
      addresses: {
        selectByAccountId$: hot('a', { a: () => [] }),
      },
      cardanoContext: {
        selectAllNetworkInfo$: hot('a', {
          a: {
            [multiDelegationAccount.account.blockchainNetworkId]: {
              protocolParameters: mockProtocolParameters,
            },
          },
        }),
        selectAccountUtxos$: hot('a', {
          a: { [accountId]: utxos },
        }),
        selectAccountUnspendableUtxos$: of({}),
      },
    });

    const createMockDependencies = () => ({
      logger: {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
        trace: vi.fn(),
      } as unknown as Mocked<Logger>,
      cardanoProvider: {
        getRewardAccountInfo: vi.fn().mockReturnValue(
          of(
            Ok({
              isActive: false,
              isRegistered: false,
              rewardsSum: BigNumber(0n),
              withdrawableAmount: BigNumber(0n),
              controlledAmount: BigNumber(0n),
            }),
          ),
        ),
      } as unknown as Mocked<CardanoProvider>,
      actions,
    });

    it('orchestrates build → sign → submit pipeline with signed emission', () => {
      const mockTx = createMockTx();
      const signedTxResult: SignTxResult = {
        tx: mockTx,
        chainId,
        hasCollateral: false,
      };

      const buildProjection = vi.fn().mockReturnValue(of(mockTx));
      const signProjection = vi
        .fn()
        .mockReturnValue(
          of<SignTxEmission>({ type: 'signed', result: signedTxResult }),
        );
      const submitProjection = vi.fn().mockReturnValue(EMPTY);

      const buildTxFunction = vi.fn().mockReturnValue(buildProjection);
      const signTxFunction = vi.fn().mockReturnValue(signProjection);
      const submitTxFunction = vi.fn().mockReturnValue(submitProjection);

      const migrateAccount = makeMigrateAccount({
        buildTxFn: buildTxFunction,
        signTxFn: signTxFunction,
        submitTxFn: submitTxFunction,
      });

      testSideEffect(
        migrateAccount(multiDelegationAccount),
        ({ hot, expectObservable, flush }) => ({
          actionObservables: {},
          stateObservables: createMockStateObservables(hot),
          dependencies: createMockDependencies(),
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('|');

            flush();

            expect(buildTxFunction).toHaveBeenCalledWith(
              multiDelegationAccount,
              expect.any(Object),
              false,
            );
            expect(buildProjection).toHaveBeenCalled();
            expect(signProjection).toHaveBeenCalled();
            expect(submitProjection).toHaveBeenCalledWith(signedTxResult);
          },
        }),
      );
    });

    it('passes through status action emissions from sign to the pipeline', () => {
      const mockTx = createMockTx();
      const hwSigningStartedAction =
        actions.migrateMultiDelegation.hwSigningStarted();

      const buildProjection = vi.fn().mockReturnValue(of(mockTx));
      const signProjection = vi.fn().mockReturnValue(
        of<SignTxEmission>({
          type: 'action',
          action: hwSigningStartedAction,
        }),
      );
      const submitProjection = vi.fn().mockReturnValue(EMPTY);

      const buildTxFunction = vi.fn().mockReturnValue(buildProjection);
      const signTxFunction = vi.fn().mockReturnValue(signProjection);
      const submitTxFunction = vi.fn().mockReturnValue(submitProjection);

      const migrateAccount = makeMigrateAccount({
        buildTxFn: buildTxFunction,
        signTxFn: signTxFunction,
        submitTxFn: submitTxFunction,
      });

      testSideEffect(
        migrateAccount(multiDelegationAccount),
        ({ hot, expectObservable, flush }) => ({
          actionObservables: {},
          stateObservables: createMockStateObservables(hot),
          dependencies: createMockDependencies(),
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(a|)', {
              a: hwSigningStartedAction,
            });
            flush();
            expect(submitProjection).not.toHaveBeenCalled();
          },
        }),
      );
    });

    it('completes when build projection returns EMPTY', () => {
      const buildProjection = vi.fn().mockReturnValue(EMPTY);
      const signProjection = vi.fn().mockReturnValue(EMPTY);
      const submitProjection = vi.fn().mockReturnValue(EMPTY);

      const buildTxFunction = vi.fn().mockReturnValue(buildProjection);
      const signTxFunction = vi.fn().mockReturnValue(signProjection);
      const submitTxFunction = vi.fn().mockReturnValue(submitProjection);

      const migrateAccount = makeMigrateAccount({
        buildTxFn: buildTxFunction,
        signTxFn: signTxFunction,
        submitTxFn: submitTxFunction,
      });

      testSideEffect(
        migrateAccount(multiDelegationAccount),
        ({ hot, expectObservable, flush }) => ({
          actionObservables: {},
          stateObservables: createMockStateObservables(hot),
          dependencies: createMockDependencies(),
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('|');
            flush();
            expect(buildProjection).toHaveBeenCalled();
            expect(signProjection).not.toHaveBeenCalled();
            expect(submitProjection).not.toHaveBeenCalled();
          },
        }),
      );
    });
  });

  describe('signTx', () => {
    const createInMemoryAccountContext = (
      hot: RunHelpers['hot'],
    ): AccountContext => ({
      account: createInMemoryAccount(accountId),
      wallet$: hot('a', { a: createInMemoryWallet() }),
      accountAddresses$: hot('a', { a: [] }),
      accountUtxo$: hot('a', { a: utxos }),
    });

    const createHardwareAccountContext = (
      hot: RunHelpers['hot'],
    ): AccountContext => ({
      account: createHardwareAccount(),
      wallet$: hot('a', {
        a: mock<InMemoryWallet>({
          walletId,
          type: WalletType.HardwareLedger as unknown as WalletType.InMemory,
          metadata: { name: 'Test Wallet', order: 0 },
          accounts: [],
          blockchainSpecific: {} as InMemoryWallet['blockchainSpecific'],
        }),
      }),
      accountAddresses$: hot('a', { a: [] }),
      accountUtxo$: hot('a', { a: utxos }),
    });

    const buildDeps = (
      signer: CardanoTransactionSigner,
      logger = createLogger(),
    ) =>
      ({
        logger,
        actions,
        accessAuthSecret: vi.fn(),
        authenticate: vi.fn(),
        signerFactory: createMockSignerFactory(signer),
      } as never);

    it('InMemory: emits single signed result (no hwSigningStarted)', () => {
      const mockTx = createMockTx('deadbeef');
      const signer: CardanoTransactionSigner = {
        sign: vi.fn().mockReturnValue(
          of({
            serializedTx: HexBytes('cafebabe'),
            signatureCount: 1,
          }),
        ),
      };

      createTestScheduler().run(({ hot, expectObservable }) => {
        const accountContext = createInMemoryAccountContext(hot);
        const result$ = signTx(
          accountContext,
          buildDeps(signer),
          false,
        )(mockTx);

        expectObservable(result$).toBe('(a|)', {
          a: expect.objectContaining({
            type: 'signed',
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            result: expect.objectContaining({
              chainId,
              hasCollateral: false,
            }),
          }) as unknown as SignTxEmission,
        });
      });

      expect(signer.sign).toHaveBeenCalledWith({
        serializedTx: HexBytes('deadbeef'),
      });
    });

    it('HW: emits hwSigningStarted then signed result', () => {
      const mockTx = createMockTx('deadbeef');
      const signer: CardanoTransactionSigner = {
        sign: vi.fn().mockReturnValue(
          of({
            serializedTx: HexBytes('cafebabe'),
            signatureCount: 1,
          }),
        ),
      };

      createTestScheduler().run(({ hot, expectObservable }) => {
        const accountContext = createHardwareAccountContext(hot);
        const result$ = signTx(accountContext, buildDeps(signer), true)(mockTx);

        expectObservable(result$).toBe('(ab|)', {
          a: {
            type: 'action',
            action: actions.migrateMultiDelegation.hwSigningStarted(),
          },
          b: expect.objectContaining({
            type: 'signed',
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            result: expect.objectContaining({
              chainId,
              hasCollateral: true,
            }),
          }) as unknown as SignTxEmission,
        });
      });
    });

    it('HW error: emits hwSigningStarted then hwSigningFailed with mapped keys', () => {
      const mockTx = createMockTx('deadbeef');
      const signer: CardanoTransactionSigner = {
        sign: vi
          .fn()
          .mockReturnValue(
            throwError(() => new Error('cardano app not opened')),
          ),
      };
      const logger = createLogger();

      createTestScheduler().run(({ hot, expectObservable }) => {
        const accountContext = createHardwareAccountContext(hot);
        const result$ = signTx(
          accountContext,
          buildDeps(signer, logger),
          false,
        )(mockTx);

        expectObservable(result$).toBe('(ab|)', {
          a: {
            type: 'action',
            action: actions.migrateMultiDelegation.hwSigningStarted(),
          },
          b: {
            type: 'action',
            action: actions.migrateMultiDelegation.hwSigningFailed({
              errorTranslationKeys: {
                title: 'hw-error.app-not-open.title',
                subtitle: 'hw-error.app-not-open.subtitle',
              },
            }),
          },
        });
      });

      expect(logger.warn).toHaveBeenCalled();
    });

    it('InMemory error: completes silently with EMPTY', () => {
      const mockTx = createMockTx('deadbeef');
      const signer: CardanoTransactionSigner = {
        sign: vi
          .fn()
          .mockReturnValue(throwError(() => new Error('auth cancelled'))),
      };
      const logger = createLogger();

      createTestScheduler().run(({ hot, expectObservable }) => {
        const accountContext = createInMemoryAccountContext(hot);
        const result$ = signTx(
          accountContext,
          buildDeps(signer, logger),
          false,
        )(mockTx);

        expectObservable(result$).toBe('|');
      });

      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('submitTx', () => {
    const resetAction = actions.migrateMultiDelegation.reset();

    it('emits reset after successful submission', () => {
      const logger = createLogger();
      const mockTx = createMockTx();
      const txId = 'submitted-tx-id';

      const input: SignTxResult = {
        tx: mockTx,
        chainId,
        hasCollateral: false,
      };

      const mockSubmitTx = vi.fn().mockReturnValue(of(Ok(txId)));

      createTestScheduler().run(({ expectObservable }) => {
        const result$ = submitTx({
          logger,
          actions,
          cardanoProvider: { submitTx: mockSubmitTx },
        } as never)(input);

        expectObservable(result$).toBe('(a|)', { a: resetAction });
      });

      expect(mockSubmitTx).toHaveBeenCalledWith(
        { signedTransaction: 'deadbeef' },
        { chainId },
      );
      expect(logger.debug).toHaveBeenCalled();
    });

    it('emits reset and logs a warning when submission fails', () => {
      const logger = createLogger();
      const mockTx = createMockTx();
      const submitError = new ProviderError(ProviderFailure.Unhealthy);

      const input: SignTxResult = {
        tx: mockTx,
        chainId,
        hasCollateral: false,
      };

      const mockSubmitTx = vi.fn().mockReturnValue(of(Err(submitError)));

      createTestScheduler().run(({ expectObservable }) => {
        const result$ = submitTx({
          logger,
          actions,
          cardanoProvider: { submitTx: mockSubmitTx },
        } as never)(input);

        expectObservable(result$).toBe('(a|)', { a: resetAction });
      });

      expect(logger.warn).toHaveBeenCalled();
    });
  });
});
