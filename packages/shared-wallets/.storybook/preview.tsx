import { colorSchemaDecorator, ThemeColorScheme, ThemeProvider } from '@input-output-hk/lace-ui-toolkit';
import type { Preview } from '@storybook/react';
import '@lace/configs/storybook/base-styles';
import '@lace/translation';
import React from 'react';

const preview: Preview = {
  decorators: [
    (Story, args) => {
      const { decorators: { colorSchema = false } = {} } = args.parameters;
      return colorSchema ? colorSchemaDecorator(Story, args) : <Story />;
    },
    (Story, args) => {
      const { decorators } = args.parameters;
      return (
        <ThemeProvider colorScheme={decorators?.theme ?? ThemeColorScheme.Light}>
          <Story />
        </ThemeProvider>
      );
    },
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
