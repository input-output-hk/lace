import React, { useState } from 'react';

import { expect } from '@storybook/jest';
import type { ComponentStory, Meta } from '@storybook/react';
import { within, userEvent } from '@storybook/testing-library';

import { sleep } from '../../test';
import { page, Section, Variants, UIStateTable } from '../decorators';
import { Divider } from '../divider';
import { Flex } from '../flex';
import { Grid } from '../grid';
import { Cell } from '../grid/cell.component';

import { ClearButton } from './search-box-clear-button.component';
import { SearchBox } from './search-box.component';

import type { Props } from './search-box.component';

const subtitle = `A search field allows the user to search for content on a specific page, or on the entire platform.`;

export default {
  title: 'Input fields/Search box',
  component: SearchBox,
  decorators: [page({ title: 'Search box', subtitle })],
} as Meta;

const MainComponents = (): JSX.Element => (
  <>
    <Variants.Row>
      <Variants.Cell>
        <SearchBox placeholder="Search" />
      </Variants.Cell>
      <Variants.Cell>
        <SearchBox id="hover" placeholder="Search" />
      </Variants.Cell>
      <Variants.Cell>
        <SearchBox id="pressed" placeholder="Search" value="Typing" active />
      </Variants.Cell>
      <Variants.Cell>
        <SearchBox disabled placeholder="Search" />
      </Variants.Cell>
      <Variants.Cell>
        <SearchBox id="focused" placeholder="Search" />
      </Variants.Cell>
    </Variants.Row>
  </>
);

const ClearButtons = (): JSX.Element => (
  <>
    <Variants.Row>
      <Variants.Cell>
        <Flex alignItems="center">
          <ClearButton />
        </Flex>
      </Variants.Cell>
      <Variants.Cell>
        <Flex alignItems="center">
          <ClearButton id="hover" />
        </Flex>
      </Variants.Cell>
      <Variants.Cell>
        <Flex alignItems="center">
          <ClearButton id="pressed" />
        </Flex>
      </Variants.Cell>
      <Variants.Cell>
        <Flex alignItems="center">
          <ClearButton disabled />
        </Flex>
      </Variants.Cell>
      <Variants.Cell>
        <Flex alignItems="center">
          <ClearButton id="focused" />
        </Flex>
      </Variants.Cell>
    </Variants.Row>
  </>
);

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Copy for use">
        <Flex alignItems="center" flexDirection="column">
          <SearchBox placeholder="Search" />
        </Flex>
      </Section>

      <Divider my="$64" />

      <Section title="Variants">
        <Variants.Table headers={['Default']}>
          <Variants.Row>
            <Variants.Cell>
              <SearchBox placeholder="Search" value="Typing" />
            </Variants.Cell>
          </Variants.Row>
        </Variants.Table>
      </Section>

      <Divider my="$64" />

      <Section title="Main components">
        <UIStateTable>
          <MainComponents />
        </UIStateTable>
      </Section>

      <Divider my="$64" />

      <Section title="Search box items">
        <UIStateTable>
          <ClearButtons />
        </UIStateTable>
      </Section>
    </Cell>
  </Grid>
);

Overview.parameters = {
  pseudo: {
    hover: '#hover',
    active: '#pressed',
    focus: '#focused',
  },
};

type Interactions = ComponentStory<typeof SearchBox>;
export const Interactions: Interactions = (): JSX.Element => {
  const [value, setValue] = useState<string>('');

  return (
    <Grid columns="$1">
      <Cell>
        <Section title="Play">
          <SearchBox
            placeholder="Search"
            value={value}
            onChange={setValue}
            onClear={(): void => {
              setValue('');
            }}
            clearButtonAriaLabel="Clear Search"
          />
        </Section>
      </Cell>
    </Grid>
  );
};

Interactions.play = async ({ canvasElement }): Promise<void> => {
  const canvas = within(canvasElement);

  await sleep();

  const textInput = await canvas.findByPlaceholderText('Search');

  expect(textInput).toHaveValue('');

  await sleep();

  const searchTerm = 'Lorem';

  await userEvent.type(textInput, searchTerm, {
    delay: 100,
  });

  expect(textInput).toHaveValue(searchTerm);

  userEvent.click(await canvas.findByLabelText(`Clear Search`));

  await sleep();

  expect(textInput).toHaveValue('');
};

type Controls = ComponentStory<typeof SearchBox>;

export const Controls: Controls = ({
  placeholder,
  value,
  onChange,
  onClear,
  clearButtonAriaLabel,
  active,
}: Readonly<Props>): JSX.Element => {
  return (
    <Grid columns="$1">
      <Cell>
        <Section title="Controls">
          <SearchBox
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onClear={onClear}
            clearButtonAriaLabel={clearButtonAriaLabel}
            active={active}
          />
        </Section>
      </Cell>
    </Grid>
  );
};

Controls.args = {
  placeholder: 'Search',
  value: '',
};
