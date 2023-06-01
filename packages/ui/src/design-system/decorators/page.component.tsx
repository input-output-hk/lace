import type { PropsWithChildren } from 'react';
import React from 'react';

import { ThemeColorScheme, ThemeProvider } from '../../design-tokens';
import { Box } from '../box';
import { Divider } from '../divider';
import { Grid, Cell } from '../grid';
import * as Text from '../typography';

import { subtitleBox } from './page.css';

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
}>;

export const Page = ({
  children,
  title,
  subtitle,
}: Readonly<Props>): JSX.Element => {
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
    </ThemeProvider>
  );
};
