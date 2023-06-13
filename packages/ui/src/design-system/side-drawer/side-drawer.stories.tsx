import type { ElementType, ReactNode } from 'react';
import React from 'react';

import { expect } from '@storybook/jest';
import type { ComponentStory, Meta } from '@storybook/react';
import { within, userEvent, waitFor } from '@storybook/testing-library';
import MediaQuery from 'react-responsive';

import cardanoImage from '../../assets/images/cardano-blue-bg.png';
import { ThemeColorScheme, ThemeProvider, sx } from '../../design-tokens';
import { sleep } from '../../test';
import { Box } from '../box';
import * as Buttons from '../buttons';
import { page, Section, Variants } from '../decorators';
import { Divider } from '../divider';
import { Flex } from '../flex';
import { Grid, Cell } from '../grid';
import * as ProfilePicutre from '../profile-picture';
import { ToggleSwitch } from '../toggle-switch';
import * as Typography from '../typography';

import { Close } from './side-drawer-close.component';
import { Body } from './side-drawer-content-body.component';
import { Footer } from './side-drawer-content-footer.component';
import { Header } from './side-drawer-content-header.component';
import { Headline } from './side-drawer-content-headline.component';
import { Content } from './side-drawer-content.component';
import { Overlay } from './side-drawer-overlay.component';
import { Root } from './side-drawer-root.component';
import { Trigger } from './side-drawer-trigger.component';

const subtitle = `Modal navigation drawers block interaction with the rest of an app’s content with a scrim. They are elevated above most of the app’s UI and don’t affect the screen’s layout grid.`;

export default {
  title: 'Modals/Side Drawer',
  component: Root,
  subcomponents: {
    Footer,
    Body,
    Header,
    Headline,
    Content,
    Trigger,
    Close,
  },
  decorators: [page({ title: 'Side drawer', subtitle })],
  argTypes: {
    onBackClick: { action: true },
    onCloseClick: { action: true },
  },
} as Meta;

interface Props {
  onBackClick?: () => void;
  onCloseClick: () => void;
}

