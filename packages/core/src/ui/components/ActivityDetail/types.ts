import { Wallet } from '@lace/cardano';

// supported certificates actions
export enum ConwayEraCertificatesTypes {
  'AuthorizeCommitteeHot' = Wallet.Cardano.CertificateType.AuthorizeCommitteeHot,
  'RegisterDelegateRepresentative' = Wallet.Cardano.CertificateType.RegisterDelegateRepresentative,
  'ResignCommitteeCold' = Wallet.Cardano.CertificateType.ResignCommitteeCold,
  'VoteRegistrationDelegation' = Wallet.Cardano.CertificateType.VoteRegistrationDelegation,
  'VoteDelegation' = Wallet.Cardano.CertificateType.VoteDelegation,
  'UpdateDelegateRepresentative' = Wallet.Cardano.CertificateType.UpdateDelegateRepresentative,
  'UnregisterDelegateRepresentative' = Wallet.Cardano.CertificateType.UnregisterDelegateRepresentative,
  'StakeVoteRegistrationDelegation' = Wallet.Cardano.CertificateType.StakeVoteRegistrationDelegation,
  'StakeVoteDelegation' = Wallet.Cardano.CertificateType.StakeVoteDelegation,
  'StakeRegistrationDelegation' = Wallet.Cardano.CertificateType.StakeRegistrationDelegation
}

// cip 1694 governance actions
export enum Cip1694GovernanceActivityType {
  ParameterChangeAction = 'ParameterChangeAction',
  HardForkInitiationAction = 'HardForkInitiationAction',
  TreasuryWithdrawalsAction = 'TreasuryWithdrawalsAction',
  NoConfidence = 'NoConfidence',
  UpdateCommittee = 'UpdateCommittee',
  NewConstitution = 'NewConstitution',
  InfoAction = 'InfoAction'
}

export enum ConwayEraGovernanceActions {
  'vote' = 'vote'
}

export enum DelegationActivityType {
  'delegation' = 'delegation',
  'delegationRegistration' = 'delegationRegistration',
  'delegationDeregistration' = 'delegationDeregistration'
}

export enum TransactionActivityType {
  'outgoing' = 'outgoing',
  'incoming' = 'incoming',
  'self' = 'self',
  'rewards' = 'rewards'
}

export type TxDetailsCertificateTitles =
  | 'certificateType'
  | 'drep'
  | 'anchor'
  | 'coldCredential'
  | 'hotCredential'
  | 'drepCredential'
  | 'depositPaid';

export type TxDetailsProposalProceduresTitles =
  | 'type'
  | 'governanceActionId'
  | 'rewardAccount'
  | 'anchor'
  | 'protocolParamUpdate'
  | 'protocolVersion'
  | 'withdrawals'
  | 'membersToBeRemoved'
  | 'membersToBeAdded'
  | 'newQuorumThreshold'
  | 'constitutionAnchor';

export type TxDetailsVotingProceduresTitles =
  | 'voterType'
  | 'voterCredential'
  | 'vote'
  | 'anchor'
  | 'proposalTxHash'
  | 'actionIndex';

export type TxDetail<T> = {
  title: T;
  details: string[];
};

export type TxDetails<T> = TxDetail<T>[];

export type GovernanceTransactionTypes =
  | ConwayEraCertificatesTypes
  | ConwayEraGovernanceActions
  | Cip1694GovernanceActivityType;
export type ActivityType = DelegationActivityType | TransactionActivityType | GovernanceTransactionTypes;
