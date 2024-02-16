/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import React from 'react';

import { ReactComponent as DocumentDownload } from '@lace/icons/dist/DocumentDownload';
import type { Meta } from '@storybook/react';

import { LocalThemeProvider, ThemeColorScheme } from '../../design-tokens';
import { page, Section, Variants } from '../decorators';
import { Divider } from '../divider';
import { Flex } from '../flex';
import { Cell, Grid } from '../grid';

import { RadioButtonGroup } from './';

export default {
  title: 'Input Fields/Radio button',
  component: RadioButtonGroup,
  decorators: [
    page({
      title: 'Radio button',
      subtitle: 'A radio button component',
    }),
  ],
} as Meta;

const options = [{ value: 'option', label: 'Label' }];
const optionsWithIcon = [
  {
    value: 'option',
    label: 'Label',
    icon: DocumentDownload,
    onIconClick: (): void => void 0,
  },
];
const emptyOption = [{ value: 'option', label: '' }];

const MainComponents = (): JSX.Element => {
  return (
    <>
      <Variants.Row>
        <Variants.Cell>
          <RadioButtonGroup
            selectedValue={''}
            onValueChange={(): undefined => undefined}
            options={emptyOption}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            selectedValue={''}
            onValueChange={(): undefined => undefined}
            options={emptyOption}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            selectedValue={'option'}
            onValueChange={(): undefined => undefined}
            options={emptyOption}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            disabled
            selectedValue={'option'}
            onValueChange={(): undefined => undefined}
            options={emptyOption}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            id="hover"
            selectedValue={''}
            onValueChange={(): undefined => undefined}
            options={emptyOption}
          />
        </Variants.Cell>
      </Variants.Row>
      <Variants.Row>
        <Variants.Cell>
          <RadioButtonGroup
            selectedValue={'option'}
            onValueChange={(): undefined => undefined}
            options={options}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            selectedValue={'option'}
            onValueChange={(): undefined => undefined}
            options={options}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            selectedValue={'option'}
            onValueChange={(): undefined => undefined}
            options={options}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            disabled
            selectedValue={'option'}
            onValueChange={(): undefined => undefined}
            options={options}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            id="hover"
            selectedValue={'option'}
            onValueChange={(): undefined => undefined}
            options={options}
          />
        </Variants.Cell>
      </Variants.Row>
    </>
  );
};

const AdditionalVariants = (): JSX.Element => {
  return (
    <>
      <Variants.Row>
        <Variants.Cell>
          <RadioButtonGroup
            selectedValue={''}
            onValueChange={(): undefined => undefined}
            options={options}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            selectedValue={''}
            onValueChange={(): undefined => undefined}
            options={options}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            selectedValue={'option'}
            onValueChange={(): undefined => undefined}
            options={options}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            disabled
            selectedValue={''}
            onValueChange={(): undefined => undefined}
            options={options}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            id="hover"
            selectedValue={''}
            onValueChange={(): undefined => undefined}
            options={options}
          />
        </Variants.Cell>
      </Variants.Row>
      <Variants.Row>
        <Variants.Cell>
          <RadioButtonGroup
            selectedValue={'option'}
            onValueChange={(): undefined => undefined}
            options={optionsWithIcon}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            selectedValue={'option'}
            onValueChange={(): undefined => undefined}
            options={optionsWithIcon}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            selectedValue={'option'}
            onValueChange={(): undefined => undefined}
            options={optionsWithIcon}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            disabled
            selectedValue={'option'}
            onValueChange={(): undefined => undefined}
            options={optionsWithIcon}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            id="hover"
            selectedValue={'option'}
            onValueChange={(): undefined => undefined}
            options={optionsWithIcon}
          />
        </Variants.Cell>
      </Variants.Row>
    </>
  );
};

export const Overview = (): JSX.Element => {
  const headers = ['Rest', 'Hover', 'Active/Selected', 'Disabled', 'Focused'];
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
              <RadioButtonGroup
                selectedValue={radioValue}
                options={option}
                onValueChange={(value: React.SetStateAction<string>): void => {
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
              <RadioButtonGroup
                selectedValue={radioValue}
                options={options}
                onValueChange={(value: React.SetStateAction<string>): void => {
                  setRadioValue(value);
                }}
              />
            </Flex>
          </Flex>
        </Section>

        <Divider my="$64" />

        <Section title="Main components">
          <Variants.Table headers={headers}>
            <MainComponents />
          </Variants.Table>
          <LocalThemeProvider colorScheme={ThemeColorScheme.Dark}>
            <Variants.Table>
              <MainComponents />
            </Variants.Table>
          </LocalThemeProvider>
        </Section>

        <Divider my="$64" />

        <Section title="Additional Variants">
          <Variants.Table headers={headers}>
            <AdditionalVariants />
          </Variants.Table>
          <LocalThemeProvider colorScheme={ThemeColorScheme.Dark}>
            <Variants.Table>
              <AdditionalVariants />
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
