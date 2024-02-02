/* eslint-disable functional/no-loop-statements */
/* eslint-disable react/display-name */
import React from 'react';

import { expect } from '@storybook/jest';
import type { ComponentStory, Meta } from '@storybook/react';
import { userEvent, within } from '@storybook/testing-library';

import { LocalThemeProvider, ThemeColorScheme } from '../../design-tokens';
import { sleep } from '../../test';
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

const SUGGESTIONS = [
  { value: 'apple' },
  { value: 'orange' },
  { value: 'grape' },
  { value: 'banana' },
  { value: 'pear' },
];

export default {
  title: 'Input Fields/Auto Suggest Box',
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
      suggestions: SUGGESTIONS.slice(0, 3),
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
            <AutoSuggestBox
              suggestions={SUGGESTIONS}
              label="Auto suggest box"
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

type Interactions = ComponentStory<typeof AutoSuggestBox>;

const createInteraction: () => Interactions = () => (): JSX.Element =>
  (
    <Flex
      flexDirection="column"
      alignItems="center"
      w="$fill"
      my="$32"
      mb="$312"
    >
      <Box w="$312">
        <AutoSuggestBox suggestions={SUGGESTIONS} label="Auto suggest box" />
      </Box>
    </Flex>
  );

export const SuggestAndErase = createInteraction();
export const SuggestAndPick = createInteraction();

SuggestAndErase.play = async ({ canvasElement }): Promise<void> => {
  const canvas = within(canvasElement);

  await sleep();

  userEvent.click(canvas.getByTestId('auto-suggest-box-button-open'));

  expect(
    await canvas.findByTestId('auto-suggest-box-suggestion-apple'),
  ).toBeInTheDocument();
  expect(
    await canvas.findByTestId('auto-suggest-box-suggestion-orange'),
  ).toBeInTheDocument();
  expect(
    await canvas.findByTestId('auto-suggest-box-suggestion-grape'),
  ).toBeInTheDocument();
  expect(
    await canvas.findByTestId('auto-suggest-box-suggestion-banana'),
  ).toBeInTheDocument();
  expect(
    await canvas.findByTestId('auto-suggest-box-suggestion-pear'),
  ).toBeInTheDocument();

  await sleep();

  await userEvent.type(canvas.getByTestId('auto-suggest-box-input'), 'ra', {
    delay: 100,
  });

  await sleep();

  expect(await canvas.findByTestId('auto-suggest-box-input')).toHaveValue('ra');

  expect(
    canvas.queryByTestId('auto-suggest-box-suggestion-apple'),
  ).not.toBeInTheDocument();
  expect(
    await canvas.findByTestId('auto-suggest-box-suggestion-orange'),
  ).toBeInTheDocument();
  expect(
    await canvas.findByTestId('auto-suggest-box-suggestion-grape'),
  ).toBeInTheDocument();
  expect(
    canvas.queryByTestId('auto-suggest-box-suggestion-banana'),
  ).not.toBeInTheDocument();
  expect(
    canvas.queryByTestId('auto-suggest-box-suggestion-pear'),
  ).not.toBeInTheDocument();

  await sleep();

  userEvent.click(canvas.getByTestId('auto-suggest-box-button-close'));

  expect(await canvas.findByTestId('auto-suggest-box-input')).toHaveValue('');
};

SuggestAndPick.play = async ({ canvasElement }): Promise<void> => {
  const canvas = within(canvasElement);

  await sleep();

  userEvent.click(canvas.getByTestId('auto-suggest-box-button-open'));

  expect(
    await canvas.findByTestId('auto-suggest-box-suggestion-apple'),
  ).toBeInTheDocument();
  expect(
    await canvas.findByTestId('auto-suggest-box-suggestion-orange'),
  ).toBeInTheDocument();
  expect(
    await canvas.findByTestId('auto-suggest-box-suggestion-grape'),
  ).toBeInTheDocument();
  expect(
    await canvas.findByTestId('auto-suggest-box-suggestion-banana'),
  ).toBeInTheDocument();
  expect(
    await canvas.findByTestId('auto-suggest-box-suggestion-pear'),
  ).toBeInTheDocument();

  await sleep();

  await userEvent.type(canvas.getByTestId('auto-suggest-box-input'), 'ra', {
    delay: 100,
  });

  await sleep();

  expect(await canvas.findByTestId('auto-suggest-box-input')).toHaveValue('ra');

  expect(
    canvas.queryByTestId('auto-suggest-box-suggestion-apple'),
  ).not.toBeInTheDocument();
  expect(
    await canvas.findByTestId('auto-suggest-box-suggestion-orange'),
  ).toBeInTheDocument();
  expect(
    await canvas.findByTestId('auto-suggest-box-suggestion-grape'),
  ).toBeInTheDocument();
  expect(
    canvas.queryByTestId('auto-suggest-box-suggestion-banana'),
  ).not.toBeInTheDocument();
  expect(
    canvas.queryByTestId('auto-suggest-box-suggestion-pear'),
  ).not.toBeInTheDocument();

  await sleep();

  userEvent.click(canvas.getByTestId('auto-suggest-box-suggestion-orange'));

  expect(await canvas.findByTestId('auto-suggest-box-input')).toHaveValue(
    'orange',
  );
};
