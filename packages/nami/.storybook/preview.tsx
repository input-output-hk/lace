import React from 'react';
import type { Preview } from '@storybook/react';
import '../src/ui/app/components/styles.css';
import 'focus-visible/dist/focus-visible';

import { initialize, mswLoader } from 'msw-storybook-addon';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { theme } from '../src/ui/theme';

initialize();

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  loaders: [mswLoader],
};

export const decorators = [
  (Story, { parameters: { colorMode, path } }) => (
    <ChakraProvider
      theme={extendTheme({
        ...theme,
        config: { initialColorMode: colorMode },
      })}
    >
      {Story({ args: { colorMode: colorMode, path } })}
    </ChakraProvider>
  ),
];

export default preview;
