/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import React from 'react';

import type { Meta } from '@storybook/react';

import { LocalThemeProvider, ThemeColorScheme } from '../../design-tokens';
import { page, Section, Variants } from '../decorators';
import { Divider } from '../divider';
import { Flex } from '../flex';
import { Cell, Grid } from '../grid';

import * as cx from './select.stories.css';

import { SelectGroup } from './';

export default {
  title: 'Input Fields / Select dropdown',
  component: SelectGroup,
  decorators: [
    page({
      title: 'Select dropdown',
      subtitle: 'A select dropdown component',
    }),
  ],
} as Meta;

const placeholder = 'Select a value...';
const options = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Blueberry', value: 'blueberry' },
];

const MainComponentsIcon = (): JSX.Element => (
  <Variants.Row>
    <Variants.Cell>
      <SelectGroup
        onValueChange={(): undefined => undefined}
        options={options}
        placeholder={placeholder}
        showArrow={true}
      />
    </Variants.Cell>
    <Variants.Cell>
      <SelectGroup
        disabled={true}
        onValueChange={(): undefined => undefined}
        options={options}
        placeholder={placeholder}
        showArrow={true}
      />
    </Variants.Cell>
    <Variants.Cell>
      <SelectGroup
        className={cx.focus}
        disabled={true}
        onValueChange={(): undefined => undefined}
        options={options}
        placeholder={placeholder}
        showArrow={true}
      />
    </Variants.Cell>
  </Variants.Row>
);

const MainComponents = (): JSX.Element => (
  <Variants.Row>
    <Variants.Cell>
      <SelectGroup
        onValueChange={(): undefined => undefined}
        options={options}
        placeholder={placeholder}
      />
    </Variants.Cell>
    <Variants.Cell>
      <SelectGroup
        disabled={true}
        onValueChange={(): undefined => undefined}
        options={options}
        placeholder={placeholder}
      />
    </Variants.Cell>
    <Variants.Cell>
      <SelectGroup
        className={cx.focus}
        disabled={true}
        onValueChange={(): undefined => undefined}
        options={options}
        placeholder={placeholder}
      />
    </Variants.Cell>
  </Variants.Row>
);

export const Overview = (): JSX.Element => {
  const [selectedValue, setSelectedValue] = React.useState<string>(
    options[0].value,
  );

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
              <SelectGroup
                selectedValue={selectedValue}
                options={options}
                onValueChange={(value): void => {
                  setSelectedValue(value);
                }}
                placeholder={placeholder}
                className={cx.testClassName}
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
              <SelectGroup
                selectedValue={selectedValue}
                options={options}
                onValueChange={(value): void => {
                  setSelectedValue(value);
                }}
                placeholder={placeholder}
                className={cx.testClassName}
                showArrow={true}
              />
            </Flex>
          </Flex>
        </Section>

        <Divider my="$64" />

        <Section title="Main components">
          <Variants.Table headers={['Rest', 'Disabled', 'Focused']}>
            <MainComponents />
          </Variants.Table>
          <LocalThemeProvider colorScheme={ThemeColorScheme.Dark}>
            <Variants.Table>
              <MainComponents />
            </Variants.Table>
          </LocalThemeProvider>
        </Section>

        <Divider my="$64" />

        <Section title="Main components with Icon">
          <Variants.Table headers={['Rest', 'Disabled', 'Focused']}>
            <MainComponentsIcon />
          </Variants.Table>
          <LocalThemeProvider colorScheme={ThemeColorScheme.Dark}>
            <Variants.Table>
              <MainComponentsIcon />
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
