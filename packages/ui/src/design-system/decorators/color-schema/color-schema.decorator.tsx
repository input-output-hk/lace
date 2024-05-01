import React from 'react';

import type { DecoratorFunction } from '@storybook/csf/dist/story';
import type { ReactFramework } from '@storybook/react';

import { ThemeColorScheme, LocalThemeProvider } from '../../../design-tokens';
import { Box } from '../../box';
import { Flex } from '../../flex';

import * as styles from './color-schema.css';

export const colorSchemaDecorator: DecoratorFunction<
  ReactFramework
> = Story => (
  <Flex className={styles.root} flexDirection="row">
    <Box className={styles.storyContainer}>{<Story />}</Box>
    <LocalThemeProvider
      colorScheme={ThemeColorScheme.Dark}
      className={styles.storyContainer}
    >
      <Story />
    </LocalThemeProvider>
  </Flex>
);
