import React from 'react';

import type { Meta } from '@storybook/react';

import { LocalThemeProvider, ThemeColorScheme } from '../../design-tokens';
import { Box } from '../box';
import { page, Section, Variants } from '../decorators';
import { Cell, Grid } from '../grid';
import { Text } from '../text';

import { ScrollArea } from './scroll-area.component';

const subtitle = `Scroll bars enable content to extend beyond the bounds of the viewport (visible area). Users reach this content by manipulating the scroll viewer surface through touch, mousewheel, keyboard, or a gamepad, or by using the mouse or pen cursor to interact with the scroll viewer's scrollbar.
Minimum height: 40px.`;

export default {
  title: 'Basic Input/Scroll Area',
  component: ScrollArea,
  decorators: [page({ title: 'Scroll bar', subtitle })],
} as Meta;

const Demo = (): JSX.Element => {
  return (
    <div style={{ height: '256px', width: '200px' }}>
      <ScrollArea>
        <Grid>
          <Cell>
            {Array.from({ length: 50 }).map((_, index) => (
              <Box my="$4" key={`tag:${index}`}>
                <Text.Body.Normal>
                  {`v1.2.0-beta.${index + 1}`}
                </Text.Body.Normal>
              </Box>
            ))}
          </Cell>
        </Grid>
      </ScrollArea>
    </div>
  );
};

const ScrollAreaPreview = (): JSX.Element => (
  <>
    <Variants.Row>
      <Variants.Cell>
        <Demo />
      </Variants.Cell>
      <Variants.Cell>
        <div id="hover-state">
          <Demo />
        </div>
      </Variants.Cell>
    </Variants.Row>
  </>
);

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Main components">
        <Variants.Table headers={['Rest / default', 'Hover']}>
          <ScrollAreaPreview />
        </Variants.Table>

        <LocalThemeProvider colorScheme={ThemeColorScheme.Dark}>
          <Variants.Table>
            <ScrollAreaPreview />
          </Variants.Table>
        </LocalThemeProvider>
      </Section>
    </Cell>
  </Grid>
);
