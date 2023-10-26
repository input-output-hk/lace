/* eslint-disable unicorn/no-null, no-magic-numbers */
import { Wallet } from '@lace/cardano';
import { TransactionType } from '@lace/core';

const DEFAULT_DEPOSIT = BigInt(10_000);
const REWARD_ACCOUNT = Wallet.Cardano.RewardAccount('stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj');
const STAKE_KEY_HASH = Wallet.Cardano.RewardAccount.toHash(REWARD_ACCOUNT);
const POOL_ID = Wallet.Cardano.PoolId('pool185g59xpqzt7gf0ljr8v8f3akl95qnmardf2f8auwr3ffx7atjj5');
const CREDENTIAL = {
  type: Wallet.Cardano.CredentialType.KeyHash,
  hash: Wallet.Crypto.Hash28ByteBase16('0d94e174732ef9aae73f395ab44507bfa983d65023c11a951f0c32e4')
};

export const mockConwayCertificates: Partial<
  {
    [Type in TransactionType]: Wallet.Cardano.Certificate;
  }
> = {
  drepRegistration: {
    __typename: Wallet.Cardano.CertificateType.RegisterDelegateRepresentative,
    deposit: DEFAULT_DEPOSIT,
    dRepCredential: CREDENTIAL,
    anchor: null
  },
  drepRetirement: {
    __typename: Wallet.Cardano.CertificateType.UnregisterDelegateRepresentative,
    deposit: DEFAULT_DEPOSIT,
    dRepCredential: CREDENTIAL
  },
  drepUpdate: {
    __typename: Wallet.Cardano.CertificateType.UpdateDelegateRepresentative,
    dRepCredential: CREDENTIAL,
    anchor: null
  },
  voteDelegation: {
    __typename: Wallet.Cardano.CertificateType.VoteDelegation,
    dRep: CREDENTIAL,
    stakeKeyHash: STAKE_KEY_HASH
  },
  stakeVoteDelegation: {
    __typename: Wallet.Cardano.CertificateType.StakeVoteDelegation,
    stakeKeyHash: STAKE_KEY_HASH,
    dRep: CREDENTIAL,
    poolId: POOL_ID
  },
  voteRegistrationDelegation: {
    __typename: Wallet.Cardano.CertificateType.VoteRegistrationDelegation,
    stakeKeyHash: STAKE_KEY_HASH,
    deposit: DEFAULT_DEPOSIT,
    dRep: CREDENTIAL
  },
  stakeVoteRegistrationDelegation: {
    __typename: Wallet.Cardano.CertificateType.StakeVoteRegistrationDelegation,
    poolId: POOL_ID,
    deposit: DEFAULT_DEPOSIT,
    dRep: CREDENTIAL,
    stakeKeyHash: STAKE_KEY_HASH
  },
  stakeRegistrationDelegation: {
    __typename: Wallet.Cardano.CertificateType.StakeRegistrationDelegation,
    stakeKeyHash: STAKE_KEY_HASH,
    poolId: POOL_ID,
    deposit: DEFAULT_DEPOSIT
  },
  authCommitteeHot: {
    __typename: Wallet.Cardano.CertificateType.AuthorizeCommitteeHot,
    coldCredential: CREDENTIAL,
    hotCredential: CREDENTIAL
  },
  resignComitteeCold: {
    __typename: Wallet.Cardano.CertificateType.ResignCommitteeCold,
    coldCredential: CREDENTIAL
  }
};
