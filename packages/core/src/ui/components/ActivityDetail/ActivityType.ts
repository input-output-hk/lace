export type TransactionActivityType =
  | 'outgoing'
  | 'incoming'
  | 'delegation'
  | 'delegationRegistration'
  | 'delegationDeregistration'
  | 'self';

export type RewardsActivityType = 'rewards';

export type ActivityType = TransactionActivityType | RewardsActivityType;
