export enum ActivityType {
  'Send' = 'Send',
  'Receive' = 'Receive',
  'Rewards' = 'Rewards',
  'Self' = 'Self',
  'Failed' = 'Failed',
  'Pending' = 'Pending',
  'Delegation' = 'Delegation',
  'Registration' = 'Registration',
  'Deregistration' = 'Deregistration',
  'Withdrawal' = 'Withdrawal',
}

export const ACTIVITIES_PER_PAGE = 10;
export const MAX_ACTIVITIES_PER_ACCOUNT = 20;
