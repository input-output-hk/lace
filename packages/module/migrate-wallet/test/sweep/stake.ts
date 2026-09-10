import { makeProviders } from '../cardano/queries';

import { selectNetwork } from './networks';
import { REWARDS_DREP } from './rewards-config';
import { accountForRole } from './roles';
import { ensureStakedForRewards } from './setup';

import type { NetworkName } from './networks';
import type { WalletRole } from './roles';

// Usage: `npm run sweep:stake -- <network> <rewards-source-role>`
// Stakes a rewards wallet (register, delegate, vote-delegate) WITHOUT sweeping,
// so it accrues. The scenarios sweep, so they can only run after accrual, this
// is the separate step that starts the ~4-day clock.
const NETWORK = process.argv[2] as NetworkName;
const ROLE = process.argv[3] as WalletRole;

const main = async () => {
  const dRep = REWARDS_DREP[ROLE];
  if (!dRep) {
    throw new Error(
      `no rewards dRep for role "${ROLE}"; expected a rewards-source-* role`,
    );
  }
  const network = selectNetwork(NETWORK);
  const providers = makeProviders(network.config);
  const account = await accountForRole(ROLE, network.chain);
  console.log(`staking ${ROLE} on ${network.name} (${account.address})`);
  await ensureStakedForRewards(providers, {
    account,
    poolId: network.pool,
    dRep,
  });
  console.log('staked; rewards become withdrawable after ~4 epochs (~4 days)');
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
