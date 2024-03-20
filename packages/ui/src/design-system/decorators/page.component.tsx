import type { PropsWithChildren } from 'react';
import React, { useEffect, useRef } from 'react';

import { ThemeColorScheme, ThemeProvider } from '../../design-tokens';
import { Box } from '../box';
import { Divider } from '../divider';
import { Grid, Cell } from '../grid';
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
  const container = useRef<HTMLDivElement>(null);
  const { setPortalContainer } = usePageContext();

  useEffect(() => {
    if (container.current) {
      setPortalContainer(container.current);
    }
  }, [container.current]);

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
      <div id="portal-container" ref={container} />
    </ThemeProvider>
  );
};
