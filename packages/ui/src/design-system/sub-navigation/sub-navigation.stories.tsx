import React from 'react';

import * as Tabs from '@radix-ui/react-tabs';
import { expect } from '@storybook/jest';
import type { ComponentStory, Meta } from '@storybook/react';
import { within, userEvent, waitFor } from '@storybook/testing-library';

import { sleep } from '../../test';
import { page, Section, Variants, UIStateTable } from '../decorators';
import { Divider } from '../divider';
import { Flex } from '../flex';
import { Grid } from '../grid';
import { Cell } from '../grid/cell.component';

import { Item } from './sub-navigation-item.component';
import { SubNavigation } from './sub-navigation.component';

const subtitle = `Subnavigations provide ergonomic movement between destinations and helps users access lower-level categories in the platform's content architecture.`;

export default {
  title: 'Navigation and toolbars/Subnavigation',
  component: SubNavigation,
  decorators: [page({ title: 'Subnavigation', subtitle })],
  argTypes: {
    onValueChange: { action: true },
  },
} as Meta;

const Sample = (): JSX.Element => (
  <SubNavigation aria-label="tabs example" defaultValue="label3">
    <Item name="Label 1" value="label1" />
    <Item name="Label 2" value="label2" />
    <Item name="Label 3" value="label3" />
    <Item name="Label 4" value="label4" />
  </SubNavigation>
);

const LabelOnly = ({
  id,
  disabled,
}: Readonly<{ id?: string; disabled?: boolean }>): JSX.Element => (
  <Tabs.Root>
    <Tabs.List>
      <Item name="Label" value="" id={id} disabled={disabled} />
    </Tabs.List>
  </Tabs.Root>
);

const MainComponents = (): JSX.Element => (
  <Variants.Row>
    <Variants.Cell>
      <LabelOnly />
    </Variants.Cell>
    <Variants.Cell>
      <LabelOnly id="hover" />
    </Variants.Cell>
    <Variants.Cell>
      <LabelOnly id="pressed" />
    </Variants.Cell>
    <Variants.Cell>
      <LabelOnly disabled />
    </Variants.Cell>
    <Variants.Cell>
      <LabelOnly id="focused" />
    </Variants.Cell>
  </Variants.Row>
);

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Overview">
        <Variants.Table>
          <Variants.Row>
            <Variants.Cell>
              <Flex justifyContent="center">
                <Sample />
              </Flex>
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
    </Cell>
  </Grid>
);

Overview.parameters = {
  pseudo: {
    hover: '#hover',
    focus: '#focused',
    active: '#pressed',
  },
};

interface Props {
  onValueChange?: (value: string) => void;
}

type Interactions = ComponentStory<typeof SubNavigation>;
export const Interactions: Interactions = ({
  onValueChange,
}: Props): JSX.Element => {
  const initialTabIndex = 2;

  const items = ['Label 1', 'Label 2', 'Label 3', 'Label 4'];

  return (
    <Grid columns="$1">
      <Cell>
        <Section title="Play">
          <SubNavigation
            aria-label="tabs example"
            defaultValue={String(initialTabIndex)}
            onValueChange={onValueChange}
          >
            {items.map((item, index) => (
              <Item
                key={item}
                name={item}
                value={String(index)}
                data-testid={`sub-navigation-item-${index}`}
                tabIndex={index + 1}
              />
            ))}
          </SubNavigation>
        </Section>
      </Cell>
    </Grid>
  );
};

Interactions.play = async ({ args, canvasElement }): Promise<void> => {
  const canvas = within(canvasElement);

  expect(canvas.getByTestId(`sub-navigation-item-2`)).toHaveAttribute(
    'aria-selected',
    'true',
  );

  await sleep();

  userEvent.click(canvas.getByTestId('sub-navigation-item-0'));
  expect(canvas.getByTestId(`sub-navigation-item-0`)).toHaveAttribute(
    'aria-selected',
    'true',
  );
  expect(canvas.getByTestId(`sub-navigation-item-2`)).toHaveAttribute(
    'aria-selected',
    'false',
  );

  await waitFor(() => {
    expect(args.onValueChange).toHaveBeenCalledWith('0');
  });
};
