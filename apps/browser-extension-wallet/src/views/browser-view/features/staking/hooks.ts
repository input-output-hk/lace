import { useMemo } from 'react';
import { useDelegationStore } from '@src/features/delegation/stores';
import { useWalletStore } from '@stores';
import { withSignTxConfirmation } from '@lib/wallet-api-ui';
import { useSecrets } from '@lace/core';
import { useObservable } from '@lace/common';
import { Wallet } from '@lace/cardano';
import groupBy from 'lodash/groupBy';

interface UseRewardAccountsDataType {
  areAllRegisteredStakeKeysWithoutVotingDelegation: boolean;
  poolIdToRewardAccountsMap: Map<string, Wallet.Cardano.RewardAccountInfo[]>;
  lockedStakeRewards: bigint;
}

export const useDelegationTransaction = (): {
  signAndSubmitTransaction: () => Promise<void>;
} => {
  const { clearSecrets, password } = useSecrets();
  const { inMemoryWallet } = useWalletStore();
  const { delegationTxBuilder } = useDelegationStore();

  const signAndSubmitTransaction = async () => {
    const tx = delegationTxBuilder.build();
    const signedTx = await withSignTxConfirmation(() => tx.sign(), password.value);
    await inMemoryWallet.submitTx(signedTx);
    clearSecrets();
  };

  return { signAndSubmitTransaction };
};

export const getPoolIdToRewardAccountsMap = (
  rewardAccounts: Wallet.Cardano.RewardAccountInfo[]
): UseRewardAccountsDataType['poolIdToRewardAccountsMap'] =>
  new Map(
    Object.entries(
      groupBy(rewardAccounts, ({ delegatee }) => {
        const delagationInfo = delegatee?.nextNextEpoch || delegatee?.nextEpoch || delegatee?.currentEpoch;
        return delagationInfo?.id.toString() ?? '';
      })
    ).filter(([poolId]) => !!poolId)
  );

export const useRewardAccountsData = (): UseRewardAccountsDataType => {
  const { inMemoryWallet } = useWalletStore();
  const rewardAccounts = useObservable(inMemoryWallet.delegation.rewardAccounts$);
  const accountsWithRegisteredStakeCreds = useMemo(
    () =>
      rewardAccounts?.filter(
        ({ credentialStatus }) => Wallet.Cardano.StakeCredentialStatus.Registered === credentialStatus
      ) ?? [],
    [rewardAccounts]
  );

  const areAllRegisteredStakeKeysWithoutVotingDelegation = useMemo(
    () =>
      accountsWithRegisteredStakeCreds.length > 0 &&
      !accountsWithRegisteredStakeCreds.some(({ dRepDelegatee }) => dRepDelegatee),
    [accountsWithRegisteredStakeCreds]
  );

  const accountsWithRegisteredStakeCredsWithoutVotingDelegation = useMemo(
    () =>
      accountsWithRegisteredStakeCreds.filter(
        ({ dRepDelegatee }) =>
          !dRepDelegatee ||
          (dRepDelegatee &&
            'active' in dRepDelegatee.delegateRepresentative &&
            !dRepDelegatee.delegateRepresentative.active)
      ),
    [accountsWithRegisteredStakeCreds]
  );

  const lockedStakeRewards = useMemo(
    () =>
      BigInt(
        accountsWithRegisteredStakeCredsWithoutVotingDelegation
          ? Wallet.BigIntMath.sum(
              accountsWithRegisteredStakeCredsWithoutVotingDelegation.map(({ rewardBalance }) => rewardBalance)
            )
          : 0
      ),
    [accountsWithRegisteredStakeCredsWithoutVotingDelegation]
  );

  const poolIdToRewardAccountsMap = useMemo(
    () => getPoolIdToRewardAccountsMap(accountsWithRegisteredStakeCreds),
    [accountsWithRegisteredStakeCreds]
  );

  return {
    areAllRegisteredStakeKeysWithoutVotingDelegation,
    lockedStakeRewards,
    poolIdToRewardAccountsMap
  };
};
