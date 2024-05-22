import React from 'react';

import type { DecoratorFunction } from '@storybook/csf/dist/story';
import type { ReactFramework } from '@storybook/react';

import { ThemeColorScheme, LocalThemeProvider } from '../../../design-tokens';

import * as styles from './color-schema.css';

export const colorSchemaDecorator: DecoratorFunction<
  ReactFramework
> = Story => (
  <div className={styles.root}>
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
  </div>
);
