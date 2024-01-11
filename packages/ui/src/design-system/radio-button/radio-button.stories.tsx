/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import React from 'react';

import type { Meta } from '@storybook/react';

import { LocalThemeProvider, ThemeColorScheme } from '../../design-tokens';
import { page, Section, Variants } from '../decorators';
import { Divider } from '../divider';
import { Flex } from '../flex';
import { Cell, Grid } from '../grid';

import * as cx from './radio-button.stories.css';

import { RadioButton } from './';

export default {
  title: 'Input Fields/Radio button',
  component: RadioButton,
  decorators: [
    page({
      title: 'Radio button',
      subtitle: 'A radio button component',
    }),
  ],
} as Meta;

const options = [{ value: 'option', label: 'Label' }];
const emptyOption = [{ value: 'option', label: '' }];

const MainComponents = (): JSX.Element => {
  return (
    <>
      <Variants.Row>
        <Variants.Cell>
          <RadioButton
            selectedValue={''}
            onValueChange={(): undefined => undefined}
            options={emptyOption}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButton
            id="hover"
            selectedValue={''}
            onValueChange={(): undefined => undefined}
            options={emptyOption}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButton
            selectedValue={'option'}
            onValueChange={(): undefined => undefined}
            options={emptyOption}
          />
        </Variants.Cell>
        {/* Disabled */}
        <Variants.Cell>
          <RadioButton
            disabled
            selectedValue={''}
            onValueChange={(): undefined => undefined}
            options={emptyOption}
          />
        </Variants.Cell>
        {/* Focused */}
        <Variants.Cell>
          <RadioButton
            className={cx.focus}
            selectedValue={''}
            onValueChange={(): undefined => undefined}
            options={emptyOption}
          />
        </Variants.Cell>
      </Variants.Row>
      <Variants.Row>
        <Variants.Cell>
          <RadioButton
            selectedValue={''}
            onValueChange={(): undefined => undefined}
            options={options}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButton
            id="hover"
            selectedValue={''}
            onValueChange={(): undefined => undefined}
            options={options}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButton
            selectedValue={'option'}
            onValueChange={(): undefined => undefined}
            options={options}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButton
            disabled
            selectedValue={''}
            onValueChange={(): undefined => undefined}
            options={options}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButton
            className={cx.focus}
            selectedValue={''}
            onValueChange={(): undefined => undefined}
            options={options}
          />
        </Variants.Cell>
      </Variants.Row>
    </>
  );
};

export const Overview = (): JSX.Element => {
  const option = [{ value: 'singleOption', label: 'Single label' }];
  const options = [
    { value: 'label01', label: 'Label 1' },
    { value: 'label02', label: 'Label 2' },
    { value: 'label03', label: 'Label 3' },
  ];

  const [radioValue, setRadioValue] = React.useState(options[0].value);

  return (
    <Grid>
      <Cell>
        <Section title="Copy for use">
          <Flex
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            w="$fill"
            my="$32"
          >
            <Flex mr="$8">
              <RadioButton
                selectedValue={radioValue}
                options={option}
                onValueChange={(value): void => {
                  setRadioValue(value);
                }}
              />
            </Flex>
          </Flex>

          <Divider my="$64" />

          <Flex
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            w="$fill"
            my="$32"
          >
            <Flex mr="$8">
              <RadioButton
                selectedValue={radioValue}
                options={options}
                onValueChange={(value): void => {
                  setRadioValue(value);
                }}
              />
            </Flex>
          </Flex>
        </Section>

        <Divider my="$64" />

        <Section title="Main components">
          <Variants.Table
            headers={[
              'Rest',
              'Hover',
              'Active/Selected',
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
  },
};
