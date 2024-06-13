import { colorSchemaDecorator, ThemeColorScheme, ThemeProvider } from '@lace/ui';
import type { Preview } from '@storybook/react';
import React from 'react';
import '@lace/translation';
import '@lace/configs/storybook/base-styles';

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
    }
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
