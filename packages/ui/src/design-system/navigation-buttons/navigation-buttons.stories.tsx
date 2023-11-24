import type { ElementType } from 'react';
import React from 'react';

import { expect } from '@storybook/jest';
import type { ComponentStory, Meta } from '@storybook/react';
import { userEvent, waitFor, within } from '@storybook/testing-library';

import { sleep } from '../../test';
import { page, Variants, Section, UIStateTable } from '../decorators';
import { Divider } from '../divider';
import { Grid, Cell } from '../grid';

import { Back } from './back-button.component';
import { Close } from './close-button.component';

const subtitle = ``;

export default {
  title: 'Buttons/Navigation Buttons',
  component: Close,
  subcomponents: { Back },
  decorators: [page({ title: 'Navigation button', subtitle })],
  argTypes: {
    onClick: { action: true },
  },
} as Meta;

const Buttons = (): JSX.Element => (
  <>
    <Variants.Row>
      <Variants.Cell>
        <Close />
      </Variants.Cell>
      <Variants.Cell>
        <Close id="hover" />
      </Variants.Cell>
      <Variants.Cell>
        <Close id="pressed" />
      </Variants.Cell>
      <Variants.Cell>
        <Close disabled />
      </Variants.Cell>
      <Variants.Cell>
        <Close id="focused" />
      </Variants.Cell>
    </Variants.Row>
    <Variants.Row>
      <Variants.Cell>
        <Back />
      </Variants.Cell>
      <Variants.Cell>
        <Back id="hover" />
      </Variants.Cell>
      <Variants.Cell>
        <Back id="pressed" />
      </Variants.Cell>
      <Variants.Cell>
        <Back disabled />
      </Variants.Cell>
      <Variants.Cell>
        <Back id="focused" />
      </Variants.Cell>
    </Variants.Row>
  </>
);

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Variants">
        <Variants.Table headers={['Close', 'Back']}>
          <Variants.Row>
            <Variants.Cell>
              <Close />
            </Variants.Cell>
            <Variants.Cell>
              <Back />
            </Variants.Cell>
          </Variants.Row>
        </Variants.Table>
        <Divider my="$64" />
      </Section>
      <Section title="Main components">
        <UIStateTable>
          <Buttons />
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
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}
type Interactions = ComponentStory<ElementType<Props>>;

export const Interactions: Interactions = ({
  onClick,
}: Readonly<Props>): JSX.Element => {
  return (
    <Grid columns="$1">
      <Cell>
        <Section title="Play">
          <Variants.Table headers={['Close', 'Back']}>
            <Variants.Row>
              <Variants.Cell>
                <Close onClick={onClick} data-testid="close-button" />
              </Variants.Cell>
              <Variants.Cell>
                <Back onClick={onClick} data-testid="back-button" />
              </Variants.Cell>
            </Variants.Row>
          </Variants.Table>
        </Section>
      </Cell>
    </Grid>
  );
};

Interactions.play = async ({ canvasElement, args }): Promise<void> => {
  const canvas = within(canvasElement);

  await sleep();

  userEvent.click(await canvas.findByTestId('close-button'));

  await waitFor(() => {
    expect(args.onClick).toHaveBeenCalled();
  });

  await sleep();

  userEvent.click(await canvas.findByTestId('back-button'));

  await waitFor(() => {
    expect(args.onClick).toHaveBeenCalled();
  });
};
