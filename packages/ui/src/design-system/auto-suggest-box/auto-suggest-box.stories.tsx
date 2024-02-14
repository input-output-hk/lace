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
import * as Text from '../typography';

import { ValidationStatus } from './auto-suggest-box-types';
import { AutoSuggestBox } from './auto-suggest-box.component';

import type {
  SuggestionClassicType,
  SuggestionThreeItemType,
} from './auto-suggest-box-types';
import type { Props } from './auto-suggest-box.component';

const subtitle = 'Input with auto suggestions';

const SUGGESTIONS: SuggestionClassicType[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'orange', label: 'Orange' },
  { value: 'grape', label: 'Grape' },
  { value: 'banana', label: 'Banana' },
  { value: 'pear', label: 'Pear' },
];

const ADDRESS_SUGGESTIONS: SuggestionThreeItemType[] = [
  {
    title: 'Alice',
    description: 'addr1q12ab...0t7a1',
    value: 'addr1q12ab0t7a1',
  },
  {
    title: 'Bob',
    description: 'addr1r23de...1u8b2',
    value: 'addr1r23de1u8b2',
  },
  {
    title: 'Charlie',
    description: 'addr1s45fg...2v9c3',
    value: 'addr1s45fg2v9c3',
  },
];

export default {
  title: 'Input Fields/Auto Suggest Box',
  component: AutoSuggestBox,
  decorators: [page({ title: 'Auto Suggest Box', subtitle })],
} as Meta;

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
        <AutoSuggestBox label="label" />
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
    <Grid columns="$1">
      <Section title="Copy for use">
        <Grid columns="$2">
          <Cell>
            <Text.SubHeading>Classic item dropdown</Text.SubHeading>
            <Flex flexDirection="column" w="$fill" my="$32">
              <Box w="$420">
                <AutoSuggestBox
                  suggestions={SUGGESTIONS}
                  label="Auto suggest box"
                />
              </Box>
            </Flex>
          </Cell>
          <Cell>
            <Text.SubHeading>3 item dropdown</Text.SubHeading>
            <Flex flexDirection="column" w="$fill" my="$32">
              <Box w="$420">
                <AutoSuggestBox
                  suggestions={ADDRESS_SUGGESTIONS}
                  label="Auto suggest box"
                />
              </Box>
            </Flex>
          </Cell>
        </Grid>
      </Section>
      <Divider my="$64" />
      <Section title="Main components">
        <Cell>
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
        </Cell>
      </Section>
    </Grid>
  );
};

Overview.parameters = {
  pseudo: {
    hover: '#hover',
    focus: '#focus',
  },
};

export const Controls = (props: Readonly<Props>): JSX.Element => (
  <Flex flexDirection="column" alignItems="center" w="$fill" my="$32">
    <Box w="$420">
      <AutoSuggestBox {...props} />
    </Box>
  </Flex>
);

Controls.argTypes = {
  label: {
    defaultValue: 'Auto suggest box',
  },
  suggestions: {
    defaultValue: SUGGESTIONS,
  },
  validationStatus: {
    defaultValue: ValidationStatus.Idle,
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

  userEvent.click(canvas.getByTestId('auto-suggest-box-button-open'));

  await sleep();

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

  userEvent.click(canvas.getByTestId('auto-suggest-box-input'));

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

  userEvent.click(canvas.getByTestId('auto-suggest-box-input'));

  userEvent.click(canvas.getByTestId('auto-suggest-box-button-close'));

  await sleep();

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

  userEvent.click(canvas.getByTestId('auto-suggest-box-input'));

  await sleep();

  await userEvent.type(canvas.getByTestId('auto-suggest-box-input'), 'ra', {
    delay: 100,
  });

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

  expect(
    await canvas.findByTestId('auto-suggest-box-picked-suggestion'),
  ).toHaveTextContent('Orange');
};
