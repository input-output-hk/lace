import React from 'react';

import type { Meta } from '@storybook/react';

import { LocalThemeProvider, ThemeColorScheme } from '../../design-tokens';
import { page, Section, Variants } from '../decorators';
import { Divider } from '../divider';
import { Flex } from '../flex';
import { Cell, Grid } from '../grid';

import { Input } from './input.component';
import * as cx from './input.stories.css';

export default {
  title: 'Input Fields/Input',
  component: Input,
  decorators: [
    page({
      title: 'Input',
    }),
  ],
} as Meta;

const MainComponents = (): JSX.Element => (
  <>
    <Variants.Row>
      <Variants.Cell>
        <Input label="Label" value="" />
      </Variants.Cell>
      <Variants.Cell>
        <Input label="Label" value="" containerClassName={cx.hoverEffect} />
      </Variants.Cell>
      <Variants.Cell>
        <Input label="Label" value="Input Text" />
      </Variants.Cell>
      <Variants.Cell>
        <Input label="Label" value="Input Text" errorMessage="Error" />
      </Variants.Cell>
      <Variants.Cell>
        <Input label="Label" value="Input Text" disabled />
      </Variants.Cell>
      <Variants.Cell>
        <Input label="Label" value="" containerClassName={cx.focusEffect} />
      </Variants.Cell>
    </Variants.Row>
  </>
);

export const Overview = (): JSX.Element => {
  const [value, setValue] = React.useState('');

  return (
    <Grid>
      <Cell>
        <Section title="Copy for use">
          <Flex flexDirection="column" alignItems="center" w="$fill" my="$32">
            <Input
              value={value}
              label="Text"
              onChange={(event): void => {
                setValue(event.target.value);
              }}
            />
          </Flex>
        </Section>

        <Divider my="$64" />

        <Section title="Main components">
          <Variants.Table
            headers={[
              'Rest',
              'Hover',
              'Active/Pressed',
              'Error',
              'Disabled',
              'Focused',
            ]}
          >
            <MainComponents />
          </Variants.Table>
          <LocalThemeProvider colorScheme={ThemeColorScheme.Dark}>
            <Variants.Table>
              <MainComponents />
            </Variants.Table>
          </LocalThemeProvider>
        </Section>
      </Cell>
    </Grid>
  );
};
