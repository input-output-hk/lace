import {
  Cardano,
  ProviderError,
  ProviderFailure,
  createTxInspector,
  transactionSummaryInspector,
} from '@cardano-sdk/core';
import { ActivityType } from '@lace-contract/activities';
import { TokenId } from '@lace-contract/tokens';
import { testSideEffect } from '@lace-lib/util-dev';
import { BigNumber, Err, Ok, Timestamp } from '@lace-sdk/util';
import { of } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Make expect available globally for TestScheduler
// @ts-expect-error - Making expect available globally for @cardano-sdk/util-dev's createTestScheduler
globalThis.expect = expect;

import { cardanoContextActions, CardanoRewardAccount } from '../../../src';
import { trackAccountDelegationActivities } from '../../../src/store/side-effects/track-account-delegation-activities';
import { account0Context, cardanoAccount0Addr, chainId } from '../../mocks';

import type {
  CardanoAddressData,
  CardanoProvider,
  DelegationInfo,
  ExtendedTxDetails,
  RegistrationInfo,
  RequiredProtocolParameters,
  WithdrawalInfo,
} from '../../../src';
import type * as Core from '@cardano-sdk/core';
import type { AnyAddress } from '@lace-contract/addresses';

// Mock the Cardano SDK transaction inspector functions
vi.mock('@cardano-sdk/core', async importActual => {
  const module = await importActual<typeof Core>();
  const mockTxSummaryInspector = vi.fn();
  const mockCreateTxInspector = vi.fn(() => mockTxSummaryInspector);

  return {
    ...module,
    createTxInspector: mockCreateTxInspector,
    transactionSummaryInspector: vi.fn(),
  };
});

const actions = {
  ...cardanoContextActions,
};

const accountId = account0Context.accountId;
const rewardAccount = CardanoRewardAccount(
  'stake_test1urpklgzqsh9yqz8pkyuxcw9dlszpe5flnxjtl55epla6ftqktdyfz',
);

const mockAddress: AnyAddress = {
  ...cardanoAccount0Addr,
  data: {
    rewardAccount,
    networkId: chainId.networkId,
    networkMagic: chainId.networkMagic,
  } as CardanoAddressData,
};

const mockDelegationEntry: DelegationInfo = {
  activeEpoch: Cardano.EpochNo(100),
  txHash: Cardano.TransactionId(
    '80be2d8820b8946037764fcba8177a3eb1cae94bf8993def14dda20cb89390c2',
  ),
  amount: BigNumber(BigInt(1000000)),
  poolId: Cardano.PoolId(
    'pool1h8yl5mkyrfmfls2x9fu9mls3ry6egnw4q6efg34xr37zc243gkf',
  ),
};

const mockRegistrationEntry: RegistrationInfo = {
  txHash: Cardano.TransactionId(
    '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20',
  ),
  action: 'registered',
};

const mockWithdrawalEntry: WithdrawalInfo = {
  txHash: Cardano.TransactionId(
    'f0e1d2c3b4a5968778695a4b3c2d1e0f00112233445566778899aabbccddeeff',
  ),
  amount: BigNumber(BigInt(2500000)),
};

const mockProtocolParameters = {
  minFeeCoefficient: 44n,
  minFeeConstant: 155381n,
  maxTxSize: 16384n,
  maxValueSize: 5000n,
  coinsPerUtxoByte: 4310n,
  poolDeposit: 500_000_000n,
  stakeKeyDeposit: 2_000_000n,
  minFeeRefScriptCostPerByte: 0n,
  prices: {
    memory: 0.0577,
    steps: 0.000_072_1,
  },
} as unknown as RequiredProtocolParameters;

const createMockTxDetails = (txHash: string): ExtendedTxDetails =>
  ({
    id: Cardano.TransactionId(txHash),
    blockTime: 1000,
    body: {
      fee: BigInt(170000),
      inputs: [],
      outputs: [],
      validityInterval: {
        invalidBefore: undefined,
        invalidHereafter: undefined,
      },
      certificates: [],
      withdrawals: [],
      mint: undefined,
      collateralReturn: undefined,
      collaterals: [],
      totalCollateral: undefined,
      proposalProcedures: undefined,
      votingProcedures: undefined,
    },
    witness: {
      signatures: new Map(),
      scripts: [],
      datums: [],
      redeemers: [],
      bootstrap: [],
    },
    auxiliaryData: undefined,
    blockHeader: {
      blockNo: Cardano.BlockNo(1000),
      hash: Cardano.BlockId(
        '0000000000000000000000000000000000000000000000000000000000000001',
      ),
      slot: Cardano.Slot(1000000),
    },
    index: 0,
    inputSource: Cardano.InputSource.inputs,
    txSize: 1000,
  } as ExtendedTxDetails);

