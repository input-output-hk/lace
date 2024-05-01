import React from 'react';
import { ThemeColorScheme, ThemeProvider, colorSchemaDecorator } from '@lace/ui';
import 'antd/dist/antd.css';
import 'normalize.css';
import './theme.scss';

export const preview = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/
    }
  },
  parameters: {
    // Notifies Chromatic to pause the animations when they finish for all stories.
    chromatic: { pauseAnimationAtEnd: true }
  }
};

export const decorators = [
  (Story, args) => {
    const { decorators: { colorSchema = true } = {} } = args.parameters;
    return colorSchema ? colorSchemaDecorator(Story, args) : <Story />;
  },
  (Story, args) => {
    const { decorators: { theme } = {} } = args.parameters;
    return (
      <ThemeProvider colorScheme={theme ?? ThemeColorScheme.Light}>
        <Story />
      </ThemeProvider>
    );
  }
];
