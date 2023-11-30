import React from 'react';

import type { Meta } from '@storybook/react';

import { LocalThemeProvider, ThemeColorScheme } from '../../design-tokens';
import { page, Section, Variants } from '../decorators';
import { Divider } from '../divider';
import { Flex } from '../flex';
import { Cell, Grid } from '../grid';

import { TextBox } from './text-box.component';

export default {
  title: 'Input Fields/Text Box',
  component: TextBox,
  decorators: [
    page({
      title: 'Text Box',
      subtitle: 'A text input',
    }),
  ],
} as Meta;

const MainComponents = (): JSX.Element => (
  <Variants.Row>
    <Variants.Cell>
      <TextBox label="Label" value="" />
    </Variants.Cell>
    <Variants.Cell>
      <TextBox label="Label" value="" id="hover" />
    </Variants.Cell>
    <Variants.Cell>
      <TextBox label="Label" value="Input Text" />
    </Variants.Cell>
    <Variants.Cell>
      <TextBox label="Label" value="Input Text" errorMessage="Error" />
    </Variants.Cell>
    <Variants.Cell>
      <TextBox label="Label" value="Input Text" disabled />
    </Variants.Cell>
    <Variants.Cell>
      <TextBox label="Label" value="" id="focus" />
    </Variants.Cell>
  </Variants.Row>
);

export const Overview = (): JSX.Element => {
  const [value, setValue] = React.useState('');

  return (
    <Grid>
      <Cell>
        <Section title="Copy for use">
          <Flex flexDirection="column" alignItems="center" w="$fill" my="$32">
            <TextBox
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

Overview.parameters = {
  pseudo: {
    hover: '#hover',
    focus: '#focus',
  },
};
