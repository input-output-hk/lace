import React from 'react';

import { ReactComponent as PlainCircle } from '@lace/icons/dist/PlainCircleComponent';
import * as Toast from '@radix-ui/react-toast';
import { expect } from '@storybook/jest';
import type { ComponentStory, Meta } from '@storybook/react';
import { within, screen, userEvent, waitFor } from '@storybook/testing-library';
import isChromatic from 'chromatic/isChromatic';

import { ThemeColorScheme, LocalThemeProvider } from '../../design-tokens';
import { sleep } from '../../test';
import { page, Variants, Section } from '../decorators';
import { Divider } from '../divider';
import { Flex } from '../flex';
import { Grid, Cell } from '../grid';

import { Provider } from './toast-bar-provider.component';
import { Root } from './toast-bar-root.component';
import { ToastBar } from './toast-bar.component';

import type { Props as ToastBarProps } from './toast-bar.component';

const subtitle = `A toast bar control provides feedback to the user that a long-running operation is underway. It can mean that the user cannot interact with the app when the progress indicator is visible, and can also indicate how long the wait time might be, depending on the indicator used.`;

export default {
  title: 'Status & info/Toast bar',
  component: ToastBar,
  decorators: [page({ title: 'Toast bar', subtitle })],
} as Meta;

const isAnimationEnabled = !isChromatic();

const Sample = ({ progress }: Readonly<{ progress?: number }>): JSX.Element => (
  <Provider>
    <Root
      title="Toast label"
      icon={<PlainCircle />}
      onClose={console.log}
      onOpenChange={console.log}
      open
      closeAltText="Close toast"
      progress={progress}
      animate={isAnimationEnabled}
    />
    <Toast.Viewport style={{ listStyle: 'none' }} />
  </Provider>
);

const MainComponents = (): JSX.Element => (
  <>
    <Variants.Row>
      <Variants.Cell>
        <Sample progress={50} />
      </Variants.Cell>
    </Variants.Row>
    <Variants.Row>
      <Variants.Cell>
        <Sample />
      </Variants.Cell>
    </Variants.Row>
  </>
);

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Copy for use">
        <Flex flexDirection="column" alignItems="center" w="$fill">
          <Sample progress={80} />
        </Flex>
      </Section>

      <Divider my="$64" />

      <Section title="Variants">
        <Variants.Table headers={['With progress bar', 'Without progress bar']}>
          <Variants.Row>
            <Variants.Cell>
              <Sample progress={40} />
            </Variants.Cell>
            <Variants.Cell>
              <Sample />
            </Variants.Cell>
          </Variants.Row>
        </Variants.Table>
      </Section>

      <Divider my="$64" />

      <Section title="Main components">
        <Variants.Table headers={['Default']}>
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

type Interactions = ComponentStory<typeof ToastBar>;
export const Interactions: Interactions = ({
  onClose,
  onOpenChange,
  open,
  title,
  closeAltText,
  progress,
}: Readonly<ToastBarProps>): JSX.Element => {
  const [isOpen, setOpen] = React.useState(open);

  return (
    <Grid columns="$1">
      <Cell>
        <Section title="Play">
          <Flex flexDirection="column" alignItems="center" w="$fill">
            <ToastBar
              duration={process.env.STORYBOOK_TEST ?? '' ? 0 : undefined}
              icon={<PlainCircle />}
              onClose={onClose}
              open={isOpen}
              title={title}
              onOpenChange={(open): void => {
                setOpen(open);
                onOpenChange?.(open);
              }}
              closeAltText={closeAltText}
              progress={progress}
              animate={isAnimationEnabled}
            />
          </Flex>
        </Section>
      </Cell>
    </Grid>
  );
};

const title = 'Toast label';

Interactions.args = {
  title,
  closeAltText: 'Close',
  progress: 50,
};

Interactions.play = async ({ canvasElement }): Promise<void> => {
  const canvas = within(canvasElement);

  expect(screen.queryByText(title)).toBeInTheDocument();

  await sleep();

  userEvent.click(canvas.getByTestId(`${title}-toast-close-button`));

  await sleep();

  await waitFor(() => {
    expect(screen.queryByText(title)).not.toBeInTheDocument();
  });
};

type Controls = ComponentStory<typeof ToastBar>;

export const Controls: Controls = ({
  onClose,
  onOpenChange,
  open,
  title,
  closeAltText,
  progress,
  duration,
}: Readonly<ToastBarProps>): JSX.Element => {
  return (
    <Grid columns="$1">
      <Cell>
        <Section title="Controls">
          <ToastBar
            duration={duration}
            icon={<PlainCircle />}
            onClose={onClose}
            open={open}
            title={title}
            onOpenChange={onOpenChange}
            closeAltText={closeAltText}
            progress={progress}
            animate={isAnimationEnabled}
          />
        </Section>
      </Cell>
    </Grid>
  );
};

Controls.args = {
  title,
  closeAltText: 'Close',
  progress: 50,
  duration: 3000,
  open: true,
};
