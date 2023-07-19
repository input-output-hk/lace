import React, { useState } from 'react';

import { expect } from '@storybook/jest';
import type { ComponentStory, Meta } from '@storybook/react';
import { within, userEvent, screen } from '@storybook/testing-library';

import { ThemeColorScheme, LocalThemeProvider } from '../../design-tokens';
import { sleep } from '../../test';
import { page, Section, Variants } from '../decorators';
import { Divider } from '../divider';
import { Flex } from '../flex';
import { Grid, Cell } from '../grid';

import { Trigger } from './summary-expander-trigger.component';
import { SummaryExpander } from './summary-expander.component';

import type { Props } from './summary-expander.component';

const subtitle = `The transacion summary expander is a control that displays a header and a collapsible content area.`;

export default {
  title: 'List & tables/Transaction summary expander',

  decorators: [page({ title: 'Transaction summary expander', subtitle })],
} as Meta;

const MainComponents = (): JSX.Element => (
  <Variants.Row>
    <Variants.Cell>
      <SummaryExpander title="Title" />
    </Variants.Cell>
    <Variants.Cell>
      <SummaryExpander title="Title" open />
    </Variants.Cell>
  </Variants.Row>
);

const TriggerStates = (): JSX.Element => (
  <>
    <Variants.Row>
      <Variants.Cell>
        <Trigger id="trigger" />
      </Variants.Cell>
      <Variants.Cell>
        <Trigger id="trigger-hover" />
      </Variants.Cell>
      <Variants.Cell>
        <Trigger id="trigger-pressed" />
      </Variants.Cell>
      <Variants.Cell>
        <Trigger id="trigger-pressed" disabled />
      </Variants.Cell>
      <Variants.Cell>
        <Trigger id="trigger-focused" />
      </Variants.Cell>
    </Variants.Row>
    <Variants.Row>
      <Variants.Cell>
        <Trigger id="trigger" open />
      </Variants.Cell>
      <Variants.Cell>
        <Trigger id="trigger-hover" open />
      </Variants.Cell>
      <Variants.Cell>
        <Trigger id="trigger-pressed" open />
      </Variants.Cell>
      <Variants.Cell>
        <Trigger id="trigger-pressed" disabled open />
      </Variants.Cell>
      <Variants.Cell>
        <Trigger id="trigger-focused" open />
      </Variants.Cell>
    </Variants.Row>
  </>
);

export const Overview = (): JSX.Element => (
  <div id="storybook">
    <Grid columns="$1">
      <Cell>
        <Section title="Copy for use">
          <Variants.Table>
            <Variants.Row>
              <Variants.Cell>
                <Flex justifyContent="center" w="$fill">
                  <SummaryExpander title="Title" />
                </Flex>
              </Variants.Cell>
            </Variants.Row>
          </Variants.Table>
        </Section>

        <Divider my="$64" />

        <Section title="Main components">
          <Variants.Table headers={['Collapsed (default)', 'Expanded']}>
            <MainComponents />
          </Variants.Table>

          <LocalThemeProvider colorScheme={ThemeColorScheme.Dark}>
            <Variants.Table>
              <MainComponents />
            </Variants.Table>
          </LocalThemeProvider>
        </Section>

        <Divider my="$64" />

        <Section title="Transaction summary items">
          <Variants.Table
            headers={[
              'Rest',
              'Hover',
              'Active / pressed',
              'Disabled',
              'Focused',
            ]}
          >
            <TriggerStates />
          </Variants.Table>

          <LocalThemeProvider colorScheme={ThemeColorScheme.Dark}>
            <Variants.Table>
              <TriggerStates />
            </Variants.Table>
          </LocalThemeProvider>
        </Section>
      </Cell>
    </Grid>
  </div>
);

Overview.parameters = {
  pseudo: {
    hover: '#trigger-hover',
    focusVisible: '#trigger-focused',
    active: '#trigger-pressed',
  },
};

type Controls = ComponentStory<typeof SummaryExpander>;

export const Controls: Controls = ({
  title,
  disabled,
  onOpenChange,
  open,
}: Readonly<Props>): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Copy for use">
        <Flex alignItems="center" flexDirection="column">
          <SummaryExpander
            title={title}
            disabled={disabled}
            onOpenChange={onOpenChange}
            open={open}
          />
        </Flex>
      </Section>
    </Cell>
  </Grid>
);

Controls.args = {
  title: 'Title',
  disabled: false,
  open: false,
};

type Interactions = ComponentStory<typeof SummaryExpander>;
export const Interactions: Interactions = (): JSX.Element => {
  const [isOpen, setOpen] = useState(false);

  return (
    <Grid columns="$1">
      <Cell>
        <Section title="Play">
          <SummaryExpander
            title="Title"
            onOpenChange={setOpen}
            open={isOpen}
            data-testid="summary-trigger"
          >
            <span>Summary content</span>
          </SummaryExpander>
        </Section>
      </Cell>
    </Grid>
  );
};

Interactions.play = async ({ canvasElement }): Promise<void> => {
  const canvas = within(canvasElement);

  const summaryContent = 'Summary content';

  expect(screen.queryByText(summaryContent)).not.toBeInTheDocument();

  await sleep();

  userEvent.click(canvas.getByTestId('summary-trigger'));

  await sleep();

  expect(screen.queryByText(summaryContent)).toBeInTheDocument();
};
