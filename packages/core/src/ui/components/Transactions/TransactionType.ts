export type TransactionType =
  | 'outgoing'
  | 'incoming'
  | 'delegation'
  | 'delegationRegistration'
  | 'delegationDeregistration'
  | 'rewards'
  | 'self'
  // conway era certificates
  | 'drepRegistration'
  | 'drepRetirement'
  | 'drepUpdate'
  | 'voteDelegation'
  | 'stakeVoteDelegation'
  | 'stakeRegistrationDelegation'
  | 'voteRegistrationDelegation'
  | 'stakeVoteRegistrationDelegation'
  | 'authCommitteeHot'
  | 'resignComitteeCold'
  // conway era governance actions
  | 'vote'
  | 'submitProposal';

export const governanceTransactionTypes: Partial<TransactionType[]> = [
  'authCommitteeHot',
  'drepRegistration',
  'drepRetirement',
  'drepUpdate',
  'resignComitteeCold',
  'stakeVoteDelegation',
  'stakeVoteRegistrationDelegation',
  'submitProposal',
  'vote',
  'voteDelegation',
  'voteRegistrationDelegation'
];

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

export type TxDetailsVotingProceduresTitles = 'voterType' | 'voterCredential' | 'vote' | 'anchor' | 'proposalTxHash';

export type TxDetail<T> = {
  title: T;
  details: string[];
};

export type TxDetails<T> = TxDetail<T>[];
