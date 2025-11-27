/* eslint-disable unicorn/no-null, no-magic-numbers */
import { Wallet } from '@lace/cardano';
import { ActivityType, ConwayEraCertificatesTypes } from '@lace/core';

const DEFAULT_DEPOSIT = BigInt(10_000);
const POOL_ID = Wallet.Cardano.PoolId('pool185g59xpqzt7gf0ljr8v8f3akl95qnmardf2f8auwr3ffx7atjj5');
const CREDENTIAL = {
  type: Wallet.Cardano.CredentialType.KeyHash,
  hash: Wallet.Crypto.Hash28ByteBase16('0d94e174732ef9aae73f395ab44507bfa983d65023c11a951f0c32e4')
};

export const mockConwayCertificates: Partial<
  {
    [Type in ActivityType]: Wallet.Cardano.Certificate;
  }
> = {
  [ConwayEraCertificatesTypes.RegisterDelegateRepresentative]: {
    __typename: Wallet.Cardano.CertificateType.RegisterDelegateRepresentative,
    deposit: DEFAULT_DEPOSIT,
    dRepCredential: CREDENTIAL,
    anchor: null
  },
  [ConwayEraCertificatesTypes.UnregisterDelegateRepresentative]: {
    __typename: Wallet.Cardano.CertificateType.UnregisterDelegateRepresentative,
    deposit: DEFAULT_DEPOSIT,
    dRepCredential: CREDENTIAL
  },
  [ConwayEraCertificatesTypes.UpdateDelegateRepresentative]: {
    __typename: Wallet.Cardano.CertificateType.UpdateDelegateRepresentative,
    dRepCredential: CREDENTIAL,
    anchor: null
  },
  [ConwayEraCertificatesTypes.VoteDelegation]: {
    __typename: Wallet.Cardano.CertificateType.VoteDelegation,
    dRep: CREDENTIAL,
    stakeCredential: CREDENTIAL
  },
  [ConwayEraCertificatesTypes.StakeVoteDelegation]: {
    __typename: Wallet.Cardano.CertificateType.StakeVoteDelegation,
    stakeCredential: CREDENTIAL,
    dRep: CREDENTIAL,
    poolId: POOL_ID
  },
  [ConwayEraCertificatesTypes.VoteRegistrationDelegation]: {
    __typename: Wallet.Cardano.CertificateType.VoteRegistrationDelegation,
    stakeCredential: CREDENTIAL,
    deposit: DEFAULT_DEPOSIT,
    dRep: CREDENTIAL
  },
  [ConwayEraCertificatesTypes.StakeVoteRegistrationDelegation]: {
    __typename: Wallet.Cardano.CertificateType.StakeVoteRegistrationDelegation,
    poolId: POOL_ID,
    deposit: DEFAULT_DEPOSIT,
    dRep: CREDENTIAL,
    stakeCredential: CREDENTIAL
  },
  [ConwayEraCertificatesTypes.StakeRegistrationDelegation]: {
    __typename: Wallet.Cardano.CertificateType.StakeRegistrationDelegation,
    stakeCredential: CREDENTIAL,
    poolId: POOL_ID,
    deposit: DEFAULT_DEPOSIT
  },
  [ConwayEraCertificatesTypes.AuthorizeCommitteeHot]: {
    __typename: Wallet.Cardano.CertificateType.AuthorizeCommitteeHot,
    coldCredential: CREDENTIAL,
    hotCredential: CREDENTIAL
  },
  [ConwayEraCertificatesTypes.ResignCommitteeCold]: {
    __typename: Wallet.Cardano.CertificateType.ResignCommitteeCold,
    coldCredential: CREDENTIAL,
    anchor: null
  }
};
