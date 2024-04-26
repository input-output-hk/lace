/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import React from 'react';

import type { Meta } from '@storybook/react';

import { LocalThemeProvider, ThemeColorScheme } from '../../design-tokens';
import { page, Section, Variants } from '../decorators';
import { Divider } from '../divider';
import { Flex } from '../flex';
import { Cell, Grid } from '../grid';

import * as Select from './index';

export default {
  title: 'Input Fields / Select dropdown',
  component: Select.Root,
  decorators: [
    page({
      title: 'Select dropdown',
      subtitle: 'A select dropdown component',
    }),
  ],
} as Meta;

const placeholder = 'Select an option';
const options = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Blueberry', value: 'blueberry' },
];

const MainComponents = (): JSX.Element => (
  <Variants.Row>
    <Variants.Cell>
      <Select.Root
        variant="grey"
        value={options[1].value}
        onChange={(): void => void 0}
        placeholder={placeholder}
        showArrow
      >
        {options.map(option => (
          <Select.Item
            key={option.value}
            value={option.value}
            title={option.label}
          />
        ))}
      </Select.Root>
    </Variants.Cell>
    <Variants.Cell>
      <Select.Root
        id="hover"
        variant="grey"
        value={options[1].value}
        onChange={(): void => void 0}
        placeholder={placeholder}
        showArrow
      >
        {options.map(option => (
          <Select.Item
            key={option.value}
            value={option.value}
            title={option.label}
          />
        ))}
      </Select.Root>
    </Variants.Cell>
    <Variants.Cell>
      <Select.Root
        variant="grey"
        value={options[1].value}
        onChange={(): void => void 0}
        placeholder={placeholder}
        showArrow
      >
        <Select.Item
          key={options[1].value}
          value={options[1].value}
          title={options[1].label}
        />
      </Select.Root>
    </Variants.Cell>
    <Variants.Cell>
      <Select.Root
        disabled
        variant="grey"
        value={options[1].value}
        onChange={(): void => void 0}
        placeholder={placeholder}
        showArrow
      >
        {options.map(option => (
          <Select.Item
            key={option.value}
            value={option.value}
            title={option.label}
          />
        ))}
      </Select.Root>
    </Variants.Cell>
    <Variants.Cell>
      <Select.Root
        id="focused"
        variant="grey"
        value={options[1].value}
        onChange={(): void => void 0}
        placeholder={placeholder}
        showArrow
      >
        {options.map(option => (
          <Select.Item
            key={option.value}
            value={option.value}
            title={option.label}
          />
        ))}
      </Select.Root>
    </Variants.Cell>
  </Variants.Row>
);

export const Overview = (): JSX.Element => {
  const [selectedValue, setSelectedValue] = React.useState<string>(
    options[1].value,
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
              <Select.Root
                value={selectedValue}
                onChange={setSelectedValue}
                placeholder={placeholder}
              >
                {options.map(option => (
                  <Select.Item
                    key={option.value}
                    value={option.value}
                    title={option.label}
                    disabled={option.value === 'apple'}
                  />
                ))}
              </Select.Root>
            </Flex>
            <Flex>
              <Select.Root
                value={undefined}
                onChange={setSelectedValue}
                placeholder={placeholder}
              />
            </Flex>
          </Flex>
        </Section>

        <Divider my="$64" />

        <Section title="Main components">
          <Variants.Table
            headers={['Rest', 'Hover', 'Open', 'Disabled', 'Focused']}
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
    active: '#pressed',
    focusVisible: '#focused',
  },
};
