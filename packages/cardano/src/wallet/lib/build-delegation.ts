import { Cardano } from '@cardano-sdk/core';
import { ObservableWallet } from '@cardano-sdk/wallet';
import { InitializeTxProps } from '@cardano-sdk/tx-construction';
import { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import { firstValueFrom } from 'rxjs';
const {
  CertificateType,
  StakeCredentialStatus,
  RewardAccount,
  CredentialType: { KeyHash }
} = Cardano;

const buildDelegationCertificates = (
  walletRewardAccount: Cardano.RewardAccountInfo,
  poolToDelegateId: Cardano.PoolId
): Cardano.Certificate[] => {
  const { address: rewardAccount, credentialStatus } = walletRewardAccount;
  const isStakeKeyRegistered = credentialStatus === StakeCredentialStatus.Registered;

  const stakeKeyHash = RewardAccount.toHash(rewardAccount);
  const stakeCredential = {
    hash: Hash28ByteBase16.fromEd25519KeyHashHex(stakeKeyHash),
    type: KeyHash
  };

  const delegationCertificate: Cardano.StakeDelegationCertificate = {
    __typename: CertificateType.StakeDelegation,
    stakeCredential,
    poolId: poolToDelegateId
  };

  const stakeKeyCertificate: Cardano.StakeAddressCertificate = {
    __typename: CertificateType.StakeRegistration,
    stakeCredential
  };

  return [...(isStakeKeyRegistered ? [] : [stakeKeyCertificate]), delegationCertificate];
};

export const buildDelegation = async (wallet: ObservableWallet, poolId: Cardano.PoolId): Promise<InitializeTxProps> => {
  const walletRewardAccount = (await firstValueFrom(wallet.delegation.rewardAccounts$))[0];
  // TODO: check if already delegating to same stake pool? [LW-5458]
  const certificates = buildDelegationCertificates(walletRewardAccount, poolId);
  return { certificates };
};
