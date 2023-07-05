import type { ElementType } from 'react';
import React from 'react';

import type { ComponentStory, Meta } from '@storybook/react';

import cardanoImage from '../../assets/images/cardano-blue-bg.png';
import { ThemeColorScheme, LocalThemeProvider } from '../../design-tokens';
import { page, Section, Variants } from '../decorators';
import { Divider } from '../divider';
import { Flex } from '../flex';
import { Grid } from '../grid';
import { Cell } from '../grid/cell.component';

import { Details } from './flow-card-details.component';
import { Profile } from './flow-card-profile.component';
import { Card } from './flow-card.component';

const subtitle = ``;

export default {
  title: 'Cards/Flow Card',
  component: Card,
  subcomponents: {
    Profile,
    Details,
  },
  decorators: [page({ title: 'Flow card', subtitle })],
} as Meta;

const PopUpView = ({
  children,
}: Readonly<{ children: JSX.Element }>): JSX.Element => {
  return <div style={{ width: '342px' }}>{children}</div>;
};

const MainComponents = (): JSX.Element => (
  <>
    <Variants.Row>
      <Variants.Cell>
        <Card>
          <Profile
            imageSrc={cardanoImage}
            name="Title"
            description="Subtitle"
          />
          <Details title="amount" subtitle="Value" />
        </Card>
      </Variants.Cell>
    </Variants.Row>
    <Variants.Row>
      <Variants.Cell>
        <PopUpView>
          <Card>
            <Profile
              imageSrc={cardanoImage}
              name="Title"
              description="Subtitle"
            />
            <Details title="amount" subtitle="Value" />
          </Card>
        </PopUpView>
      </Variants.Cell>
    </Variants.Row>
  </>
);

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Copy for use">
        <Flex alignItems="center" flexDirection="column">
          <Card>
            <Profile
              imageSrc={cardanoImage}
              name="Title"
              description="Subtitle"
            />
            <Details title="amount" subtitle="Value" />
          </Card>
        </Flex>
      </Section>

      <Divider my="$64" />

      <Section title="Examples">
        <Variants.Table headers={['', '']}>
          <Variants.Row>
            <Variants.Cell>
              <Card>
                <Profile
                  imageSrc={cardanoImage}
                  name="Cardano"
                  description="ADA"
                />
                <Details title="12,345.67" subtitle="9,567.98 USD" />
              </Card>
            </Variants.Cell>
            <Variants.Cell>
              <Card>
                <Profile imageSrc={cardanoImage} name="Voting power" />
                <Details title="12,345" />
              </Card>
            </Variants.Cell>
          </Variants.Row>
        </Variants.Table>
        <Variants.Table headers={['', '']}>
          <Variants.Row>
            <Variants.Cell>
              <Card>
                <Profile
                  imageSrc={cardanoImage}
                  name="Steak.and.ADA"
                  description="ST3AK"
                />
                <Details subtitle="pool17ahy4vp...e6kd7feg0" />
              </Card>
            </Variants.Cell>
            <Variants.Cell>
              <Card>
                <Profile
                  imageSrc={cardanoImage}
                  name="Adam Sampler"
                  description="DeFi Strategist"
                />
                <Details title="25%" />
              </Card>
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

Overview.parameters = {
  pseudo: {
    hover: '#hover',
    focus: '#focused',
  },
};

interface ControlsProps {
  title: string;
  subtitle: string;
  text1: string;
  text2: string;
}

type Controls = ComponentStory<ElementType<ControlsProps>>;

export const Controls = ({
  title,
  subtitle,
  text1,
  text2,
}: Readonly<ControlsProps>): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Copy for use">
        <Flex alignItems="center" flexDirection="column">
          <Card>
            <Profile
              imageSrc={cardanoImage}
              name={title}
              description={subtitle}
            />

            <Details title={text1} subtitle={text2} />
          </Card>
        </Flex>
      </Section>
    </Cell>
  </Grid>
);

Controls.args = {
  title: 'Token name',
  subtitle: 'Subtitle',
  text1: 'amount',
  text2: 'Value',
};
