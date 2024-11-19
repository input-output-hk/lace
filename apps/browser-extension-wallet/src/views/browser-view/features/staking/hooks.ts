import { useCallback, useMemo } from 'react';
import { useDelegationStore } from '@src/features/delegation/stores';
import { useWalletStore } from '@stores';
import { withSignTxConfirmation } from '@lib/wallet-api-ui';
import { useSecrets } from '@lace/core';
import { useObservable } from '@lace/common';
import { Wallet } from '@lace/cardano';

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
  accountsWithRegisteredStakeCredsWithoutVotingDelegation: Wallet.Cardano.RewardAccountInfo[];
  accountsWithRegisteredStakeCreds: Wallet.Cardano.RewardAccountInfo[];
  poolIdToRewardAccountMap: Map<string, Wallet.Cardano.RewardAccountInfo>;
  lockedStakeRewards: BigInt;
} => {
  const { inMemoryWallet } = useWalletStore();
  const rewardAccounts = useObservable(inMemoryWallet.delegation.rewardAccounts$);
  const accountsWithRegisteredStakeCreds = rewardAccounts?.filter(
    ({ credentialStatus }) => Wallet.Cardano.StakeCredentialStatus.Registered === credentialStatus
  );

  const accountsWithRegisteredStakeCredsWithoutVotingDelegation = useMemo(
    () => accountsWithRegisteredStakeCreds?.filter(({ dRepDelegatee }) => !dRepDelegatee),
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

  const poolIdToRewardAccountMap = useMemo(
    () =>
      new Map(
        accountsWithRegisteredStakeCreds
          ?.map((rewardAccount): [string, Wallet.Cardano.RewardAccountInfo] => {
            const { delegatee } = rewardAccount;
            const delagationInfo = delegatee?.nextNextEpoch || delegatee?.nextEpoch || delegatee?.currentEpoch;

            return [delagationInfo?.id.toString(), rewardAccount];
          })
          .filter(([poolId]) => !!poolId)
      ),
    [accountsWithRegisteredStakeCreds]
  );

  return {
    accountsWithRegisteredStakeCreds,
    accountsWithRegisteredStakeCredsWithoutVotingDelegation,
    lockedStakeRewards,
    poolIdToRewardAccountMap
  };
};