const ChromaticScreen = ({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element => (
  <MediaQuery maxWidth={1440}>{children}</MediaQuery>
);

const DefaultScreen = ({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element => (
  <MediaQuery minWidth={1440}>{children}</MediaQuery>
);

const Layout = ({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element => (
  <div style={{ height: '852px' }}>{children}</div>
);

const Default = ({ onBackClick, onCloseClick }: Props): JSX.Element => (
  <Layout>
    <Root defaultOpen open>
      <Content>
        <Header
          text="Label"
          onBackClick={onBackClick}
          onCloseClick={onCloseClick}
        />
        <Body>
          <Headline
            title="Section title"
            description="Lorem ipsum dolor sit amet quare id faciam."
          />
        </Body>
        <Footer>
          <Buttons.CallToAction label="Label" />
          <Buttons.Secondary label="Label" />
        </Footer>
      </Content>
    </Root>
  </Layout>
);

const Plain = ({ onCloseClick }: Props): JSX.Element => (
  <Layout>
    <Root defaultOpen open>
      <Content>
        <Header text="Label" onCloseClick={onCloseClick} />
        <Body>{''}</Body>
      </Content>
    </Root>
  </Layout>
);

const TitlteAndTopNavigation = ({
  onBackClick,
  onCloseClick,
}: Props): JSX.Element => (
  <Layout>
    <Root defaultOpen open>
      <Content>
        <Header
          text="Label"
          onBackClick={onBackClick}
          onCloseClick={onCloseClick}
        />
        <div style={{ height: '536px', overflow: 'hidden' }}>
          <Body>
            <Headline title="Section title" />
          </Body>
        </div>
      </Content>
    </Root>
  </Layout>
);

const ForceScrollbar = (): JSX.Element => (
  <>
    {Array.from({ length: 8 }).map((_, index) => (
      <Box my="$112" h="$112" key={`scroll:${index}`} />
    ))}
  </>
);

const CTAButtonAndSelection = ({
  onBackClick,
  onCloseClick,
}: Props): JSX.Element => (
  <Layout>
    <Root defaultOpen open>
      <Content>
        <Header
          text="Label"
          onBackClick={onBackClick}
          onCloseClick={onCloseClick}
        />
        <Body>
          <Grid columns="$fitContent">
            <Cell>
              <Headline
                title="Section title"
                description="Lorem ipsum dolor sit amet quare id faciam."
              />
            </Cell>
            <Cell>
              <Flex justifyContent="flex-end">
                <div
                  className={sx({
                    borderRadius: '$circle',
                    background: '$lace_gradient',
                    height: '$40',
                    width: '$40',
                  })}
                  style={{ padding: '1.5px' }}
                >
                  <div
                    className={sx({
                      width: '$fill',
                      height: '$fill',
                      borderRadius: '$circle',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    })}
                    style={{ background: 'white' }}
                  >
                    <Typography.Body.Normal weight="$bold">
                      3
                    </Typography.Body.Normal>
                  </div>
                </div>
                <Box ml="$8">
                  <Buttons.Secondary label="Clear all" />
                </Box>
              </Flex>
            </Cell>
          </Grid>
          <ForceScrollbar />
        </Body>
        <Footer>
          <Buttons.CallToAction label="Label" />
          <Buttons.Secondary label="Label" />
        </Footer>
      </Content>
    </Root>
  </Layout>
);

const TwoCTAButtonAndToggleSwitch = ({
  onBackClick,
  onCloseClick,
}: Props): JSX.Element => (
  <Layout>
    <Root defaultOpen open>
      <Content>
        <Header
          text="Label"
          onBackClick={onBackClick}
          onCloseClick={onCloseClick}
        />
        <Body>
          <Grid columns="$fitContent">
            <Cell>
              <Flex alignItems="center">
                <ProfilePicutre.Image imageSrc={cardanoImage} />
                <Box ml="$12">
                  <Typography.SubHeading weight="$bold">
                    Section title
                  </Typography.SubHeading>
                </Box>
              </Flex>
            </Cell>
            <Cell>
              <Flex justifyContent="flex-end" alignItems="center" h="$fill">
                <ToggleSwitch label="Label" />
              </Flex>
            </Cell>
          </Grid>
          <ForceScrollbar />
        </Body>
        <Footer>
          <Buttons.CallToAction label="Label" />
          <Buttons.Secondary label="Label" />
        </Footer>
      </Content>
    </Root>
  </Layout>
);

export const Overview = ({ onBackClick, onCloseClick }: Props): JSX.Element => (
  <div id="storybook">
    <Grid columns="$1">
      <Cell>
        <Section title="Break me if needed">
          <Typography.Body.Large>
            When using this component you can break the instance, then edit the
            content to suit your needs. The below examples are not comprehensive
            but illustrative.
          </Typography.Body.Large>
        </Section>

        <Divider my="$64" />

        <Section title="Copy for use">
          <Variants.Table>
            <Variants.Row>
              <Variants.Cell>
                <Flex justifyContent="center">
                  <Default
                    onBackClick={onBackClick}
                    onCloseClick={onCloseClick}
                  />
                </Flex>
              </Variants.Cell>
            </Variants.Row>
          </Variants.Table>
        </Section>

        <Divider my="$64" />

        <Section title="Variants">
          <DefaultScreen>
            <Variants.Table headers={['Plain', 'Title and top navigation']}>
              <Variants.Row>
                <Variants.Cell>
                  <Plain onCloseClick={onCloseClick} />
                </Variants.Cell>
                <Variants.Cell>
                  <TitlteAndTopNavigation
                    onCloseClick={onCloseClick}
                    onBackClick={onBackClick}
                  />
                </Variants.Cell>
              </Variants.Row>
            </Variants.Table>
            <Variants.Table headers={['Plain', 'Title and top navigation']}>
              <Variants.Row>
                <Variants.Cell>
                  <Plain onCloseClick={onCloseClick} />
                </Variants.Cell>
                <Variants.Cell>
                  <TitlteAndTopNavigation
                    onCloseClick={onCloseClick}
                    onBackClick={onBackClick}
                  />
                </Variants.Cell>
              </Variants.Row>
            </Variants.Table>
            <Variants.Table
              headers={[
                '1 bottom CTA, Selection',
                '2 bottom CTAs, Toggle switch',
              ]}
            >
              <Variants.Row>
                <Variants.Cell>
                  <CTAButtonAndSelection
                    onCloseClick={onCloseClick}
                    onBackClick={onBackClick}
                  />
                </Variants.Cell>
                <Variants.Cell>
                  <TwoCTAButtonAndToggleSwitch
                    onCloseClick={onCloseClick}
                    onBackClick={onBackClick}
                  />
                </Variants.Cell>
              </Variants.Row>
            </Variants.Table>
          </DefaultScreen>
          <ChromaticScreen>
            <Variants.Table headers={['Plain']}>
              <Variants.Row>
                <Variants.Cell>
                  <Plain onCloseClick={onCloseClick} />
                </Variants.Cell>
              </Variants.Row>
            </Variants.Table>
            <Variants.Table headers={['Title and top navigation']}>
              <Variants.Row>
                <Variants.Cell>
                  <TitlteAndTopNavigation
                    onCloseClick={onCloseClick}
                    onBackClick={onBackClick}
                  />
                </Variants.Cell>
              </Variants.Row>
            </Variants.Table>
            <Variants.Table headers={['1 bottom CTA, Selection']}>
              <Variants.Row>
                <Variants.Cell>
                  <CTAButtonAndSelection
                    onCloseClick={onCloseClick}
                    onBackClick={onBackClick}
                  />
                </Variants.Cell>
              </Variants.Row>
            </Variants.Table>
            <Variants.Table headers={['2 bottom CTAs, Toggle switch']}>
              <Variants.Row>
                <Variants.Cell>
                  <TwoCTAButtonAndToggleSwitch
                    onCloseClick={onCloseClick}
                    onBackClick={onBackClick}
                  />
                </Variants.Cell>
              </Variants.Row>
            </Variants.Table>
          </ChromaticScreen>
        </Section>

        <Divider my="$64" />

        <Section title="Main components">
          <Variants.Table>
            <Variants.Row>
              <Variants.Cell>
                <Flex justifyContent="center">
                  <Default
                    onBackClick={onBackClick}
                    onCloseClick={onCloseClick}
                  />
                </Flex>
              </Variants.Cell>
            </Variants.Row>
          </Variants.Table>

          <ThemeProvider colorScheme={ThemeColorScheme.Dark}>
            <Variants.Table>
              <Variants.Row>
                <Variants.Cell>
                  <Flex justifyContent="center">
                    <Default
                      onBackClick={onBackClick}
                      onCloseClick={onCloseClick}
                    />
                  </Flex>
                </Variants.Cell>
              </Variants.Row>
            </Variants.Table>
          </ThemeProvider>
        </Section>
      </Cell>
    </Grid>
  </div>
);

type Interactions = ComponentStory<ElementType<Props>>;
export const Interactions: Interactions = ({
  onCloseClick,
  onBackClick,
}: Props): JSX.Element => {
  return (
    <Grid columns="$1">
      <Cell>
        <Section title="Play">
          <Root>
            <Trigger>
              <Buttons.Primary label="Open side drawer" />
            </Trigger>
            <Overlay />
            <Content data-testid="side-drawer-content">
              <Header
                text="Label"
                onBackClick={onBackClick}
                onCloseClick={onCloseClick}
              />
              <Body>
                <Headline
                  title="Section title"
                  description="Lorem ipsum dolor sit amet quare id faciam."
                />
              </Body>
              <Footer>
                <Buttons.CallToAction label="Label" />
                <Close>
                  <Buttons.Secondary label="Close" />
                </Close>
              </Footer>
            </Content>
          </Root>
        </Section>
      </Cell>
    </Grid>
  );
};

Interactions.play = async ({ canvasElement }): Promise<void> => {
  const canvas = within(canvasElement);

  expect(canvas.queryByTestId(`side-drawer-content`)).not.toBeInTheDocument();

  await sleep();

  userEvent.click(canvas.getByText('Open side drawer'));

  await sleep();

  expect(canvas.getByTestId(`side-drawer-content`)).toBeInTheDocument();

  await sleep();

  userEvent.click(canvas.getByText('Close'));

  await sleep();

  await waitFor(() => {
    expect(canvas.queryByTestId(`side-drawer-content`)).not.toBeInTheDocument();
  });
};
