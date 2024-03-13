/* eslint-disable unicorn/consistent-function-scoping */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { SVGProps } from 'react';
import React, { useMemo } from 'react';

import { ReactComponent as DocumentDownload } from '@lace/icons/dist/DocumentDownload';
import type { Meta } from '@storybook/react';
import { v4 as uuid } from 'uuid';

import { LocalThemeProvider, ThemeColorScheme } from '../../design-tokens';
import { Box } from '../box';
import { page, Section, Variants } from '../decorators';
import { Divider } from '../divider';
import { Flex } from '../flex';
import { Cell, Grid } from '../grid';
import { Table } from '../table';

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
  count: number,
  label: string,
  icon?: (props: Readonly<SVGProps<SVGSVGElement>>) => JSX.Element,
): {
  value: string;
  label: string;
  icon?: (props: Readonly<SVGProps<SVGSVGElement>>) => JSX.Element;
  onIconClick: () => void;
  tooltipText: string;
  // eslint-disable-next-line max-params
}[] =>
  Array.from({ length: count }).map(_ => ({
    value: `option-${uuid()}`,
    label,
    icon,
    onIconClick: (): void => void 0,
    tooltipText: 'Test tooltip text lorem ipsum dolor sit amet',
  }));

const MainComponents = (): JSX.Element => {
  const getRow = (label?: string) => [
    {
      options: getOptions(1, 'Label'),
      onValueChange: (): undefined => undefined,
    },
    {
      options: getOptions(1, 'Label'),
      id: 'hover',
      onValueChange: (): undefined => undefined,
    },
    {
      options: getOptions(1, 'Label'),
      id: 'active',
      onValueChange: (): undefined => undefined,
    },
    {
      options: getOptions(1, 'Label'),
      disabled: true,
      onValueChange: (): undefined => undefined,
    },
    {
      options: getOptions(1, 'Label'),
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
            options={getOptions(1, 'Label')}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            selectedValue={''}
            onValueChange={(): undefined => undefined}
            options={getOptions(1, 'Label')}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            selectedValue={'option'}
            onValueChange={(): undefined => undefined}
            options={getOptions(1, 'Label')}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            disabled
            selectedValue={''}
            onValueChange={(): undefined => undefined}
            options={getOptions(1, 'Label')}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            id="hover"
            selectedValue={''}
            onValueChange={(): undefined => undefined}
            options={getOptions(1, 'Label')}
          />
        </Variants.Cell>
      </Variants.Row>
      <Variants.Row>
        <Variants.Cell>
          <RadioButtonGroup
            selectedValue={'option'}
            onValueChange={(): undefined => undefined}
            options={getOptions(1, 'Label', DocumentDownload)}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            selectedValue={'option'}
            onValueChange={(): undefined => undefined}
            options={getOptions(1, 'Label', DocumentDownload)}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            selectedValue={'option'}
            onValueChange={(): undefined => undefined}
            options={getOptions(1, 'Label', DocumentDownload)}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            disabled
            selectedValue={'option'}
            onValueChange={(): undefined => undefined}
            options={getOptions(1, 'Label', DocumentDownload)}
          />
        </Variants.Cell>
        <Variants.Cell>
          <RadioButtonGroup
            id="hover"
            selectedValue={'option'}
            onValueChange={(): undefined => undefined}
            options={getOptions(1, 'Label', DocumentDownload)}
          />
        </Variants.Cell>
      </Variants.Row>
    </>
  );
};

const List = ({
  icon,
}: {
  icon?: (props: Readonly<SVGProps<SVGSVGElement>>) => JSX.Element;
}) => {
  const options = useMemo(() => getOptions(4, 'Label', icon), []);
  const [value, setValue] = React.useState(options[0].value);
  return (
    <RadioButtonGroup
      selectedValue={value}
      options={options}
      onValueChange={(value: React.SetStateAction<string>): void => {
        console.log('xxx value=', value);
        setValue(value);
      }}
    />
  );
};

export const Overview = (): JSX.Element => {
  const headers = ['Rest', 'Hover', 'Active/Selected', 'Disabled', 'Focused'];

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
                options={getOptions(1, 'Label', DocumentDownload)}
                onValueChange={(): undefined => undefined}
              />
            </Flex>
          </Flex>

          <Divider my="$64" />

          <Flex>
            <LocalThemeProvider colorScheme={ThemeColorScheme.Light}>
              <Variants.Table headers={['Light']}>
                <Flex justifyContent={'space-around'} p="$16">
                  <List />
                  <List icon={DocumentDownload} />
                </Flex>
              </Variants.Table>
            </LocalThemeProvider>

            <LocalThemeProvider colorScheme={ThemeColorScheme.Dark}>
              <Variants.Table headers={['Dark']}>
                <Flex justifyContent={'space-around'} p="$16">
                  <List />
                  <List icon={DocumentDownload} />
                </Flex>
              </Variants.Table>
            </LocalThemeProvider>
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
