import { Cardano } from '@cardano-sdk/core';
import { ObservableWallet } from '@cardano-sdk/wallet';
import { InitializeTxProps } from '@cardano-sdk/tx-construction';
import { firstValueFrom } from 'rxjs';
const { CertificateType, StakeKeyStatus, RewardAccount } = Cardano;

const buildDelegationCertificates = (
  walletRewardAccount: Cardano.RewardAccountInfo,
  poolToDelegateId: Cardano.PoolId
): Cardano.Certificate[] => {
  const { address: rewardAccount, keyStatus } = walletRewardAccount;
  const isStakeKeyRegistered = keyStatus === StakeKeyStatus.Registered;

  const stakeKeyHash = RewardAccount.toHash(rewardAccount);

  const delegationCertificate: Cardano.StakeDelegationCertificate = {
    __typename: CertificateType.StakeDelegation,
    stakeKeyHash,
    poolId: poolToDelegateId
  };

  const stakeKeyCertificate: Cardano.StakeAddressCertificate = {
    __typename: CertificateType.StakeKeyRegistration,
    stakeKeyHash
  };

  return [...(isStakeKeyRegistered ? [] : [stakeKeyCertificate]), delegationCertificate];
};

export const buildDelegation = async (wallet: ObservableWallet, poolId: Cardano.PoolId): Promise<InitializeTxProps> => {
  const walletRewardAccount = (await firstValueFrom(wallet.delegation.rewardAccounts$))[0];
  // TODO: check if already delegating to same stake pool? [LW-5458]
  const certificates = buildDelegationCertificates(walletRewardAccount, poolId);
  return { certificates };
};
