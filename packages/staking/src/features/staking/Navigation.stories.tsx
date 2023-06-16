import type { Story, StoryDefault } from '@ladle/react';
import { Navigation, Page } from './Navigation';

export const StakingNavigation: Story = () => (
  <Navigation>
    {(activePage) => (
      <>
        {activePage === Page.overview && 'Overview sub-page'}
        {activePage === Page.browsePools && 'Browse pools sub-page'}
      </>
    )}
  </Navigation>
);

const storyDefault: StoryDefault = {
  title: 'Staking / Staking Navigation',
};

export default storyDefault;
