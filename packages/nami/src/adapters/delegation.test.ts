import { Wallet } from '@lace/cardano';
import { renderHook } from '@testing-library/react-hooks';
import { of } from 'rxjs';

import { useDelegation } from './delegation';

const mockBuildDelegation = jest.fn().mockResolvedValue(undefined);
const mockSetSelectedStakePool = jest.fn().mockResolvedValue(undefined);

describe('useDelegation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return no transformed delegation if there is no delegationDistribution', () => {
    const stakeKeyDeposit = 123;
    const inMemoryWallet = {
      currentEpoch$: of(true),
      delegation: {
        distribution$: of(undefined),
        rewardsHistory$: of(true),
      },
      protocolParameters$: of({ stakeKeyDeposit }),
      balance: { utxo: {}, rewardAccounts: {} },
    } as unknown as Wallet.ObservableWallet;
    const { result } = renderHook(() =>
      useDelegation({
        inMemoryWallet,
        buildDelegation: mockBuildDelegation,
        setSelectedStakePool: mockSetSelectedStakePool,
      }),
    );

    expect(result.current.delegation).toBe(undefined);
    expect(result.current.stakeRegistration).toEqual(
      stakeKeyDeposit.toString(),
    );
    expect(typeof result.current.initDelegation).toBe('function');
  });

  test('should return no transformed delegation if there is no delegationRewardsHistory', () => {
    const stakeKeyDeposit = 123;
    const inMemoryWallet = {
      currentEpoch$: of(true),
      delegation: {
        distribution$: of(true),
        rewardsHistory$: of(undefined),
      },
      protocolParameters$: of({ stakeKeyDeposit }),
      balance: { utxo: {}, rewardAccounts: {} },
    } as unknown as Wallet.ObservableWallet;
    const { result } = renderHook(() =>
      useDelegation({
        inMemoryWallet,
        buildDelegation: mockBuildDelegation,
        setSelectedStakePool: mockSetSelectedStakePool,
      }),
    );

    expect(result.current.delegation).toBe(undefined);
    expect(result.current.stakeRegistration).toEqual(
      stakeKeyDeposit.toString(),
    );
    expect(typeof result.current.initDelegation).toBe('function');
  });

  test('should return no transformed delegation if there is no currentEpoch', () => {
    const stakeKeyDeposit = 123;
    const inMemoryWallet = {
      currentEpoch$: of(true),
      delegation: {
        distribution$: of(undefined),
        rewardsHistory$: of(undefined),
      },
      protocolParameters$: of({ stakeKeyDeposit }),
      balance: { utxo: {}, rewardAccounts: {} },
    } as unknown as Wallet.ObservableWallet;
    const { result } = renderHook(() =>
      useDelegation({
        inMemoryWallet,
        buildDelegation: mockBuildDelegation,
        setSelectedStakePool: mockSetSelectedStakePool,
      }),
    );

    expect(result.current.delegation).toBe(undefined);
    expect(result.current.stakeRegistration).toEqual(
      stakeKeyDeposit.toString(),
    );
    expect(typeof result.current.initDelegation).toBe('function');
  });

  test('should return no transformed delegation if delegationDistribution has no values', () => {
    const stakeKeyDeposit = 123;
    const inMemoryWallet = {
      currentEpoch$: of(true),
      delegation: {
        distribution$: of(new Map()),
        rewardsHistory$: of(true),
      },
      protocolParameters$: of({ stakeKeyDeposit }),
      balance: { utxo: {}, rewardAccounts: {} },
    } as unknown as Wallet.ObservableWallet;
    const { result } = renderHook(() =>
      useDelegation({
        inMemoryWallet,
        buildDelegation: mockBuildDelegation,
        setSelectedStakePool: mockSetSelectedStakePool,
      }),
    );

    expect(result.current.delegation).toBe(undefined);
    expect(result.current.stakeRegistration).toEqual(
      stakeKeyDeposit.toString(),
    );
    expect(typeof result.current.initDelegation).toBe('function');
  });

  test('should return transformed delegation', () => {
    const poolId = 'poolId';
    const rewardBalance = 456;
    const metadata = {
      ticker: 'ticker',
      homepage: 'homepage',
      description: 'description',
    };
    const distribution = {
      pool: { metadata, id: poolId },
    };
    const stakeKeyDeposit = 123;
    const inMemoryWallet = {
      currentEpoch$: of(true),
      delegation: {
        distribution$: of(new Map([[poolId, distribution]])),
        rewardsHistory$: of(true),
        rewardAccounts$: of([
          {
            address: 'address',
            credentialStatus: Wallet.Cardano.StakeCredentialStatus.Registered,
            rewardBalance,
          },
        ]),
      },
      addresses$: of([{ rewardAccount: 'address' }]),
      protocolParameters$: of({ stakeKeyDeposit }),
      balance: { utxo: {}, rewardAccounts: {} },
    } as unknown as Wallet.ObservableWallet;
    const { result } = renderHook(() =>
      useDelegation({
        inMemoryWallet,
        buildDelegation: mockBuildDelegation,
        setSelectedStakePool: mockSetSelectedStakePool,
      }),
    );

    expect(result.current.delegation).toEqual({
      poolId,
      ticker: metadata?.ticker ?? '',
      homepage: metadata?.homepage ?? '',
      description: metadata?.description ?? '',
      rewards: rewardBalance.toString(),
    });
    expect(result.current.stakeRegistration).toEqual(
      stakeKeyDeposit.toString(),
    );
    expect(typeof result.current.initDelegation).toBe('function');
  });

  test('should call setSelectedStakePool and buildDelegation with correct arguments', async () => {
    const poolId = 'poolId';
    const distribution = {
      pool: { metadata: {} },
    };
    const stakeKeyDeposit = 123;
    const inMemoryWallet = {
      currentEpoch$: of(true),
      delegation: {
        distribution$: of(new Map([[poolId, distribution]])),
        rewardsHistory$: of(undefined),
        rewardAccounts$: of([
          {
            address: 'address',
            credentialStatus: Wallet.Cardano.StakeCredentialStatus.Registered,
          },
        ]),
      },
      addresses$: of([{ rewardAccount: 'address' }]),
      protocolParameters$: of({ stakeKeyDeposit }),
      balance: { utxo: {}, rewardAccounts: {} },
    } as unknown as Wallet.ObservableWallet;
    const { result } = renderHook(() =>
      useDelegation({
        inMemoryWallet,
        buildDelegation: mockBuildDelegation,
        setSelectedStakePool: mockSetSelectedStakePool,
      }),
    );

    await result.current.initDelegation({
      hexId: poolId,
    } as Wallet.Cardano.StakePool);

    expect(mockSetSelectedStakePool).toBeCalledWith({
      hexId: poolId,
    });
    expect(mockBuildDelegation).toBeCalledWith(poolId);
  });
});