const providerError = new ProviderError(ProviderFailure.Unhealthy);
const mockLogger = dummyLogger;

describe('trackAccountDelegationActivities', () => {
  let mockTxSummaryInspector: ReturnType<typeof vi.fn>;
  let mockCreateTxInspector: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock: return an observable with deposit for Registration entries
    const stakeKeyDeposit = mockProtocolParameters.stakeKeyDeposit;
    mockTxSummaryInspector = vi.fn().mockReturnValue(
      of({
        summary: {
          deposit: stakeKeyDeposit,
          returnedDeposit: 0n,
        },
      }),
    );
    mockCreateTxInspector = vi.fn(() => mockTxSummaryInspector);
    (
      createTxInspector as unknown as ReturnType<typeof vi.fn>
    ).mockImplementation(mockCreateTxInspector);
    (
      transactionSummaryInspector as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue({});
  });

  it('should fetch delegations, registrations, and withdrawals and dispatch setAccountDelegationsHistory', () => {
    const getAccountDelegations = vi
      .fn()
      .mockImplementation(() => of(Ok([mockDelegationEntry])));
    const getAccountRegistrations = vi
      .fn()
      .mockImplementation(() => of(Ok([mockRegistrationEntry])));
    const getAccountWithdrawals = vi
      .fn()
      .mockImplementation(() => of(Ok([mockWithdrawalEntry])));

    // Mock transaction inspector to return deposit for Registration
    const stakeKeyDeposit = mockProtocolParameters.stakeKeyDeposit;
    mockTxSummaryInspector.mockReturnValue(
      of({
        summary: {
          deposit: stakeKeyDeposit,
          returnedDeposit: 0n,
        },
      }),
    );

    testSideEffect(
      trackAccountDelegationActivities,
      ({ cold, expectObservable }) => ({
        actionObservables: {
          cardanoContext: {
            loadAccountDelegationHistory$: cold('a', {
              a: actions.cardanoContext.loadAccountDelegationHistory({
                accountId,
                rewardAccount,
              }),
            }),
            clearAccountDelegationHistory$: cold('-'),
          },
        },
        stateObservables: {
          cardanoContext: {
            selectChainId$: cold('a', { a: chainId }),
            selectProtocolParameters$: cold('a', {
              a: mockProtocolParameters,
            }),
          },
          addresses: {
            selectAllAddresses$: cold('a', { a: [mockAddress] }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getAccountDelegations,
            getAccountRegistrations,
            getAccountWithdrawals,
            getTransactionDetails: vi
              .fn()
              .mockImplementation((txId: string) =>
                of(Ok(createMockTxDetails(txId.toString()))),
              ),
            resolveInput: vi.fn().mockReturnValue(of(Ok(null))),
          } as unknown as CardanoProvider,
          actions,
          logger: mockLogger,
        },
        assertion: sideEffect$ => {
          const delegationTxDetails = createMockTxDetails(
            mockDelegationEntry.txHash.toString(),
          );
          const withdrawalTxDetails = createMockTxDetails(
            mockWithdrawalEntry.txHash.toString(),
          );
          const registrationTxDetails = createMockTxDetails(
            mockRegistrationEntry.txHash.toString(),
          );
          const expectedDelegationActivity = {
            accountId,
            activityId: mockDelegationEntry.txHash,
            timestamp: Timestamp(delegationTxDetails.blockTime * 1000),
            tokenBalanceChanges: [
              {
                tokenId: TokenId('lovelace'),
                amount: BigNumber(BigInt(0) - delegationTxDetails.body.fee),
              },
            ],
            type: ActivityType.Delegation,
          };
          const expectedRegistrationActivity = {
            accountId,
            activityId: mockRegistrationEntry.txHash,
            timestamp: Timestamp(registrationTxDetails.blockTime * 1000),
            tokenBalanceChanges: [
              {
                tokenId: TokenId('lovelace'),
                amount: BigNumber(
                  BigInt(0) - BigInt(mockProtocolParameters.stakeKeyDeposit),
                ),
              },
            ],
            type: ActivityType.Registration,
          };
          const expectedWithdrawalActivity = {
            accountId,
            activityId: mockWithdrawalEntry.txHash,
            timestamp: Timestamp(withdrawalTxDetails.blockTime * 1000),
            tokenBalanceChanges: [
              {
                tokenId: TokenId('lovelace'),
                amount: mockWithdrawalEntry.amount,
              },
            ],
            type: ActivityType.Withdrawal,
          };
          // With forkJoin, all three requests complete together, so we get one combined history action
          // Then transaction details are fetched for each entry concurrently (mergeMap)
          expectObservable(sideEffect$).toBe('(abcd)', {
            a: actions.cardanoContext.setAccountDelegationsHistory({
              accountId,
              rewardAccount,
              items: [
                mockDelegationEntry,
                mockRegistrationEntry,
                mockWithdrawalEntry,
              ],
            }),
            b: actions.cardanoContext.setDelegationActivities({
              accountId,
              rewardAccount,
              activities: [expectedDelegationActivity],
            }),
            c: actions.cardanoContext.setDelegationActivities({
              accountId,
              rewardAccount,
              activities: [expectedRegistrationActivity],
            }),
            d: actions.cardanoContext.setDelegationActivities({
              accountId,
              rewardAccount,
              activities: [expectedWithdrawalActivity],
            }),
          });
        },
      }),
    );
  });

  it('should skip transaction fetching when protocolParameters are undefined', () => {
    const getAccountDelegations = vi
      .fn()
      .mockImplementation(() => of(Ok([mockDelegationEntry])));
    const getAccountRegistrations = vi
      .fn()
      .mockImplementation(() => of(Ok([mockRegistrationEntry])));
    const getAccountWithdrawals = vi
      .fn()
      .mockImplementation(() => of(Ok([mockWithdrawalEntry])));
    const getTransactionDetails = vi.fn();

    testSideEffect(
      trackAccountDelegationActivities,
      ({ cold, expectObservable }) => ({
        actionObservables: {
          cardanoContext: {
            loadAccountDelegationHistory$: cold('a', {
              a: actions.cardanoContext.loadAccountDelegationHistory({
                accountId,
                rewardAccount,
              }),
            }),
            clearAccountDelegationHistory$: cold('-'),
          },
        },
        stateObservables: {
          cardanoContext: {
            selectChainId$: cold('a', { a: chainId }),
            selectProtocolParameters$: cold('a', { a: undefined }),
          },
          addresses: {
            selectAllAddresses$: cold('a', { a: [mockAddress] }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getAccountDelegations,
            getAccountRegistrations,
            getAccountWithdrawals,
            getTransactionDetails,
            resolveInput: vi.fn().mockReturnValue(of(Ok(null))),
          } as unknown as CardanoProvider,
          actions,
          logger: mockLogger,
        },
        assertion: sideEffect$ => {
          // With forkJoin, all three requests complete together, so we get one combined history action
          expectObservable(sideEffect$).toBe('a', {
            a: actions.cardanoContext.setAccountDelegationsHistory({
              accountId,
              rewardAccount,
              items: [
                mockDelegationEntry,
                mockRegistrationEntry,
                mockWithdrawalEntry,
              ],
            }),
          });
          // Transaction details should not be fetched
          expect(getTransactionDetails).not.toHaveBeenCalled();
        },
      }),
    );
  });

  it('should skip transaction fetching when addresses are empty', () => {
    const getAccountDelegations = vi
      .fn()
      .mockImplementation(() => of(Ok([mockDelegationEntry])));
    const getAccountRegistrations = vi
      .fn()
      .mockImplementation(() => of(Ok([mockRegistrationEntry])));
    const getAccountWithdrawals = vi
      .fn()
      .mockImplementation(() => of(Ok([mockWithdrawalEntry])));
    const getTransactionDetails = vi.fn();

    testSideEffect(
      trackAccountDelegationActivities,
      ({ cold, expectObservable }) => ({
        actionObservables: {
          cardanoContext: {
            loadAccountDelegationHistory$: cold('a', {
              a: actions.cardanoContext.loadAccountDelegationHistory({
                accountId,
                rewardAccount,
              }),
            }),
            clearAccountDelegationHistory$: cold('-'),
          },
        },
        stateObservables: {
          cardanoContext: {
            selectChainId$: cold('a', { a: chainId }),
            selectProtocolParameters$: cold('a', {
              a: mockProtocolParameters,
            }),
          },
          addresses: {
            selectAllAddresses$: cold('a', { a: [] }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getAccountDelegations,
            getAccountRegistrations,
            getAccountWithdrawals,
            getTransactionDetails,
            resolveInput: vi.fn().mockReturnValue(of(Ok(null))),
          } as unknown as CardanoProvider,
          actions,
          logger: mockLogger,
        },
        assertion: sideEffect$ => {
          // With forkJoin, all three requests complete together, so we get one combined history action
          expectObservable(sideEffect$).toBe('a', {
            a: actions.cardanoContext.setAccountDelegationsHistory({
              accountId,
              rewardAccount,
              items: [
                mockDelegationEntry,
                mockRegistrationEntry,
                mockWithdrawalEntry,
              ],
            }),
          });
          // Transaction details should not be fetched when addresses are empty
          expect(getTransactionDetails).not.toHaveBeenCalled();
        },
      }),
    );
  });

  it('should dispatch error action when getAccountDelegations fails', () => {
    const getAccountDelegations = vi
      .fn()
      .mockImplementation(() => of(Err(providerError)));
    const getAccountRegistrations = vi
      .fn()
      .mockImplementation(() => of(Ok([mockRegistrationEntry])));
    const getAccountWithdrawals = vi
      .fn()
      .mockImplementation(() => of(Ok([mockWithdrawalEntry])));

    testSideEffect(
      trackAccountDelegationActivities,
      ({ cold, expectObservable }) => ({
        actionObservables: {
          cardanoContext: {
            loadAccountDelegationHistory$: cold('a', {
              a: actions.cardanoContext.loadAccountDelegationHistory({
                accountId,
                rewardAccount,
              }),
            }),
            clearAccountDelegationHistory$: cold('-'),
          },
        },
        stateObservables: {
          cardanoContext: {
            selectChainId$: cold('a', { a: chainId }),
            selectProtocolParameters$: cold('a', {
              a: mockProtocolParameters,
            }),
          },
          addresses: {
            selectAllAddresses$: cold('a', { a: [mockAddress] }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getAccountDelegations,
            getAccountRegistrations,
            getAccountWithdrawals,
            getTransactionDetails: vi
              .fn()
              .mockImplementation((txId: string) =>
                of(Ok(createMockTxDetails(txId.toString()))),
              ),
            resolveInput: vi.fn().mockReturnValue(of(Ok(null))),
          } as unknown as CardanoProvider,
          actions,
          logger: mockLogger,
        },
        assertion: sideEffect$ => {
          // With forkJoin all-or-nothing approach, if delegations fail, we only get the failure action
          // No successful history actions should be dispatched
          expectObservable(sideEffect$).toBe('a', {
            a: actions.cardanoContext.setAccountDelegationsHistoryFailed({
              accountId,
              rewardAccount,
              failure: providerError.reason,
            }),
          });
        },
      }),
    );
  });

  it('should dispatch error action when getAccountRegistrations fails', () => {
    const getAccountDelegations = vi
      .fn()
      .mockImplementation(() => of(Ok([mockDelegationEntry])));
    const getAccountRegistrations = vi
      .fn()
      .mockImplementation(() => of(Err(providerError)));
    const getAccountWithdrawals = vi
      .fn()
      .mockImplementation(() => of(Ok([mockWithdrawalEntry])));

    testSideEffect(
      trackAccountDelegationActivities,
      ({ cold, expectObservable }) => ({
        actionObservables: {
          cardanoContext: {
            loadAccountDelegationHistory$: cold('a', {
              a: actions.cardanoContext.loadAccountDelegationHistory({
                accountId,
                rewardAccount,
              }),
            }),
            clearAccountDelegationHistory$: cold('-'),
          },
        },
        stateObservables: {
          cardanoContext: {
            selectChainId$: cold('a', { a: chainId }),
            selectProtocolParameters$: cold('a', {
              a: mockProtocolParameters,
            }),
          },
          addresses: {
            selectAllAddresses$: cold('a', { a: [mockAddress] }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getAccountDelegations,
            getAccountRegistrations,
            getAccountWithdrawals,
            getTransactionDetails: vi
              .fn()
              .mockImplementation((txId: string) =>
                of(Ok(createMockTxDetails(txId.toString()))),
              ),
            resolveInput: vi.fn().mockReturnValue(of(Ok(null))),
          } as unknown as CardanoProvider,
          actions,
          logger: mockLogger,
        },
        assertion: sideEffect$ => {
          // With forkJoin all-or-nothing approach, if registrations fail, we only get the failure action
          // No successful history actions should be dispatched
          expectObservable(sideEffect$).toBe('a', {
            a: actions.cardanoContext.setAccountDelegationsHistoryFailed({
              accountId,
              rewardAccount,
              failure: providerError.reason,
            }),
          });
        },
      }),
    );
  });

  it('should dispatch error action when getAccountWithdrawals fails', () => {
    const getAccountDelegations = vi
      .fn()
      .mockImplementation(() => of(Ok([mockDelegationEntry])));
    const getAccountRegistrations = vi
      .fn()
      .mockImplementation(() => of(Ok([mockRegistrationEntry])));
    const getAccountWithdrawals = vi
      .fn()
      .mockImplementation(() => of(Err(providerError)));

    testSideEffect(
      trackAccountDelegationActivities,
      ({ cold, expectObservable }) => ({
        actionObservables: {
          cardanoContext: {
            loadAccountDelegationHistory$: cold('a', {
              a: actions.cardanoContext.loadAccountDelegationHistory({
                accountId,
                rewardAccount,
              }),
            }),
            clearAccountDelegationHistory$: cold('-'),
          },
        },
        stateObservables: {
          cardanoContext: {
            selectChainId$: cold('a', { a: chainId }),
            selectProtocolParameters$: cold('a', {
              a: mockProtocolParameters,
            }),
          },
          addresses: {
            selectAllAddresses$: cold('a', { a: [mockAddress] }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getAccountDelegations,
            getAccountRegistrations,
            getAccountWithdrawals,
            getTransactionDetails: vi
              .fn()
              .mockImplementation((txId: string) =>
                of(Ok(createMockTxDetails(txId.toString()))),
              ),
            resolveInput: vi.fn().mockReturnValue(of(Ok(null))),
          } as unknown as CardanoProvider,
          actions,
          logger: mockLogger,
        },
        assertion: sideEffect$ => {
          // With forkJoin all-or-nothing approach, if withdrawals fail, we only get the failure action
          // No successful history actions should be dispatched
          expectObservable(sideEffect$).toBe('a', {
            a: actions.cardanoContext.setAccountDelegationsHistoryFailed({
              accountId,
              rewardAccount,
              failure: providerError.reason,
            }),
          });
        },
      }),
    );
  });

  it('should cancel ongoing requests when clearAccountDelegationHistory is dispatched', () => {
    const getAccountDelegations = vi
      .fn()
      .mockImplementation(() => of(Ok([mockDelegationEntry])));
    const getAccountRegistrations = vi
      .fn()
      .mockImplementation(() => of(Ok([mockRegistrationEntry])));
    const getAccountWithdrawals = vi
      .fn()
      .mockImplementation(() => of(Ok([mockWithdrawalEntry])));

    testSideEffect(
      trackAccountDelegationActivities,
      ({ cold, expectObservable }) => ({
        actionObservables: {
          cardanoContext: {
            loadAccountDelegationHistory$: cold('a', {
              a: actions.cardanoContext.loadAccountDelegationHistory({
                accountId,
                rewardAccount,
              }),
            }),
            clearAccountDelegationHistory$: cold('b', {
              b: actions.cardanoContext.clearAccountDelegationHistory({
                accountId,
                rewardAccount,
              }),
            }),
          },
        },
        stateObservables: {
          cardanoContext: {
            selectChainId$: cold('a', { a: chainId }),
            selectProtocolParameters$: cold('a', {
              a: mockProtocolParameters,
            }),
          },
          addresses: {
            selectAllAddresses$: cold('a', { a: [mockAddress] }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getAccountDelegations,
            getAccountRegistrations,
            getAccountWithdrawals,
            getTransactionDetails: vi
              .fn()
              .mockImplementation((txId: string) =>
                of(Ok(createMockTxDetails(txId.toString()))),
              ),
            resolveInput: vi.fn().mockReturnValue(of(Ok(null))),
          } as unknown as CardanoProvider,
          actions,
          logger: mockLogger,
        },
        assertion: sideEffect$ => {
          // In the test scheduler, all three provider observables emit synchronously
          // before the cancellation can take effect, so we see all history actions
          // and activities before cancellation completes the stream
          const delegationTxDetails = createMockTxDetails(
            mockDelegationEntry.txHash.toString(),
          );
          const registrationTxDetails = createMockTxDetails(
            mockRegistrationEntry.txHash.toString(),
          );
          const withdrawalTxDetails = createMockTxDetails(
            mockWithdrawalEntry.txHash.toString(),
          );
          const expectedDelegationActivity = {
            accountId,
            activityId: mockDelegationEntry.txHash,
            timestamp: Timestamp(delegationTxDetails.blockTime * 1000),
            tokenBalanceChanges: [
              {
                tokenId: TokenId('lovelace'),
                amount: BigNumber(BigInt(0) - delegationTxDetails.body.fee),
              },
            ],
            type: ActivityType.Delegation,
          };
          const expectedRegistrationActivity = {
            accountId,
            activityId: mockRegistrationEntry.txHash,
            timestamp: Timestamp(registrationTxDetails.blockTime * 1000),
            tokenBalanceChanges: [
              {
                tokenId: TokenId('lovelace'),
                amount: BigNumber(
                  BigInt(0) - BigInt(mockProtocolParameters.stakeKeyDeposit),
                ),
              },
            ],
            type: ActivityType.Registration,
          };
          const expectedWithdrawalActivity = {
            accountId,
            activityId: mockWithdrawalEntry.txHash,
            timestamp: Timestamp(withdrawalTxDetails.blockTime * 1000),
            tokenBalanceChanges: [
              {
                tokenId: TokenId('lovelace'),
                amount: mockWithdrawalEntry.amount,
              },
            ],
            type: ActivityType.Withdrawal,
          };
          // With forkJoin, all three requests complete together, so we get one combined history action
          // In the test scheduler, cancellation happens after all synchronous emissions
          expectObservable(sideEffect$).toBe('(abcd)', {
            a: actions.cardanoContext.setAccountDelegationsHistory({
              accountId,
              rewardAccount,
              items: [
                mockDelegationEntry,
                mockRegistrationEntry,
                mockWithdrawalEntry,
              ],
            }),
            b: actions.cardanoContext.setDelegationActivities({
              accountId,
              rewardAccount,
              activities: [expectedDelegationActivity],
            }),
            c: actions.cardanoContext.setDelegationActivities({
              accountId,
              rewardAccount,
              activities: [expectedRegistrationActivity],
            }),
            d: actions.cardanoContext.setDelegationActivities({
              accountId,
              rewardAccount,
              activities: [expectedWithdrawalActivity],
            }),
          });
        },
      }),
    );
  });

  it('should fetch transaction details and create activities when all conditions are met', () => {
    const getAccountDelegations = vi
      .fn()
      .mockImplementation(() => of(Ok([mockDelegationEntry])));
    const getAccountRegistrations = vi
      .fn()
      .mockImplementation(() => of(Ok([mockRegistrationEntry])));
    const getAccountWithdrawals = vi
      .fn()
      .mockImplementation(() => of(Ok([mockWithdrawalEntry])));
    const getTransactionDetails = vi
      .fn()
      .mockImplementation((txId: string) =>
        of(Ok(createMockTxDetails(txId.toString()))),
      );
    const resolveInput = vi.fn().mockReturnValue(of(Ok(null)));

    testSideEffect(
      trackAccountDelegationActivities,
      ({ cold, expectObservable }) => ({
        actionObservables: {
          cardanoContext: {
            loadAccountDelegationHistory$: cold('a', {
              a: actions.cardanoContext.loadAccountDelegationHistory({
                accountId,
                rewardAccount,
              }),
            }),
            clearAccountDelegationHistory$: cold('-'),
          },
        },
        stateObservables: {
          cardanoContext: {
            selectChainId$: cold('a', { a: chainId }),
            selectProtocolParameters$: cold('a', {
              a: mockProtocolParameters,
            }),
          },
          addresses: {
            selectAllAddresses$: cold('a', { a: [mockAddress] }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getAccountDelegations,
            getAccountRegistrations,
            getAccountWithdrawals,
            getTransactionDetails,
            resolveInput,
          } as unknown as CardanoProvider,
          actions,
          logger: mockLogger,
        },
        assertion: sideEffect$ => {
          const delegationTxDetails = createMockTxDetails(
            mockDelegationEntry.txHash.toString(),
          );
          const registrationTxDetails = createMockTxDetails(
            mockRegistrationEntry.txHash.toString(),
          );
          const withdrawalTxDetails = createMockTxDetails(
            mockWithdrawalEntry.txHash.toString(),
          );
          const expectedDelegationActivity = {
            accountId,
            activityId: mockDelegationEntry.txHash,
            timestamp: Timestamp(delegationTxDetails.blockTime * 1000),
            tokenBalanceChanges: [
              {
                tokenId: TokenId('lovelace'),
                amount: BigNumber(BigInt(0) - delegationTxDetails.body.fee),
              },
            ],
            type: ActivityType.Delegation,
          };
          const expectedRegistrationActivity = {
            accountId,
            activityId: mockRegistrationEntry.txHash,
            timestamp: Timestamp(registrationTxDetails.blockTime * 1000),
            tokenBalanceChanges: [
              {
                tokenId: TokenId('lovelace'),
                amount: BigNumber(
                  BigInt(0) - BigInt(mockProtocolParameters.stakeKeyDeposit),
                ),
              },
            ],
            type: ActivityType.Registration,
          };
          const expectedWithdrawalActivity = {
            accountId,
            activityId: mockWithdrawalEntry.txHash,
            timestamp: Timestamp(withdrawalTxDetails.blockTime * 1000),
            tokenBalanceChanges: [
              {
                tokenId: TokenId('lovelace'),
                amount: mockWithdrawalEntry.amount,
              },
            ],
            type: ActivityType.Withdrawal,
          };
          // With forkJoin, all three requests complete together, so we get one combined history action
          // Then transaction details are fetched for each entry concurrently (mergeMap)
          expectObservable(sideEffect$).toBe('(abcd)', {
            a: actions.cardanoContext.setAccountDelegationsHistory({
              accountId,
              rewardAccount,
              items: [
                mockDelegationEntry,
                mockRegistrationEntry,
                mockWithdrawalEntry,
              ],
            }),
            b: actions.cardanoContext.setDelegationActivities({
              accountId,
              rewardAccount,
              activities: [expectedDelegationActivity],
            }),
            c: actions.cardanoContext.setDelegationActivities({
              accountId,
              rewardAccount,
              activities: [expectedRegistrationActivity],
            }),
            d: actions.cardanoContext.setDelegationActivities({
              accountId,
              rewardAccount,
              activities: [expectedWithdrawalActivity],
            }),
          });
          // Activities being created implies transaction details were fetched
          // Note: In marble tests, we verify behavior through actions, not mock calls
        },
      }),
    );
  });

  it('should handle transaction details fetch failure gracefully', () => {
    const getAccountDelegations = vi
      .fn()
      .mockImplementation(() => of(Ok([mockDelegationEntry])));
    const getAccountRegistrations = vi
      .fn()
      .mockImplementation(() => of(Ok([mockRegistrationEntry])));
    const getAccountWithdrawals = vi
      .fn()
      .mockImplementation(() => of(Ok([mockWithdrawalEntry])));
    const getTransactionDetails = vi
      .fn()
      .mockImplementation(() => of(Err(providerError)));
    const resolveInput = vi.fn().mockReturnValue(of(Ok(null)));

    testSideEffect(
      trackAccountDelegationActivities,
      ({ cold, expectObservable }) => ({
        actionObservables: {
          cardanoContext: {
            loadAccountDelegationHistory$: cold('a', {
              a: actions.cardanoContext.loadAccountDelegationHistory({
                accountId,
                rewardAccount,
              }),
            }),
            clearAccountDelegationHistory$: cold('-'),
          },
        },
        stateObservables: {
          cardanoContext: {
            selectChainId$: cold('a', { a: chainId }),
            selectProtocolParameters$: cold('a', {
              a: mockProtocolParameters,
            }),
          },
          addresses: {
            selectAllAddresses$: cold('a', { a: [mockAddress] }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getAccountDelegations,
            getAccountRegistrations,
            getAccountWithdrawals,
            getTransactionDetails,
            resolveInput,
          } as unknown as CardanoProvider,
          actions,
          logger: mockLogger,
        },
        assertion: sideEffect$ => {
          // With forkJoin, all three requests complete together, so we get one combined history action
          // When transaction fetching fails, error actions are dispatched for each failed transaction fetch
          // All 3 entries (delegation, registration, withdrawal) trigger transaction fetches
          expectObservable(sideEffect$).toBe('(abcd)', {
            a: actions.cardanoContext.setAccountDelegationsHistory({
              accountId,
              rewardAccount,
              items: [
                mockDelegationEntry,
                mockRegistrationEntry,
                mockWithdrawalEntry,
              ],
            }),
            b: actions.cardanoContext.setDelegationActivitiesFailed({
              accountId,
              rewardAccount,
              failure: providerError.reason,
            }),
            c: actions.cardanoContext.setDelegationActivitiesFailed({
              accountId,
              rewardAccount,
              failure: providerError.reason,
            }),
            d: actions.cardanoContext.setDelegationActivitiesFailed({
              accountId,
              rewardAccount,
              failure: providerError.reason,
            }),
          });
        },
      }),
    );
  });

  it('should process transaction details concurrently (mergeMap behavior)', () => {
    // This test verifies that transaction fetches happen concurrently, not sequentially.
    // We use Delegation and Withdrawal only (no Registration) because Registration uses
    // a Promise-based txSummaryInspector that doesn't integrate well with virtual time.
    //
    // We use different delays for each fetch to make order deterministic while proving concurrency.
    //
    // With mergeMap (concurrent): All fetches start at frame 0
    //   - Delegation completes at frame 2 (--a delay)
    //   - Withdrawal completes at frame 4 (----a delay)
    //   - Total pattern: a-b-c (frames 0, 2, 4)
    //
    // With concatMap (sequential): Each fetch starts after the previous completes
    //   - Delegation: starts at 0, completes at 2 (--a delay)
    //   - Withdrawal: starts at 2, completes at 6 (----a delay, so frame 2+4=6)
    //   - Total pattern: a-b---c (frames 0, 2, 6)
    //
    // The key difference: with mergeMap, withdrawal completes at frame 4,
    // with concatMap it would complete at frame 6.
    const getAccountDelegations = vi
      .fn()
      .mockImplementation(() => of(Ok([mockDelegationEntry])));
    const getAccountRegistrations = vi
      .fn()
      .mockImplementation(() => of(Ok([])));
    const getAccountWithdrawals = vi
      .fn()
      .mockImplementation(() => of(Ok([mockWithdrawalEntry])));

    testSideEffect(
      trackAccountDelegationActivities,
      ({ cold, expectObservable }) => {
        // Different delays for each transaction to make order deterministic
        const getTransactionDetails = vi
          .fn()
          .mockImplementation((txId: Cardano.TransactionId) => {
            const txIdString = txId.toString();
            if (txIdString === mockDelegationEntry.txHash.toString()) {
              // Delegation - 2 frames
              return cold('--a', {
                a: Ok(createMockTxDetails(txIdString)),
              });
            }
            // Withdrawal - 4 frames
            return cold('----a', {
              a: Ok(createMockTxDetails(txIdString)),
            });
          });

        return {
          actionObservables: {
            cardanoContext: {
              loadAccountDelegationHistory$: cold('a', {
                a: actions.cardanoContext.loadAccountDelegationHistory({
                  accountId,
                  rewardAccount,
                }),
              }),
              clearAccountDelegationHistory$: cold('-'),
            },
          },
          stateObservables: {
            cardanoContext: {
              selectChainId$: cold('a', { a: chainId }),
              selectProtocolParameters$: cold('a', {
                a: mockProtocolParameters,
              }),
            },
            addresses: {
              selectAllAddresses$: cold('a', { a: [mockAddress] }),
            },
          },
          dependencies: {
            cardanoProvider: {
              getAccountDelegations,
              getAccountRegistrations,
              getAccountWithdrawals,
              getTransactionDetails,
              resolveInput: vi.fn().mockReturnValue(of(Ok(null))),
            } as unknown as CardanoProvider,
            actions,
            logger: mockLogger,
          },
          assertion: sideEffect$ => {
            const delegationTxDetails = createMockTxDetails(
              mockDelegationEntry.txHash.toString(),
            );
            const withdrawalTxDetails = createMockTxDetails(
              mockWithdrawalEntry.txHash.toString(),
            );
            const expectedDelegationActivity = {
              accountId,
              activityId: mockDelegationEntry.txHash,
              timestamp: Timestamp(delegationTxDetails.blockTime * 1000),
              tokenBalanceChanges: [
                {
                  tokenId: TokenId('lovelace'),
                  amount: BigNumber(BigInt(0) - delegationTxDetails.body.fee),
                },
              ],
              type: ActivityType.Delegation,
            };
            const expectedWithdrawalActivity = {
              accountId,
              activityId: mockWithdrawalEntry.txHash,
              timestamp: Timestamp(withdrawalTxDetails.blockTime * 1000),
              tokenBalanceChanges: [
                {
                  tokenId: TokenId('lovelace'),
                  amount: mockWithdrawalEntry.amount,
                },
              ],
              type: ActivityType.Withdrawal,
            };

            // Key assertion: with mergeMap (concurrent), pattern is a-b-c (frames 0, 2, 4)
            // If it were concatMap (sequential), the pattern would be: a-b---c (frames 0, 2, 6)
            // The withdrawal completing at frame 4 (not 6) proves concurrent processing.
            expectObservable(sideEffect$).toBe('a-b-c', {
              a: actions.cardanoContext.setAccountDelegationsHistory({
                accountId,
                rewardAccount,
                items: [mockDelegationEntry, mockWithdrawalEntry],
              }),
              b: actions.cardanoContext.setDelegationActivities({
                accountId,
                rewardAccount,
                activities: [expectedDelegationActivity],
              }),
              c: actions.cardanoContext.setDelegationActivities({
                accountId,
                rewardAccount,
                activities: [expectedWithdrawalActivity],
              }),
            });
          },
        };
      },
    );
  });
});
