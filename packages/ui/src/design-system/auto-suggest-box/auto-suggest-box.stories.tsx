import type { ReactChildren } from 'react';
import React from 'react';

import type { Meta } from '@storybook/react';

import { LocalThemeProvider, ThemeColorScheme } from '../../design-tokens';
import { Box } from '../box';
import { page, Section, Variants } from '../decorators';
import { Divider } from '../divider';
import { Flex } from '../flex';
import { Cell, Grid } from '../grid';

import {
  AutoSuggestBox,
  AutoSuggestBoxBase,
} from './auto-suggest-box.component';
import { AutoSuggestBoxContext } from './auto-suggest-box.provider';

const subtitle = 'Input with auto suggestions';

export default {
  title: 'Input Fields/AutoSuggestBox',
  component: AutoSuggestBox,
  decorators: [page({ title: 'Auto Suggest Box', subtitle })],
} as Meta;

const Provider = ({
  children,
}: Readonly<React.PropsWithChildren<void>>): JSX.Element => (
  <AutoSuggestBoxContext.Provider
    value={{
      setValue: () => void 0,
      setIsSuggesting: () => void 0,
      suggestions: [
        { value: 'apple' },
        { value: 'orange' },
        { value: 'grape' },
      ],
      value: '',
      isSuggesting: true,
    }}
  >
    {children}
  </AutoSuggestBoxContext.Provider>
);
const MainComponents = (): JSX.Element => (
  <>
    <Variants.Row>
      <Variants.Cell>
        <AutoSuggestBox label="label" />
      </Variants.Cell>
      <Variants.Cell>
        <AutoSuggestBox label="label" id="hover" />
      </Variants.Cell>
      <Variants.Cell>
        <Provider>
          <Box h="$214">
            <AutoSuggestBoxBase label="label" />
          </Box>
        </Provider>
      </Variants.Cell>
      <Variants.Cell>
        <AutoSuggestBox label="label" errorMessage="Error" />
      </Variants.Cell>
      <Variants.Cell>
        <AutoSuggestBox label="label" disabled />
      </Variants.Cell>
      <Variants.Cell>
        <AutoSuggestBox id="focus" label="label" />
      </Variants.Cell>
    </Variants.Row>
    <Variants.Row>
      <Variants.Cell>
        <AutoSuggestBox initialValue="Value" label="label" />
      </Variants.Cell>
      <Variants.Cell>
        <AutoSuggestBox initialValue="Value" label="label" id="hover" />
      </Variants.Cell>
      <Variants.Cell>
        <AutoSuggestBox initialValue="Value" label="label" />
      </Variants.Cell>
      <Variants.Cell>
        <AutoSuggestBox
          initialValue="Value"
          label="label"
          errorMessage="Error"
        />
      </Variants.Cell>
      <Variants.Cell>
        <AutoSuggestBox initialValue="Value" label="label" disabled />
      </Variants.Cell>
      <Variants.Cell>
        <AutoSuggestBox id="focus" initialValue="Value" label="label" />
      </Variants.Cell>
    </Variants.Row>
  </>
);

export const Overview = (): JSX.Element => {
  return (
    <Grid>
      <Cell>
        <Section title="Copy for use">
          <Flex flexDirection="column" alignItems="center" w="$fill" my="$32">
            <Box w="$312">
              <AutoSuggestBox
                items={[
                  { value: 'apple' },
                  { value: 'orange' },
                  { value: 'grape' },
                  { value: 'banana' },
                  { value: 'pear' },
                ]}
                label="Auto suggest box"
              />
            </Box>
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
