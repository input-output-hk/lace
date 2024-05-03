import type { PropsWithChildren } from 'react';
import React, { useEffect, useRef } from 'react';

import {
  LocalThemeProvider,
  ThemeColorScheme,
  ThemeProvider,
} from '../../design-tokens';
import { Box } from '../box';
import { Divider } from '../divider';
import { Cell, Grid } from '../grid';
import { Text } from '../text';

import { usePageContext } from './page.context';
import { subtitleBox } from './page.css';

export type PageProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
}>;

export const Page = ({
  children,
  title,
  subtitle,
}: Readonly<PageProps>): JSX.Element => {
  const lightThemeContainer = useRef<HTMLDivElement>(null);
  const darkThemeContainer = useRef<HTMLDivElement>(null);
  const { setPortalContainers } = usePageContext();

  useEffect(() => {
    if (lightThemeContainer.current && darkThemeContainer.current) {
      setPortalContainers({
        lightTheme: lightThemeContainer.current,
        darkTheme: darkThemeContainer.current,
      });
    }
  }, [lightThemeContainer.current, darkThemeContainer.current]);

  return (
    <ThemeProvider colorScheme={ThemeColorScheme.Light}>
      <div style={{ height: '100%', width: '100%' }}>
        <Grid columns="$1" rows="$fitContent">
          <Cell>
            <Text.Display>{title}</Text.Display>
            {Boolean(subtitle) && (
              <Box pt="$32">
                <div className={subtitleBox}>
                  <Text.Body.Large>{subtitle}</Text.Body.Large>
                </div>
              </Box>
            )}

            <Divider mt="$96" mb="$64" />
          </Cell>
          {children}
        </Grid>
      </div>
      <div id="light-theme-portal-container" ref={lightThemeContainer} />
      <LocalThemeProvider colorScheme={ThemeColorScheme.Dark}>
        <div id="dark-theme-portal-container" ref={darkThemeContainer} />
      </LocalThemeProvider>
    </ThemeProvider>
  );
};
