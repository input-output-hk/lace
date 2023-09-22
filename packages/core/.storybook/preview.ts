import type { Preview } from '@storybook/react';
import 'antd/dist/antd.css';
import 'normalize.css';
import './theme.scss';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/
      }
    }
  }
};

export default preview;
