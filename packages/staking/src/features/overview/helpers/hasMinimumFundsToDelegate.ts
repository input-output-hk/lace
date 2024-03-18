import { Wallet } from '@lace/cardano';

export const hasMinimumFundsToDelegate = ({
  rewardAccounts,
  stakeKeyDeposit,
  totalCoinBalance,
}: {
  rewardAccounts: Wallet.Cardano.RewardAccountInfo[];
  stakeKeyDeposit: number;
  totalCoinBalance: string;
}) => {
  const alreadyStaking = rewardAccounts.some(({ credentialStatus }) =>
    [Wallet.Cardano.StakeCredentialStatus.Registering, Wallet.Cardano.StakeCredentialStatus.Registered].includes(
      credentialStatus
    )
  );
  const totalBalance = Number(totalCoinBalance);
  const arbitraryFeeValue = 0.5;
  if (alreadyStaking) return totalBalance >= arbitraryFeeValue;

  const depositInAda = Number(Wallet.util.lovelacesToAdaString(stakeKeyDeposit.toString()));
  return totalBalance >= depositInAda + arbitraryFeeValue;
};
