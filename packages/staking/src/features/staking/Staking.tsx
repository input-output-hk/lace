import { Box, Text, ThemeColorScheme, ThemeProvider } from '@lace/ui';
import { BrowsePools } from '../browse-pools';
import { Overview } from '../overview';
import { Navigation, Page } from './Navigation';
import './reset.css';

type StakingProps = {
  theme: 'light' | 'dark';
};

export const Staking = ({ theme }: StakingProps) => (
  <ThemeProvider colorScheme={theme === 'light' ? ThemeColorScheme.Light : ThemeColorScheme.Dark}>
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
  </ThemeProvider>
);
