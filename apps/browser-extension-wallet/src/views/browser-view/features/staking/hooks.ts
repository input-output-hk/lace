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
  areAllRegisteredStakeKeysWithoutVotingDelegation: boolean;
  poolIdToRewardAccountMap: Map<string, Wallet.Cardano.RewardAccountInfo>;
} => {
  const { inMemoryWallet } = useWalletStore();
  const rewardAccounts = useObservable(inMemoryWallet.delegation.rewardAccounts$);
  const rewardAccountsWithRegisteredStakeCreds = rewardAccounts?.filter(
    ({ credentialStatus }) => Wallet.Cardano.StakeCredentialStatus.Registered === credentialStatus
  );

  const areAllRegisteredStakeKeysWithoutVotingDelegation = useMemo(
    () =>
      rewardAccountsWithRegisteredStakeCreds?.length > 0 &&
      !rewardAccountsWithRegisteredStakeCreds.some(({ dRepDelegatee }) => dRepDelegatee),
    [rewardAccountsWithRegisteredStakeCreds]
  );

  const poolIdToRewardAccountMap = useMemo(
    () =>
      new Map(
        rewardAccountsWithRegisteredStakeCreds
          ?.map((rewardAccount): [string, Wallet.Cardano.RewardAccountInfo] => {
            const { delegatee } = rewardAccount;
            const delagationInfo = delegatee?.nextNextEpoch || delegatee?.nextEpoch || delegatee?.currentEpoch;

            return [delagationInfo?.id.toString(), rewardAccount];
          })
          .filter(([poolId]) => !!poolId)
      ),
    [rewardAccountsWithRegisteredStakeCreds]
  );

  return { areAllRegisteredStakeKeysWithoutVotingDelegation, poolIdToRewardAccountMap };
};
