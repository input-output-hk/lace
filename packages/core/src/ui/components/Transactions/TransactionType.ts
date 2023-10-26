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

/* export type TxCertificateTitles =
  | 'anchor'
  | 'type'
  | 'drep'
  | 'coldCredential'
  | 'hotCredential'
  | 'drepCredential'
  | 'depositPaid';

// todo replace with real things

export type TxDetails<T> = Array<{
  title: T;
  details: string[];
}>;
*/
export type TxDetails = {
  title: string;
  details: string[];
}[];
