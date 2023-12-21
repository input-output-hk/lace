import { StakingStorybookProvider } from './StakingStorybookProvider';

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
  parameters: {
    // Notifies Chromatic to pause the animations when they finish for all stories.
    chromatic: { pauseAnimationAtEnd: true },
  },
};

const wrapWith = (Component) => (Story) =>
  (
    <Component>
      <Story />
    </Component>
  );

export const decorators = [wrapWith(StakingStorybookProvider)];
