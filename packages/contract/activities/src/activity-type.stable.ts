// The stable SDK build resolves this file in place of activity-type.ts: the
// stable SDK classifies no designation transaction, so it has no such activity
// type. activity-type.test.ts keeps the two enums in step.
/** What an activity did, such as `Send`, `Receive`, `Rewards` or `Delegation`. */
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
