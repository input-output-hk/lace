import React from 'react';
import 'antd/dist/antd.css';
import 'normalize.css';
import './theme.scss';
import { ThemeColorScheme, ThemeProvider } from '@lace/ui';

export const customViewports = {
  popup: {
    name: 'Popup',
    styles: {
      width: '360px',
      height: '600'
    }
  }
};

export const preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/
      }
    },
    viewport: {
      viewports: customViewports,
      defaultViewport: 'Popup'
    }
  }
};

export const decorators = [
  (Story) => {
    return (
      <ThemeProvider colorScheme={ThemeColorScheme.Light}>
        <Story />
      </ThemeProvider>
    );
  }
];
