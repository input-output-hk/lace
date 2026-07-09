import {
  Cardano,
  ProviderError,
  ProviderFailure,
  Serialization,
} from '@cardano-sdk/core';
import { createTestScheduler } from '@cardano-sdk/util-dev';
import {
  CardanoRewardAccount,
  COLLATERAL_AMOUNT_LOVELACES,
} from '@lace-contract/cardano-context';
import { BlockchainNetworkId } from '@lace-contract/network';
import { AccountId, WalletId, WalletType } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { Serializable } from '@lace-lib/util-store';
import { BigNumber, HexBytes, Ok, Err } from '@lace-sdk/util';
import { EMPTY, map, of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  awaitAndMarkCollateral,
  buildMultidelegationMigrationTx,
  buildVoteDelegationTx,
  createAccountObservables,
  createBuilder$,
  createProviderContext,
  fetchSecondaryAccountsInfo$,
  makeCoordinateAccountMigrations,
  makeMigrateAccount,
  makePrepareVoteDelegation,
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
import type { Address, AnyAddress } from '@lace-contract/addresses';
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
const address0 = Cardano.PaymentAddress(
  'addr1q96l79jg5ahsrkfyrprs9eaaek0g0tfg3m4tln0vkmq29m8gnpz7wtsycpytk4tn3fe85fqhw7enll66ud9ex6yeu4wqgwfsph',
);
const address1 = Cardano.PaymentAddress(
  'addr1qysyd4huaa8fppt5800gy6vjqacn29ce6vske9yz7mpvckajqlxgz8pdfj4uqfny4f72llspljpmvcx0wdsh8punfjzqwzpctq',
);

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
        getId: vi
          .fn()
          .mockReturnValue(`mock-tx-id-${cbor}` as Cardano.TransactionId),
        toCore: () =>
          ({
            body: { inputs: [], outputs: [] },
          } as unknown as Cardano.Tx),
        toCbor: () => cbor as unknown as Serialization.TxCBOR,
      }),
    );
  });

  describe('createBuilder$', () => {
    it('emits builder and protocol parameters when network info is available', () => {
      createTestScheduler().run(({ hot, expectObservable, flush }) => {
        const selectAllNetworkInfo$ = hot('a', {
          a: {
            [multiDelegationAccount.account.blockchainNetworkId]: {
              protocolParameters: mockProtocolParameters,
            },
          },
        });

        const result$ = createBuilder$(
          multiDelegationAccount,
          selectAllNetworkInfo$,
        );

        expectObservable(result$).toBe('a', {
          a: expect.objectContaining({
            protocolParameters: mockProtocolParameters,
          }),
        } as Record<string, unknown>);
        flush();
      });
    });

    it('filters out emissions without protocol parameters', () => {
      createTestScheduler().run(({ hot, expectObservable }) => {
        const selectAllNetworkInfo$ = hot('a-b', {
          a: {},
          b: {
            [multiDelegationAccount.account.blockchainNetworkId]: {
              protocolParameters: mockProtocolParameters,
            },
          },
        });

        const result$ = createBuilder$(
          multiDelegationAccount,
          selectAllNetworkInfo$,
        );

        // First emission (no params) is filtered, second passes at frame 2
        expectObservable(result$.pipe(map(() => 'x'))).toBe('--x');
      });
    });
  });

  describe('createProviderContext', () => {
    it('returns provider context with chainId from account', () => {
      const result = createProviderContext(multiDelegationAccount);

      expect(result).toEqual({ chainId });
    });
  });

  describe('fetchSecondaryAccountsInfo$', () => {
    it('fetches reward account info for secondary keys only', () => {
      const rewardAccountInfo: RewardAccountInfo = {
        isActive: true,
        isRegistered: true,
        rewardsSum: BigNumber(100_000_000n),
        withdrawableAmount: BigNumber(50_000_000n),
        controlledAmount: BigNumber(500_000_000n),
      };
      const mockGetRewardAccountInfo = vi
        .fn()
        .mockReturnValue(of(Ok(rewardAccountInfo)));

      createTestScheduler().run(({ expectObservable, flush }) => {
        const result$ = fetchSecondaryAccountsInfo$(
          multiDelegationAccount,
          { chainId },
          { getRewardAccountInfo: mockGetRewardAccountInfo } as never,
        );

        // combineLatest over of() completes synchronously
        expectObservable(result$).toBe('(x|)', {
          x: [
            Ok({
              ...rewardAccountInfo,
              rewardAccount: Cardano.RewardAccount(rewardAccount1),
            }),
          ],
        });
        flush();
      });

      // Only called for stakeKeyIndex > 0
      expect(mockGetRewardAccountInfo).toHaveBeenCalledTimes(1);
      expect(mockGetRewardAccountInfo).toHaveBeenCalledWith(
        { rewardAccount: rewardAccount1 },
        { chainId },
      );
    });

    it('propagates provider errors in results', () => {
      const providerError = new ProviderError(ProviderFailure.Unhealthy);
      const mockGetRewardAccountInfo = vi
        .fn()
        .mockReturnValue(of(Err(providerError)));

      createTestScheduler().run(({ expectObservable, flush }) => {
        const result$ = fetchSecondaryAccountsInfo$(
          multiDelegationAccount,
          { chainId },
          { getRewardAccountInfo: mockGetRewardAccountInfo } as never,
        );

        // Emits and completes synchronously even with error results
        expectObservable(
          result$.pipe(map(results => (results[0].isErr() ? 'err' : 'ok'))),
        ).toBe('(a|)', { a: 'err' });
        flush();
      });
    });
  });

  describe('createAccountObservables', () => {
    it('derives wallet$, accountAddresses$, and accountUtxo$ from state selectors', () => {
      createTestScheduler().run(({ hot, expectObservable }) => {
        const mockWallet = mock<InMemoryWallet>({
          type: WalletType.InMemory,
          walletId,
          metadata: { name: 'Test Wallet', order: 0 },
          accounts: [],
          blockchainSpecific: {
            Cardano: { encryptedRootPrivateKey: 'key' as HexBytes },
          },
        });

        const { wallet$, accountAddresses$, accountUtxo$ } =
          createAccountObservables({
            multiDelegationAccount,
            selectWalletById$: hot('a', {
              a: () => mockWallet,
            }),
            selectByAccountId$: hot('a', { a: () => [] }),
            selectAvailableAccountUtxos$: hot('a', {
              a: { [accountId]: utxos },
            }),
          });

        expectObservable(wallet$).toBe('a', { a: mockWallet });
        expectObservable(accountAddresses$).toBe('a', { a: [] });
        expectObservable(accountUtxo$).toBe('a', { a: utxos });
      });
    });

    it('filters out undefined wallet', () => {
      createTestScheduler().run(({ hot, expectObservable }) => {
        const mockWallet = mock<InMemoryWallet>({
          type: WalletType.InMemory,
          walletId,
          metadata: { name: 'Test Wallet', order: 0 },
          accounts: [],
          blockchainSpecific: {
            Cardano: { encryptedRootPrivateKey: 'key' as HexBytes },
          },
        });

        const { wallet$ } = createAccountObservables({
          multiDelegationAccount,
          selectWalletById$: hot('a-b', {
            a: () => undefined,
            b: () => mockWallet,
          }),
          selectByAccountId$: hot('a', { a: () => [] }),
          selectAvailableAccountUtxos$: hot('a', { a: { [accountId]: utxos } }),
        });

        expectObservable(wallet$.pipe(map(() => 'x'))).toBe('--x');
      });
    });

    it('filters out undefined utxos for account', () => {
      createTestScheduler().run(({ hot, expectObservable }) => {
        const { accountUtxo$ } = createAccountObservables({
          multiDelegationAccount,
          selectWalletById$: hot('a', {
            a: () =>
              mock<InMemoryWallet>({
                type: WalletType.InMemory,
                walletId,
              }),
          }),
          selectByAccountId$: hot('a', { a: () => [] }),
          selectAvailableAccountUtxos$: hot('a-b', {
            a: {},
            b: { [accountId]: utxos },
          }),
        });

        expectObservable(accountUtxo$).toBe('--a', { a: utxos });
      });
    });

    it('maps Cardano addresses to GroupedAddress objects', () => {
      const cardanoAddress: AnyAddress = {
        blockchainName: 'Cardano',
        accountId,
        address: address0 as unknown as Address,
        name: 'payment/0',
        data: {
          accountIndex: 0,
          index: 0,
          networkId: Cardano.NetworkId.Mainnet,
          rewardAccount: rewardAccount0,
          networkMagic: chainId.networkMagic,
          type: Cardano.AddressType.EnterpriseKey,
          stakeKeyDerivationPath: undefined,
        },
      };

      createTestScheduler().run(({ hot, expectObservable }) => {
        const { accountAddresses$ } = createAccountObservables({
          multiDelegationAccount,
          selectWalletById$: hot('a', {
            a: () => mock<InMemoryWallet>({ walletId }),
          }),
          selectByAccountId$: hot('a', { a: () => [cardanoAddress] }),
          selectAvailableAccountUtxos$: hot('a', { a: { [accountId]: utxos } }),
        });

        expectObservable(accountAddresses$).toBe('a', {
          a: [
            {
              accountIndex: 0,
              address: address0,
              index: 0,
              networkId: Cardano.NetworkId.Mainnet,
              rewardAccount: Cardano.RewardAccount(rewardAccount0),
              type: Cardano.AddressType.EnterpriseKey,
              stakeKeyDerivationPath: undefined,
            },
          ],
        });
      });
    });
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
        addOutput: vi.fn().mockReturnThis(),
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
        Cardano.Utxo[],
      ] = [
        { builder: mockBuilder, protocolParameters: mockProtocolParameters },
        [
          Ok({
            ...activeAccountInfo,
            rewardAccount: Cardano.RewardAccount(rewardAccount1),
          }),
        ],
        utxos,
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
        Cardano.Utxo[],
      ] = [
        { builder: mockBuilder, protocolParameters: mockProtocolParameters },
        [
          Ok({
            ...accountInfoNoRewards,
            rewardAccount: Cardano.RewardAccount(rewardAccount1),
          }),
        ],
        utxos,
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

    it('adds collateral output when hasCollateral is true', () => {
      const mockBuilder = createMockBuilder();
      const logger = createLogger();

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
        Cardano.Utxo[],
      ] = [
        { builder: mockBuilder, protocolParameters: mockProtocolParameters },
        [
          Ok({
            isActive: true,
            isRegistered: false,
            rewardsSum: BigNumber(0n),
            withdrawableAmount: BigNumber(0n),
            controlledAmount: BigNumber(0n),
            rewardAccount: Cardano.RewardAccount(rewardAccount1),
          }),
        ],
        utxos,
      ];

      createTestScheduler().run(({ expectObservable }) => {
        const result$ = buildMultidelegationMigrationTx(
          multiDelegationAccount,
          { logger } as SideEffectDependencies,
          true,
        )(builderInput);

        expectObservable(result$).toBe('(a|)', { a: mockBuilder.mockTx });
      });

      expect(mockBuilder.addOutput).toHaveBeenCalledWith({
        address: address0,
        value: { coins: BigInt(COLLATERAL_AMOUNT_LOVELACES) },
      });
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
        Cardano.Utxo[],
      ] = [
        { builder: mockBuilder, protocolParameters: mockProtocolParameters },
        [Err(providerError)],
        utxos,
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

  describe('awaitAndMarkCollateral', () => {
    const collateralUtxo = createUtxo(address0);

    it('emits setAccountUnspendableUtxos action when eligible collateral UTXO appears', () => {
      const logger = createLogger();
      const expectedAction = actions.migrateMultiDelegation.hwSigningStarted();
      const setAccountUnspendableUtxos = vi
        .fn()
        .mockReturnValue(expectedAction);

      createTestScheduler().run(({ hot, expectObservable }) => {
        const result$ = awaitAndMarkCollateral({
          accountId,
          selectAccountUtxos$: hot('a', {
            a: { [accountId]: [collateralUtxo] },
          }),
          setAccountUnspendableUtxos,
          logger,
        });

        expectObservable(result$).toBe('(a|)', { a: expectedAction });
      });

      expect(setAccountUnspendableUtxos).toHaveBeenCalledWith({
        accountId,
        utxos: [collateralUtxo],
      });
    });

    it('completes with no emission after 120 s when no eligible UTXO appears', () => {
      const logger = createLogger();
      const ineligibleUtxo: Cardano.Utxo = [
        { txId: 'tx-no-collateral' as Cardano.TransactionId, index: 0 },
        { address: address0, value: { coins: 1_000_000n } },
      ] as Cardano.Utxo;
      const setAccountUnspendableUtxos = vi.fn();

      createTestScheduler().run(({ hot, expectObservable }) => {
        const result$ = awaitAndMarkCollateral({
          accountId,
          selectAccountUtxos$: hot('a', {
            a: { [accountId]: [ineligibleUtxo] },
          }),
          setAccountUnspendableUtxos,
          logger,
        });

        expectObservable(result$).toBe('120000ms |');
      });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Timeout'),
      );
      expect(setAccountUnspendableUtxos).not.toHaveBeenCalled();
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
        selectAvailableAccountUtxos$: hot('a', {
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
        accountId,
        accountAddresses: [],
        accountUtxos: [],
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

    it('when account has collateral, spends old collateral as tx input and marks new collateral as unspendable', () => {
      const oldCollateralUtxo: Cardano.Utxo = [
        { txId: 'old-collateral-tx' as Cardano.TransactionId, index: 0 },
        {
          address: address1,
          value: { coins: BigInt(COLLATERAL_AMOUNT_LOVELACES) },
        },
      ] as Cardano.Utxo;

      // Simulates the collateral output created by the migration tx appearing on chain.
      // Has a distinct txId so we can assert it — not the old one — gets marked.
      const newCollateralUtxo: Cardano.Utxo = [
        { txId: 'new-collateral-tx' as Cardano.TransactionId, index: 0 },
        {
          address: address0,
          value: { coins: BigInt(COLLATERAL_AMOUNT_LOVELACES) },
        },
      ] as Cardano.Utxo;

      const mockTx = createMockTx();
      const signedTxResult: SignTxResult = {
        tx: mockTx,
        chainId,
        hasCollateral: true,
        accountId,
        accountAddresses: [],
        accountUtxos: [],
      };

      let capturedBuildUtxos: Cardano.Utxo[] | undefined;
      const buildProjection = vi
        .fn()
        .mockImplementation(
          ([, , buildUtxos]: [unknown, unknown, Cardano.Utxo[]]) => {
            capturedBuildUtxos = buildUtxos;
            return of(mockTx);
          },
        );

      const signProjection = vi
        .fn()
        .mockReturnValue(
          of<SignTxEmission>({ type: 'signed', result: signedTxResult }),
        );

      const setAccountUnspendableUtxos = vi.fn().mockReturnValue({
        type: 'cardanoContext/setAccountUnspendableUtxos',
      });

      const migrateAccount = makeMigrateAccount({
        buildTxFn: vi.fn().mockReturnValue(buildProjection),
        signTxFn: vi.fn().mockReturnValue(signProjection),
        submitTxFn: submitTx,
      });

      const stateObservables = {
        wallets: { selectWalletById$: of(() => createInMemoryWallet()) },
        addresses: { selectByAccountId$: of(() => [] as AnyAddress[]) },
        cardanoContext: {
          selectAllNetworkInfo$: of({
            [multiDelegationAccount.account.blockchainNetworkId]: {
              protocolParameters: mockProtocolParameters,
            },
          }),
          selectAccountUtxos$: of({ [accountId]: [oldCollateralUtxo] }),
          // Available UTXOs contain the new collateral output (simulating the
          // post-confirmation state where the migration tx output is visible).
          selectAvailableAccountUtxos$: of({
            [accountId]: [newCollateralUtxo],
          }),
          // Old collateral is currently unspendable → hasCollateral = true
          selectAccountUnspendableUtxos$: of({
            [accountId]: [oldCollateralUtxo],
          }),
        },
      };

      const sideEffect = migrateAccount(multiDelegationAccount);
      const deps = {
        ...createMockDependencies(),
        actions: {
          ...actions,
          activities: { upsertActivities: vi.fn() },
          cardanoContext: { setAccountUnspendableUtxos },
        },
        cardanoProvider: {
          ...createMockDependencies().cardanoProvider,
          submitTx: vi.fn().mockReturnValue(of(Ok('tx-hash'))),
        },
      };

      sideEffect(
        {} as Parameters<typeof sideEffect>[0],
        stateObservables as unknown as Parameters<typeof sideEffect>[1],
        deps as unknown as Parameters<typeof sideEffect>[2],
      ).subscribe();

      // Old collateral must be included as a tx input so it is spent, not stranded.
      expect(capturedBuildUtxos).toContainEqual(oldCollateralUtxo);
      // Regular available UTXOs are also included.
      expect(capturedBuildUtxos).toContainEqual(newCollateralUtxo);

      // The new collateral UTXO (from selectAvailableAccountUtxos$) must be
      // marked as unspendable — not the old one.
      expect(setAccountUnspendableUtxos).toHaveBeenCalledWith({
        accountId,
        utxos: [newCollateralUtxo],
      });
      expect(setAccountUnspendableUtxos).not.toHaveBeenCalledWith({
        accountId,
        utxos: [oldCollateralUtxo],
      });
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
        accountId,
        accountAddresses: [],
        accountUtxos: [],
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
        accountId,
        accountAddresses: [],
        accountUtxos: [],
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

  describe('buildVoteDelegationTx', () => {
    const createMockBuilder = (): TransactionBuilder & {
      mockTx: Serialization.Transaction;
    } => {
      const mockTx = mock<Serialization.Transaction>({
        toCore: vi.fn().mockReturnValue({}),
        toCbor: vi.fn().mockReturnValue('cbor'),
      });

      return mock<TransactionBuilder & { mockTx: Serialization.Transaction }>({
        setUnspentOutputs: vi.fn().mockReturnThis(),
        addVoteDelegationCertificate: vi.fn().mockReturnThis(),
        setChangeAddress: vi.fn().mockReturnThis(),
        build: vi.fn().mockReturnValue(mockTx),
        mockTx,
      });
    };

    it('builds tx with vote delegation certificates and coin selection', () => {
      const mockBuilder = createMockBuilder();

      const affectedKeys = [
        {
          isActive: true,
          isRegistered: true,
          rewardsSum: BigNumber(100_000_000n),
          withdrawableAmount: BigNumber(50_000_000n),
          controlledAmount: BigNumber(500_000_000n),
          rewardAccount: Cardano.RewardAccount(rewardAccount1),
        },
      ];

      createTestScheduler().run(({ expectObservable }) => {
        const result$ = buildVoteDelegationTx(
          multiDelegationAccount,
          affectedKeys,
        )([
          { builder: mockBuilder, protocolParameters: mockProtocolParameters },
          utxos,
        ]);

        expectObservable(result$).toBe('(a|)', { a: mockBuilder.mockTx });
      });

      // Uses coin selection, not addInput
      expect(mockBuilder.setUnspentOutputs).toHaveBeenCalledWith(utxos);

      // Vote delegation certificate with AlwaysAbstain
      expect(mockBuilder.addVoteDelegationCertificate).toHaveBeenCalledWith(
        {
          type: Cardano.CredentialType.KeyHash,
          hash: Cardano.RewardAccount.toHash(
            Cardano.RewardAccount(rewardAccount1),
          ),
        },
        { __typename: 'AlwaysAbstain' },
      );

      // Change address is primary (stakeKeyIndex 0)
      expect(mockBuilder.setChangeAddress).toHaveBeenCalledWith(address0);
      expect(mockBuilder.build).toHaveBeenCalled();
    });
  });

  describe('makePrepareVoteDelegation', () => {
    const createMockStateObservables = (hot: RunHelpers['hot']) => ({
      wallets: {
        selectWalletById$: hot('a', {
          a: () =>
            ({
              type: WalletType.InMemory,
              metadata: { name: 'Test Wallet', order: 0 },
              walletId,
              accounts: [] as InMemoryWalletAccount[],
              blockchainSpecific: {
                Cardano: { encryptedRootPrivateKey: 'key' as HexBytes },
              },
            } as InMemoryWallet),
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
        selectAvailableAccountUtxos$: hot('a', {
          a: { [accountId]: utxos },
        }),
      },
    });

    const createPrepareVoteDelegationDependencies = () => {
      const logger = createLogger();
      const deps = {
        logger,
        actions,
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
          submitTx: vi.fn().mockReturnValue(of(Ok('tx-id'))),
        },
      };
      return deps;
    };

    const mockBuildVoteDelegationTxFunction: typeof buildVoteDelegationTx =
      () => () =>
        of(createMockTx());

    const mockSignTxFunction: typeof signTx = () => () =>
      of<SignTxEmission>({
        type: 'signed',
        result: {
          tx: createMockTx(),
          chainId,
          hasCollateral: false,
          accountId,
          accountAddresses: [],
          accountUtxos: [],
        },
      });

    it('dispatches migrate immediately when no vote delegation needed (all have drepId)', () => {
      const deps = createPrepareVoteDelegationDependencies();
      deps.cardanoProvider.getRewardAccountInfo.mockReturnValue(
        of(
          Ok({
            isActive: true,
            isRegistered: true,
            drepId: 'drep1existing',
            rewardsSum: BigNumber(100_000_000n),
            withdrawableAmount: BigNumber(50_000_000n),
            controlledAmount: BigNumber(500_000_000n),
          }),
        ),
      );

      testSideEffect(
        makePrepareVoteDelegation({
          buildVoteDelegationTxFn: mockBuildVoteDelegationTxFunction,
          signTxFn: mockSignTxFunction,
        }),
        ({ cold, flush }) => ({
          actionObservables: {
            migrateMultiDelegation: {
              startMigration$: cold('-a', {
                a: actions.migrateMultiDelegation.startMigration(
                  multiDelegationAccount,
                ),
              }),
            },
          },
          stateObservables: createMockStateObservables(
            cold as unknown as RunHelpers['hot'],
          ),
          dependencies: deps as never,
          assertion: sideEffect$ => {
            const emissions: unknown[] = [];
            sideEffect$.subscribe(a => emissions.push(a));
            flush();

            expect(emissions).toHaveLength(1);
            expect(emissions[0]).toEqual(
              actions.migrateMultiDelegation.migrate(multiDelegationAccount),
            );
            // No submission happened
            expect(deps.cardanoProvider.submitTx).not.toHaveBeenCalled();
          },
        }),
      );
    });

    it('dispatches migrate immediately when withdrawableAmount is 0', () => {
      const deps = createPrepareVoteDelegationDependencies();
      deps.cardanoProvider.getRewardAccountInfo.mockReturnValue(
        of(
          Ok({
            isActive: true,
            isRegistered: true,
            // No drepId, but no rewards to withdraw
            rewardsSum: BigNumber(0n),
            withdrawableAmount: BigNumber(0n),
            controlledAmount: BigNumber(500_000_000n),
          }),
        ),
      );

      testSideEffect(
        makePrepareVoteDelegation({
          buildVoteDelegationTxFn: mockBuildVoteDelegationTxFunction,
          signTxFn: mockSignTxFunction,
        }),
        ({ cold, flush }) => ({
          actionObservables: {
            migrateMultiDelegation: {
              startMigration$: cold('-a', {
                a: actions.migrateMultiDelegation.startMigration(
                  multiDelegationAccount,
                ),
              }),
            },
          },
          stateObservables: createMockStateObservables(
            cold as unknown as RunHelpers['hot'],
          ),
          dependencies: deps as never,
          assertion: sideEffect$ => {
            const emissions: unknown[] = [];
            sideEffect$.subscribe(a => emissions.push(a));
            flush();

            expect(emissions).toHaveLength(1);
            expect(emissions[0]).toEqual(
              actions.migrateMultiDelegation.migrate(multiDelegationAccount),
            );
            expect(deps.cardanoProvider.submitTx).not.toHaveBeenCalled();
          },
        }),
      );
    });

    const hwMultiDelegationAccount = {
      ...multiDelegationAccount,
      account: createHardwareAccount(),
    };

    it('HW: device confirms, submit succeeds → emits hwSigningStarted then migrate', () => {
      const deps = createDepsNeedingVoteDelegation();

      const hwSignTxSuccess: typeof signTx = () => () => {
        const started: SignTxEmission = {
          type: 'action',
          action: actions.migrateMultiDelegation.hwSigningStarted(),
        };
        const signed: SignTxEmission = {
          type: 'signed',
          result: {
            tx: createMockTx(),
            chainId,
            hasCollateral: false,
            accountId,
            accountAddresses: [],
            accountUtxos: [],
          },
        };
        return of(started, signed);
      };

      testSideEffect(
        makePrepareVoteDelegation({
          buildVoteDelegationTxFn: mockBuildVoteDelegationTxFunction,
          signTxFn: hwSignTxSuccess,
        }),
        ({ cold, flush }) => ({
          actionObservables: {
            migrateMultiDelegation: {
              startMigration$: cold('-a', {
                a: actions.migrateMultiDelegation.startMigration(
                  hwMultiDelegationAccount,
                ),
              }),
            },
          },
          stateObservables: createMockStateObservables(
            cold as unknown as RunHelpers['hot'],
          ),
          dependencies: deps as never,
          assertion: sideEffect$ => {
            const emissions: unknown[] = [];
            sideEffect$.subscribe(a => emissions.push(a));
            flush();

            expect(deps.cardanoProvider.submitTx).toHaveBeenCalled();
            expect(emissions).toHaveLength(2);
            expect(emissions[0]).toEqual(
              actions.migrateMultiDelegation.hwSigningStarted(),
            );
            expect(emissions[1]).toEqual(
              actions.migrateMultiDelegation.migrate(hwMultiDelegationAccount),
            );
          },
        }),
      );
    });

    it('HW: device rejects → emits hwSigningStarted then hwSigningFailed', () => {
      const deps = createDepsNeedingVoteDelegation();
      const errorTranslationKeys = {
        title: 'hw-error.app-not-open.title',
        subtitle: 'hw-error.app-not-open.subtitle',
      } as const;

      const hwSignTxRejected: typeof signTx = () => () => {
        const started: SignTxEmission = {
          type: 'action',
          action: actions.migrateMultiDelegation.hwSigningStarted(),
        };
        const failed: SignTxEmission = {
          type: 'action',
          action: actions.migrateMultiDelegation.hwSigningFailed({
            errorTranslationKeys,
          }),
        };
        return of(started, failed);
      };

      testSideEffect(
        makePrepareVoteDelegation({
          buildVoteDelegationTxFn: mockBuildVoteDelegationTxFunction,
          signTxFn: hwSignTxRejected,
        }),
        ({ cold, flush }) => ({
          actionObservables: {
            migrateMultiDelegation: {
              startMigration$: cold('-a', {
                a: actions.migrateMultiDelegation.startMigration(
                  hwMultiDelegationAccount,
                ),
              }),
            },
          },
          stateObservables: createMockStateObservables(
            cold as unknown as RunHelpers['hot'],
          ),
          dependencies: deps as never,
          assertion: sideEffect$ => {
            const emissions: unknown[] = [];
            sideEffect$.subscribe(a => emissions.push(a));
            flush();

            expect(deps.cardanoProvider.submitTx).not.toHaveBeenCalled();
            expect(emissions).toHaveLength(2);
            expect(emissions[0]).toEqual(
              actions.migrateMultiDelegation.hwSigningStarted(),
            );
            expect(emissions[1]).toEqual(
              actions.migrateMultiDelegation.hwSigningFailed({
                errorTranslationKeys,
              }),
            );
          },
        }),
      );
    });

    it('HW: device confirms but submit fails → emits hwSigningStarted then reset', () => {
      const deps = createDepsNeedingVoteDelegation();
      deps.cardanoProvider.submitTx.mockReturnValue(
        of(Err(new ProviderError(ProviderFailure.Unhealthy))),
      );

      const hwSignTxSuccess: typeof signTx = () => () => {
        const started: SignTxEmission = {
          type: 'action',
          action: actions.migrateMultiDelegation.hwSigningStarted(),
        };
        const signed: SignTxEmission = {
          type: 'signed',
          result: {
            tx: createMockTx(),
            chainId,
            hasCollateral: false,
            accountId,
            accountAddresses: [],
            accountUtxos: [],
          },
        };
        return of(started, signed);
      };

      testSideEffect(
        makePrepareVoteDelegation({
          buildVoteDelegationTxFn: mockBuildVoteDelegationTxFunction,
          signTxFn: hwSignTxSuccess,
        }),
        ({ cold, flush }) => ({
          actionObservables: {
            migrateMultiDelegation: {
              startMigration$: cold('-a', {
                a: actions.migrateMultiDelegation.startMigration(
                  hwMultiDelegationAccount,
                ),
              }),
            },
          },
          stateObservables: createMockStateObservables(
            cold as unknown as RunHelpers['hot'],
          ),
          dependencies: deps as never,
          assertion: sideEffect$ => {
            const emissions: unknown[] = [];
            sideEffect$.subscribe(a => emissions.push(a));
            flush();

            expect(deps.cardanoProvider.submitTx).toHaveBeenCalled();
            expect(deps.logger.warn).toHaveBeenCalledWith(
              expect.stringContaining('submit vote delegation'),
            );
            expect(emissions).toHaveLength(2);
            expect(emissions[0]).toEqual(
              actions.migrateMultiDelegation.hwSigningStarted(),
            );
            expect(emissions[1]).toEqual(
              actions.migrateMultiDelegation.reset(),
            );
          },
        }),
      );
    });

    it('returns EMPTY when reward account info fetch fails', () => {
      const deps = createPrepareVoteDelegationDependencies();
      const providerError = new ProviderError(ProviderFailure.Unhealthy);
      deps.cardanoProvider.getRewardAccountInfo.mockReturnValue(
        of(Err(providerError)),
      );

      testSideEffect(
        makePrepareVoteDelegation({
          buildVoteDelegationTxFn: mockBuildVoteDelegationTxFunction,
          signTxFn: mockSignTxFunction,
        }),
        ({ cold, flush }) => ({
          actionObservables: {
            migrateMultiDelegation: {
              startMigration$: cold('-a', {
                a: actions.migrateMultiDelegation.startMigration(
                  multiDelegationAccount,
                ),
              }),
            },
          },
          stateObservables: createMockStateObservables(
            cold as unknown as RunHelpers['hot'],
          ),
          dependencies: deps as never,
          assertion: sideEffect$ => {
            const emissions: unknown[] = [];
            sideEffect$.subscribe(a => emissions.push(a));
            flush();

            expect(emissions).toHaveLength(0);
            expect(deps.logger.error).toHaveBeenCalledWith(
              expect.stringContaining('vote delegation'),
              providerError,
            );
          },
        }),
      );
    });

    const needsVoteDelegationAccountInfo: RewardAccountInfo = {
      isActive: true,
      isRegistered: true,
      // No drepId — needs vote delegation
      rewardsSum: BigNumber(100_000_000n),
      withdrawableAmount: BigNumber(50_000_000n),
      controlledAmount: BigNumber(500_000_000n),
    };

    const createDepsNeedingVoteDelegation = () => {
      const deps = createPrepareVoteDelegationDependencies();
      let getRewardAccountInfoCallCount = 0;
      deps.cardanoProvider.getRewardAccountInfo.mockImplementation(() => {
        getRewardAccountInfoCallCount++;
        // First call: no drepId (initial check + first poll)
        // Later calls: drepId set (poll succeeds)
        if (getRewardAccountInfoCallCount <= 2) {
          return of(Ok(needsVoteDelegationAccountInfo));
        }
        return of(
          Ok({ ...needsVoteDelegationAccountInfo, drepId: 'drep1abc' }),
        );
      });
      return deps;
    };

    it('builds, signs, submits vote delegation tx, then dispatches migrate', () => {
      const deps = createDepsNeedingVoteDelegation();

      testSideEffect(
        makePrepareVoteDelegation({
          buildVoteDelegationTxFn: mockBuildVoteDelegationTxFunction,
          signTxFn: mockSignTxFunction,
        }),
        ({ cold, flush }) => ({
          actionObservables: {
            migrateMultiDelegation: {
              startMigration$: cold('-a', {
                a: actions.migrateMultiDelegation.startMigration(
                  multiDelegationAccount,
                ),
              }),
            },
          },
          stateObservables: createMockStateObservables(
            cold as unknown as RunHelpers['hot'],
          ),
          dependencies: deps as never,
          assertion: sideEffect$ => {
            const emissions: unknown[] = [];
            sideEffect$.subscribe(a => emissions.push(a));
            flush();

            // Submitted
            expect(deps.cardanoProvider.submitTx).toHaveBeenCalled();
            // Emitted migrate action
            expect(emissions).toHaveLength(1);
            expect(emissions[0]).toEqual(
              actions.migrateMultiDelegation.migrate(multiDelegationAccount),
            );
          },
        }),
      );
    });

    it('dispatches reset when vote delegation tx submission fails', () => {
      const deps = createDepsNeedingVoteDelegation();
      deps.cardanoProvider.submitTx.mockReturnValue(
        of(Err(new ProviderError(ProviderFailure.Unhealthy))),
      );

      testSideEffect(
        makePrepareVoteDelegation({
          buildVoteDelegationTxFn: mockBuildVoteDelegationTxFunction,
          signTxFn: mockSignTxFunction,
        }),
        ({ cold, flush }) => ({
          actionObservables: {
            migrateMultiDelegation: {
              startMigration$: cold('-a', {
                a: actions.migrateMultiDelegation.startMigration(
                  multiDelegationAccount,
                ),
              }),
            },
          },
          stateObservables: createMockStateObservables(
            cold as unknown as RunHelpers['hot'],
          ),
          dependencies: deps as never,
          assertion: sideEffect$ => {
            const emissions: unknown[] = [];
            sideEffect$.subscribe(a => emissions.push(a));
            flush();

            expect(deps.cardanoProvider.submitTx).toHaveBeenCalled();
            expect(deps.logger.warn).toHaveBeenCalledWith(
              expect.stringContaining('submit vote delegation'),
            );
            expect(emissions).toHaveLength(1);
            expect(emissions[0]).toEqual(
              actions.migrateMultiDelegation.reset(),
            );
          },
        }),
      );
    });

    it('does not submit when signTxFn returns EMPTY', () => {
      const deps = createDepsNeedingVoteDelegation();
      const emptySignTxFunction: typeof signTx = () => () => EMPTY;

      testSideEffect(
        makePrepareVoteDelegation({
          buildVoteDelegationTxFn: mockBuildVoteDelegationTxFunction,
          signTxFn: emptySignTxFunction,
        }),
        ({ cold, flush }) => ({
          actionObservables: {
            migrateMultiDelegation: {
              startMigration$: cold('-a', {
                a: actions.migrateMultiDelegation.startMigration(
                  multiDelegationAccount,
                ),
              }),
            },
          },
          stateObservables: createMockStateObservables(
            cold as unknown as RunHelpers['hot'],
          ),
          dependencies: deps as never,
          assertion: sideEffect$ => {
            const emissions: unknown[] = [];
            sideEffect$.subscribe(a => emissions.push(a));
            flush();

            expect(deps.cardanoProvider.submitTx).not.toHaveBeenCalled();
            expect(emissions).toHaveLength(0);
          },
        }),
      );
    });
  });
});
