import type { ElementType } from 'react';
import React from 'react';

import { expect } from '@storybook/jest';
import type { ComponentStory, Meta } from '@storybook/react';
import { userEvent, waitFor, within } from '@storybook/testing-library';

import { ThemeColorScheme, ThemeProvider } from '../../design-tokens';
import { sleep } from '../../test';
import { Page, Variants, Section } from '../decorators';
import { Divider } from '../divider';
import { Grid, Cell } from '../grid';

import { Back } from './back-button.component';
import { Close } from './close-button.component';

const subtitle = ``;

export default {
  title: 'Buttons/Navigation Buttons',
  component: Close,
  subcomponents: { Back },
  decorators: [
    (Story): JSX.Element => (
      <Page title="Navigation button" subtitle={subtitle}>
        <Story />
      </Page>
    ),
  ],
  argTypes: {
    onClose: { action: true },
    onBack: { action: true },
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
        <Variants.Table
          headers={['Rest', 'Hover', 'Active / pressed', 'Disabled', 'Focused']}
        >
          <Buttons />
        </Variants.Table>

        <ThemeProvider colorScheme={ThemeColorScheme.Dark}>
          <Variants.Table>
            <Buttons />
          </Variants.Table>
        </ThemeProvider>
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
  onClose?: () => void;
  onBack?: () => void;
}
type Interactions = ComponentStory<ElementType<Props>>;

export const Interactions: Interactions = ({
  onClose,
  onBack,
}: Readonly<Props>): JSX.Element => {
  return (
    <Grid columns="$1">
      <Cell>
        <Section title="Play">
          <Variants.Table headers={['Close', 'Back']}>
            <Variants.Row>
              <Variants.Cell>
                <Close onClose={onClose} data-testid="close-button" />
              </Variants.Cell>
              <Variants.Cell>
                <Back onGoBack={onBack} data-testid="back-button" />
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
    expect(args.onClose).toHaveBeenCalled();
  });

  await sleep();

  userEvent.click(await canvas.findByTestId('back-button'));

  await waitFor(() => {
    expect(args.onBack).toHaveBeenCalled();
  });
};
