import { Percent } from '@cardano-sdk/util';
import { Wallet } from '@lace/cardano';
import { Box, Flex } from '@lace/ui';
import { StakePoolDetails } from '../drawer';
import { Sections } from '../store';
import stakePoolsRaw from './data.json';
import { Search } from './search';
import { StakePoolsTable } from './stake-pools-table';

const stakePools = stakePoolsRaw.map<Wallet.Cardano.StakePool>((pool) => ({
  ...pool,
  cost: BigInt(pool.cost),
  hexId: Wallet.Cardano.PoolIdHex(pool.hexId),
  id: Wallet.Cardano.PoolId(pool.id),
  metadataJson: undefined, // empty
  metrics: {
    ...pool.metrics,
    livePledge: BigInt(pool.metrics.livePledge),
    // eslint-disable-next-line new-cap
    saturation: Percent(pool.metrics.saturation),
    size: {
      ...pool.metrics.size,
      // eslint-disable-next-line new-cap
      active: Percent(pool.metrics.size.active),
      // eslint-disable-next-line new-cap
      live: Percent(pool.metrics.size.live),
    },
    stake: {
      ...pool.metrics.stake,
      active: BigInt(pool.metrics.stake.active),
      live: BigInt(pool.metrics.stake.live),
    },
  },
  owners: pool.owners.map((owner) => Wallet.Cardano.RewardAccount(owner)),
  pledge: BigInt(pool.pledge),
  relays: [], // empty
  rewardAccount: Wallet.Cardano.RewardAccount(pool.rewardAccount),
  status: pool.status as Wallet.Cardano.StakePoolStatus,
  vrf: Wallet.Cardano.VrfVkHex(pool.vrf),
}));

const stepsWithBackBtn = new Set([Sections.CONFIRMATION, Sections.SIGN]);

const stepsWithExitConfirmation = new Set([Sections.CONFIRMATION, Sections.SIGN, Sections.FAIL_TX]);

export const BrowsePools = () => {
  // TODO: compute real value
  const hasNoFunds = false;
  // eslint-disable-next-line unicorn/consistent-function-scoping,@typescript-eslint/no-empty-function
  const onStake = () => {};

  return (
    <Flex flexDirection={'column'} alignItems={'stretch'}>
      <Search />
      <Box mt={'$32'}>
        <StakePoolsTable
          stakePools={stakePools}
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          loadMoreData={() => {}}
          totalResultCount={stakePoolsRaw.length}
          isSearching={false}
          fetchingPools={false}
          isLoadingList={false}
          scrollableTargetId={'lace-app'}
        />
      </Box>
      <StakePoolDetails
        showCloseIcon
        showBackIcon={(section: Sections): boolean => stepsWithBackBtn.has(section)}
        showExitConfirmation={(section: Sections): boolean => stepsWithExitConfirmation.has(section)}
        canDelegate={!hasNoFunds}
        onStake={onStake}
      />
    </Flex>
  );
};
