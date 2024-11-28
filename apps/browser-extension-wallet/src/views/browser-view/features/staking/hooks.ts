import { useCallback, useMemo } from 'react';
import { useDelegationStore } from '@src/features/delegation/stores';
import { useWalletStore } from '@stores';
import { withSignTxConfirmation } from '@lib/wallet-api-ui';
import { useSecrets } from '@lace/core';
import { useObservable } from '@lace/common';
import { Wallet } from '@lace/cardano';
import groupBy from 'lodash/groupBy';

export const useDelegationTransaction = (): { signAndSubmitTransaction: () => Promise<void> } => {
  const { password, clearSecrets } = useSecrets();
  const { inMemoryWallet } = useWalletStore();
  const { delegationTxBuilder } = useDelegationStore();
  const signAndSubmitTransaction = useCallback(async () => {
    const tx = delegationTxBuilder.build();
    const signedTx = await withSignTxConfirmation(() => tx.sign(), password.value);
    await inMemoryWallet.submitTx(signedTx);
    clearSecrets();
  }, [delegationTxBuilder, inMemoryWallet, password, clearSecrets]);

  return { signAndSubmitTransaction };
};

export const useRewardAccountsData = (): {
  areAllRegisteredStakeKeysWithoutVotingDelegation: boolean;
  poolIdToRewardAccountsMap: Map<string, Wallet.Cardano.RewardAccountInfo[]>;
} => {
  const { inMemoryWallet } = useWalletStore();
  const rewardAccounts = useObservable(inMemoryWallet.delegation.rewardAccounts$);
  const rewardAccountsWithRegisteredStakeCreds = useMemo(
    () =>
      rewardAccounts?.filter(
        ({ credentialStatus }) => Wallet.Cardano.StakeCredentialStatus.Registered === credentialStatus
      ) ?? [],
    [rewardAccounts]
  );

  const areAllRegisteredStakeKeysWithoutVotingDelegation = useMemo(
    () =>
      rewardAccountsWithRegisteredStakeCreds.length > 0 &&
      !rewardAccountsWithRegisteredStakeCreds.some(({ dRepDelegatee }) => dRepDelegatee),
    [rewardAccountsWithRegisteredStakeCreds]
  );

  const poolIdToRewardAccountsMap = useMemo(
    () =>
      new Map(
        Object.entries(
          groupBy(rewardAccountsWithRegisteredStakeCreds, ({ delegatee }) => {
            const delagationInfo = delegatee?.nextNextEpoch || delegatee?.nextEpoch || delegatee?.currentEpoch;
            return delagationInfo?.id.toString();
          })
        ).filter(([poolId]) => !!poolId)
      ),
    [rewardAccountsWithRegisteredStakeCreds]
  );

  return { areAllRegisteredStakeKeysWithoutVotingDelegation, poolIdToRewardAccountsMap };
};
