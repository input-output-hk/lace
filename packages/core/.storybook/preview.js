import React from 'react';
import 'antd/dist/antd.css';
import 'normalize.css';
import './theme.scss';
import { ThemeColorScheme, ThemeProvider } from '@lace/ui';

const preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/
      }
    }
  },
  decorators: [
    (Story) => (
      <ThemeProvider colorScheme={ThemeColorScheme.Light}>
        <Story />
      </ThemeProvider>
    )
  ]
};

export default preview;
