/* eslint-disable import/imports-first */
const mockUseWalletStore = jest.fn();
import { renderHook } from '@testing-library/react-hooks';
import { useRewardAccountsData } from '../hooks';
import { act } from 'react-dom/test-utils';
import { BehaviorSubject } from 'rxjs';
import * as Stores from '@src/stores';
import { Wallet } from '@lace/cardano';

const rewardAccounts$ = new BehaviorSubject([]);

const inMemoryWallet = {
  delegation: {
    rewardAccounts$
  }
};

jest.mock('@src/stores', (): typeof Stores => ({
  ...jest.requireActual<typeof Stores>('@src/stores'),
  useWalletStore: mockUseWalletStore
}));

describe('Testing useRewardAccountsData hook', () => {
  test('should return proper rewards accounts hook state', async () => {
    mockUseWalletStore.mockReset();
    mockUseWalletStore.mockImplementation(() => ({
      inMemoryWallet
    }));

    const hook = renderHook(() => useRewardAccountsData());
    expect(hook.result.current.areAllRegisteredStakeKeysWithoutVotingDelegation).toEqual(false);
    expect(hook.result.current.poolIdToRewardAccountsMap).toEqual(new Map());

    act(() => {
      rewardAccounts$.next([{ credentialStatus: Wallet.Cardano.StakeCredentialStatus.Unregistered }]);
    });
    expect(hook.result.current.areAllRegisteredStakeKeysWithoutVotingDelegation).toEqual(false);
    expect(hook.result.current.poolIdToRewardAccountsMap).toEqual(new Map());

    act(() => {
      rewardAccounts$.next([{ credentialStatus: Wallet.Cardano.StakeCredentialStatus.Registered }]);
    });
    expect(hook.result.current.areAllRegisteredStakeKeysWithoutVotingDelegation).toEqual(true);
    expect(hook.result.current.poolIdToRewardAccountsMap).toEqual(new Map());

    const poolId = 'poolId';
    const rewardAccount = {
      credentialStatus: Wallet.Cardano.StakeCredentialStatus.Registered,
      dRepDelegatee: {},
      delegatee: { nextNextEpoch: { id: poolId } }
    };
    act(() => {
      rewardAccounts$.next([rewardAccount]);
    });
    expect(hook.result.current.areAllRegisteredStakeKeysWithoutVotingDelegation).toEqual(false);
    expect(hook.result.current.poolIdToRewardAccountsMap.size).toEqual(1);
    expect(hook.result.current.poolIdToRewardAccountsMap.get(poolId)).toEqual([rewardAccount]);
  });
});
