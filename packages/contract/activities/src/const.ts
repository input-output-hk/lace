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
  // Tx interacts with the cNIGHT DUST designation Plutus V3
  // validator. Registered / updated / deregistered designations all
  // surface under this single type; the action variant + target
  // dust pubkey are carried on `blockchainSpecific.Cardano.
  // nightDesignation` for downstream rendering. Without this entry,
  // designate / update mis-classify as Self (cNIGHT rotation),
  // deregister mis-classifies as Receive (script-locked lovelace
  // returning), and the operation intent is lost in the feed.
  'NightDesignation' = 'NightDesignation',
}

export const ACTIVITIES_PER_PAGE = 10;
export const MAX_ACTIVITIES_PER_ACCOUNT = 20;
