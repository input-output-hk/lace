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

export type TxDetails = {
  title: string;
  details: string[];
}[];
