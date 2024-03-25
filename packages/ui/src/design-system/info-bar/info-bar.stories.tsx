import React from 'react';

import { ReactComponent as InfoIcon } from '@lace/icons/dist/InfoComponent';

import { LocalThemeProvider, ThemeColorScheme } from '../../design-tokens';
import { page, Section, Variants } from '../decorators';
import { Divider } from '../divider';
import { Flex } from '../flex';
import { Cell, Grid } from '../grid';

import { InfoBar } from './info-bar.component';

const subtitle =
  'The info bar control is for displaying app-wide status messages to users that are highly visible yet non-intrusive. There are built-in severity levels to easily indicate the type of message shown as well as the option to include your own call to action or hyperlink button.';

export default {
  title: 'Status & info/Info Bar',
  component: InfoBar,
  decorators: [page({ title: 'Info bar', subtitle })],
};

const UsageSample = ({
  withCTA = false,
}: Readonly<{ withCTA?: boolean }>): JSX.Element => (
  <InfoBar
    icon={<InfoIcon />}
    message={`Lorem ipsum dolor sit amet, consectetuer adipiscing elit\nmaecenas porttitor congue massa. Fusce posuere, magna.`}
    callToAction={
      withCTA
        ? {
            label: 'Label',
          }
        : undefined
    }
  />
);

const VariantsTable = (): JSX.Element => (
  <Section title="Variants">
    <Variants.Table headers={['With CTA', 'Without CTA']}>
      <Variants.Row>
        <Variants.Cell>
          <UsageSample withCTA />
        </Variants.Cell>
        <Variants.Cell>
          <UsageSample />
        </Variants.Cell>
      </Variants.Row>
    </Variants.Table>
  </Section>
);

const MainComponents = (): JSX.Element => (
  <>
    <Variants.Row>
      <Variants.Cell>
        <UsageSample withCTA />
      </Variants.Cell>
    </Variants.Row>
    <Variants.Row>
      <Variants.Cell>
        <UsageSample />
      </Variants.Cell>
    </Variants.Row>
  </>
);

export const Overview = (): JSX.Element => (
  <Grid columns="$1">
    <Cell>
      <Section title="Copy for use">
        <Flex flexDirection="column" alignItems="center" w="$fill">
          <UsageSample withCTA />
        </Flex>
      </Section>

      <Divider my="$64" />

      <VariantsTable />

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
