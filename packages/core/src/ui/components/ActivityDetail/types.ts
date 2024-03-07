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
  | 'coldCredential'
  | 'hotCredential'
  | 'stakeKey'
  | 'drepId'
  | 'anchorURL'
  | 'anchorHash'
  | 'poolId'
  | 'drep'
  | 'depositPaid'
  | 'depositPaidInfo'
  | 'depositReturned'
  | 'depositReturnedInfo'
  | 'certificate';

export type TxDetailsProposalProceduresTitles =
  | 'type'
  | 'deposit'
  | 'rewardAccount'
  | 'anchorHash'
  | 'anchorURL'
  | 'governanceActionID'
  | 'actionIndex'
  | 'newQuorumThreshold'
  | 'withdrawal'
  | 'withdrawalRewardAccount'
  | 'withdrawalAmount'
  | 'constitutionAnchorURL'
  | 'constitutionScriptHash'
  | 'coldCredentialHash'
  | 'epoch'
  | 'membersToBeAdded'
  | 'hash'
  | 'membersToBeRemoved'
  | 'protocolVersionMajor'
  | 'protocolVersionMinor'
  | 'protocolVersionPatch'
  | 'maxTxExUnits'
  | 'maxBlockExUnits'
  | 'networkGroup'
  | 'economicGroup'
  | 'technicalGroup'
  | 'costModels'
  | 'governanceGroup'
  | 'dRepVotingThresholds'
  | 'memory'
  | 'step'
  | 'maxBBSize'
  | 'maxTxSize'
  | 'maxBHSize'
  | 'maxValSize'
  | 'maxCollateralInputs'
  | 'minFeeA'
  | 'minFeeB'
  | 'keyDeposit'
  | 'poolDeposit'
  | 'rho'
  | 'tau'
  | 'minPoolCost'
  | 'coinsPerUTxOByte'
  | 'a0'
  | 'eMax'
  | 'nOpt'
  | 'collateralPercentage'
  | 'prices'
  | 'PlutusV1'
  | 'PlutusV2'
  | 'govActionLifetime'
  | 'govActionDeposit'
  | 'drepDeposit'
  | 'drepActivity'
  | 'ccMinSize'
  | 'ccMaxTermLength'
  | 'motionNoConfidence'
  | 'committeeNormal'
  | 'committeeNoConfidence'
  | 'updateConstitution'
  | 'hardForkInitiation'
  | 'ppNetworkGroup'
  | 'ppEconomicGroup'
  | 'ppTechnicalGroup'
  | 'ppGovernanceGroup'
  | 'treasuryWithdrawal';

export type TxDetailsVotingProceduresTitles =
  | 'voterType'
  | 'voterCredential'
  | 'voteTypes'
  | 'drepId'
  | 'anchorHash'
  | 'anchorURL';

export type TxDetail<T> = {
  title: T;
  info?: T;
  details: (string | [string, string])[];
};

export type TxDetaisList<T> = {
  header: T;
  details: TxDetail<T>[];
};

export type TxDetails<T> = (TxDetail<T> | TxDetaisList<T>)[];

export type GovernanceTransactionTypes =
  | ConwayEraCertificatesTypes
  | ConwayEraGovernanceActions
  | Cip1694GovernanceActivityType;
export type ActivityType = DelegationActivityType | TransactionActivityType | GovernanceTransactionTypes;
