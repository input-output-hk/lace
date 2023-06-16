import { Story, ThemeState, useLadleContext } from '@ladle/react';
import { StoryDefault } from '@ladle/react/lib/app/exports';
import { Staking } from './Staking';

export const StakingPage: Story = () => {
  const {
    globalState: { theme },
  } = useLadleContext();
  return <Staking theme={theme === ThemeState.Light ? 'light' : 'dark'} />;
};

const storyDefault: StoryDefault = {
  title: 'Staking',
};

export default storyDefault;
