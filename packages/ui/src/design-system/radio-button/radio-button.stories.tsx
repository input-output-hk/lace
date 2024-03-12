/* eslint-disable unicorn/consistent-function-scoping */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { SVGProps } from 'react';
import React from 'react';

import { ReactComponent as DocumentDownload } from '@lace/icons/dist/DocumentDownload';
import type { Meta } from '@storybook/react';
import { v4 as uuid } from 'uuid';

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

const getOptions = (
  label = '',
): { value: string; label: string; tooltipText: string }[] => [
  { value: `option-${uuid()}`, label, tooltipText: 'test Tooltip text' },
];
const getOptionsWithIcon = (): {
  value: string;
  label: string;
  icon: (props: Readonly<SVGProps<SVGSVGElement>>) => JSX.Element;
  onIconClick: () => void;
  tooltipText: string;
}[] => [
  {
    value: 'option',
    label: 'Label',
    icon: DocumentDownload,
    onIconClick: (): void => void 0,
    tooltipText: 'Test tooltip text lorem ipsum dolor sit amet',
  },
];

const MainComponents = (): JSX.Element => {
  const getRow = (label?: string) => [
    { options: getOptions(label), onValueChange: (): undefined => undefined },
    {
      options: getOptions(label),
      id: 'hover',
      onValueChange: (): undefined => undefined,
    },
    {
      options: getOptions(label),
      id: 'active',
      onValueChange: (): undefined => undefined,
    },
    {
      options: getOptions(label),
      disabled: true,
      onValueChange: (): undefined => undefined,
    },
    {
      options: getOptions(label),
      id: 'focus',
      onValueChange: (): undefined => undefined,
    },
  ];

  return (
    <>
      <Variants.Row>
        {getRow().map(item => (
          <Variants.Cell key={item.options[0].value}>
            <RadioButtonGroup {...item} />
          </Variants.Cell>
        ))}
      </Variants.Row>
      <Variants.Row>
        {getRow().map(item => (
          <Variants.Cell key={item.options[0].value}>
            <RadioButtonGroup {...item} selectedValue={item.options[0].value} />
          </Variants.Cell>
        ))}
      </Variants.Row>
      <Variants.Row>
        {getRow('Label').map(item => (
          <Variants.Cell key={item.options[0].value}>
            <RadioButtonGroup {...item} />
          </Variants.Cell>
        ))}
      </Variants.Row>
      <Variants.Row>
        {getRow('Label').map(item => (
          <Variants.Cell key={item.options[0].value}>
            <RadioButtonGroup {...item} selectedValue={item.options[0].value} />
          </Variants.Cell>
        ))}
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
            options={getOptions()}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            selectedValue={''}
            onValueChange={(): undefined => undefined}
            options={getOptions()}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            selectedValue={'option'}
            onValueChange={(): undefined => undefined}
            options={getOptions()}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            disabled
            selectedValue={''}
            onValueChange={(): undefined => undefined}
            options={getOptions()}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            id="hover"
            selectedValue={''}
            onValueChange={(): undefined => undefined}
            options={getOptions()}
          />
        </Variants.Cell>
      </Variants.Row>
      <Variants.Row>
        <Variants.Cell>
          <RadioButtonGroup
            selectedValue={'option'}
            onValueChange={(): undefined => undefined}
            options={getOptionsWithIcon()}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            selectedValue={'option'}
            onValueChange={(): undefined => undefined}
            options={getOptionsWithIcon()}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            selectedValue={'option'}
            onValueChange={(): undefined => undefined}
            options={getOptionsWithIcon()}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            disabled
            selectedValue={'option'}
            onValueChange={(): undefined => undefined}
            options={getOptionsWithIcon()}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            id="hover"
            selectedValue={'option'}
            onValueChange={(): undefined => undefined}
            options={getOptionsWithIcon()}
          />
        </Variants.Cell>
      </Variants.Row>
    </>
  );
};

export const Overview = (): JSX.Element => {
  const headers = ['Rest', 'Hover', 'Active/Selected', 'Disabled', 'Focused'];
  const option = [{ value: 'singleOption', label: 'Label' }];
  const options = [
    {
      value: 'label01',
      label: 'Label',
      tooltipText: 'Tooltip text 1',
    },
    {
      value: 'label02',
      label: 'Label',
      tooltipText: 'Tooltip text 2',
    },
    {
      value: 'label03',
      label: 'Label',
      tooltipText: 'Tooltip text 3',
    },
    {
      value: 'label04',
      label: 'Label',
      tooltipText: 'Tooltip text 4',
    },
  ];

  const [radioValue, setRadioValue] = React.useState(options[1].value);

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
    active: '#active',
    focus: '#focus',
  },
};
