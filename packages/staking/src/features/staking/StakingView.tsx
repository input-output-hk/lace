import { Box, Text } from '@lace/ui';
import { BrowsePools } from '../browse-pools';
import { Overview } from '../overview';
import { Navigation, Page } from './Navigation';

export const StakingView = () => (
  <>
    <Box mb={'$56'}>
      <Text.Heading>Staking</Text.Heading>
    </Box>
    <Navigation>
      {(activePage) => (
        <Box mt={'$40'}>
          {activePage === Page.overview && <Overview />}
          {activePage === Page.browsePools && <BrowsePools />}
        </Box>
      )}
    </Navigation>
  </>
);
