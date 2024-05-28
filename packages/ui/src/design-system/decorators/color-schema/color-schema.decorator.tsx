import React from 'react';

import type { DecoratorFunction } from '@storybook/csf/dist/story';
import type { ReactFramework } from '@storybook/react';

import { ThemeColorScheme, LocalThemeProvider } from '../../../design-tokens';
import { Flex } from '../../flex';

import * as styles from './color-schema.css';

export const colorSchemaDecorator: DecoratorFunction<ReactFramework> = (
  Story,
  {
    parameters: {
      decorators: { layout = 'horizontal' },
    },
  },
) => (
  <Flex
    className={styles.root}
    flexDirection={layout === 'horizontal' ? 'row' : 'column'}
  >
    <LocalThemeProvider
      colorScheme={ThemeColorScheme.Light}
      className={styles.storyContainer}
    >
      <Story />
    </LocalThemeProvider>
    <LocalThemeProvider
      colorScheme={ThemeColorScheme.Dark}
      className={styles.storyContainer}
    >
      <Story />
    </LocalThemeProvider>
  </Flex>
);
