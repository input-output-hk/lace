import { Cardano } from '@cardano-sdk/core';

import type { WalletRole } from './roles';

/**
 * Vote-delegation target per rewards role. Abstain leaves rewards withdrawable
 * (swept-with-rewards). A real, live preview DRep leaves them blocked for the
 * single-tx sweep (rewards-not-vote-delegated). Post-Plomin a stake must be
 * vote-delegated to accrue withdrawable rewards at all, so the blocked state
 * needs a real DRep, not a missing vote.
 */
export const REWARDS_DREP: Partial<
  Record<WalletRole, Cardano.DelegateRepresentative>
> = {
  'rewards-source-abstain': { __typename: 'AlwaysAbstain' },
  'rewards-source-blocked': Cardano.DRepID.toCredential(
    Cardano.DRepID(
      'drep1y2ldnl4ugmhx873hpw7x23rvqe7krtwvgmvqjn3hy62xv6c8ashc0',
    ),
  ),
};
