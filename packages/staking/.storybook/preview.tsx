import React from 'react';
import type { Preview, Decorator } from '@storybook/react';
// @ts-ignore
import { StakingStorybookProvider } from './StakingStorybookProvider';
import '@lace/translation';

const wrapWith =
  (Component: React.FunctionComponent): Decorator =>
  (Story) =>
    (
      <Component>
        <Story />
      </Component>
    );

const preview: Preview = {
  parameters: {
    chromatic: { pauseAnimationAtEnd: true },
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [wrapWith(StakingStorybookProvider)],
};

export default preview;
